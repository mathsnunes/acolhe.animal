// TODO: remove — one-shot sandbox script, not production code
/**
 * One-shot script: create a Pix key on the Angeli Felice Asaas subaccount
 * and cache the result back in the DB.
 *
 * Run from the worktree root:
 *   pnpm tsx --env-file apps/web/.env scripts/test-pix-key.ts
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import postgres from 'postgres';

// ── inline decrypt (mirrors packages/domain/src/finance/encryption.ts) ──────
const decryptKey = (ciphertext: string): string => {
  const hex = process.env.FINANCE_ENCRYPTION_KEY;
  if (!hex) throw new Error('FINANCE_ENCRYPTION_KEY is not set');
  const key = Buffer.from(hex, 'hex');
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex!, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex!, 'hex'));
  return decipher.update(encHex!, 'hex', 'utf8') + decipher.final('utf8');
};

// ── Asaas helpers ────────────────────────────────────────────────────────────
const BASE = process.env.ASAAS_BASE_URL;
if (!BASE) throw new Error('ASAAS_BASE_URL is not set');

const asaasGet = async (apiKey: string, path: string) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { access_token: apiKey, 'User-Agent': 'acolhe-animal/script' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
};

const asaasPost = async (apiKey: string, path: string, body: unknown) => {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'acolhe-animal/script',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
};

// ── main ─────────────────────────────────────────────────────────────────────
const ORG_ID = 'org_angelifelice00000';

const run = async () => {
  const sql = postgres(process.env.DATABASE_URL!);

  const [row] = await sql<
    { asaas_api_key_encrypted: string; asaas_account_id: string }[]
  >`SELECT asaas_api_key_encrypted, asaas_account_id FROM organization WHERE id = ${ORG_ID}`;

  if (!row?.asaas_api_key_encrypted) throw new Error('No encrypted API key in DB');

  const apiKey = decryptKey(row.asaas_api_key_encrypted);
  console.log('✓ Decrypted API key for account', row.asaas_account_id);

  // 1. List existing Pix keys
  const existing = await asaasGet(apiKey, '/myAccount/pixTransactionKeys');
  console.log('Existing Pix keys:', JSON.stringify(existing, null, 2));

  const active = existing.data?.find((k: { status: string }) => k.status === 'ACTIVE');
  if (active) {
    console.log('✓ Active Pix key already exists:', active.key);
    await sql`UPDATE organization SET asaas_pix_key_cached = ${active.key} WHERE id = ${ORG_ID}`;
    console.log('✓ Cached in DB');
    await sql.end();
    return;
  }

  // 2. Create a new CNPJ Pix key
  console.log('Creating new Pix key (type EVP)...');
  const created = await asaasPost(apiKey, '/myAccount/pixTransactionKeys', { type: 'EVP' });
  console.log('Created:', JSON.stringify(created, null, 2));

  if (created.key) {
    await sql`UPDATE organization SET asaas_pix_key_cached = ${created.key} WHERE id = ${ORG_ID}`;
    console.log('✓ Pix key cached in DB:', created.key);
  }

  await sql.end();
};

run().catch((e) => { console.error(e); process.exit(1); });
