// TODO: remove — one-shot sandbox script, not production code
/**
 * One-shot: create a Pix key on the Angeli Felice Asaas subaccount.
 * Run from packages/db:
 *   ./node_modules/.bin/tsx --env-file ../../apps/web/.env test-pix-key.ts
 */
import { createDecipheriv } from 'node:crypto';
import { Pool } from 'pg';

const decryptKey = (ciphertext: string): string => {
  const hex = process.env.FINANCE_ENCRYPTION_KEY;
  if (!hex) throw new Error('FINANCE_ENCRYPTION_KEY is not set');
  const key = Buffer.from(hex, 'hex');
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex!, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex!, 'hex'));
  return decipher.update(encHex!, 'hex', 'utf8') + decipher.final('utf8');
};

const BASE = process.env.ASAAS_BASE_URL;
if (!BASE) throw new Error('ASAAS_BASE_URL is not set');

const asaas = async (apiKey: string, method: string, path: string, body?: unknown) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { access_token: apiKey, 'Content-Type': 'application/json', 'User-Agent': 'acolhe-animal/script' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
};

const ORG_ID = 'org_angelifelice00000';

const run = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query<{ asaas_api_key_encrypted: string; asaas_account_id: string }>(
    `SELECT asaas_api_key_encrypted, asaas_account_id FROM organization WHERE id = $1`,
    [ORG_ID],
  );
  await pool.end();

  const row = rows[0];
  if (!row?.asaas_api_key_encrypted) throw new Error('No encrypted API key in DB');

  const apiKey = decryptKey(row.asaas_api_key_encrypted);
  console.log('✓ Decrypted API key for account', row.asaas_account_id);

  // 1. List existing Pix keys
  const existing = await asaas(apiKey, 'GET', '/pix/addressKeys');
  console.log('Existing Pix keys:', JSON.stringify(existing, null, 2));

  const active = (existing.data ?? []).find((k: { status: string }) => k.status === 'ACTIVE');
  if (active) {
    console.log('✓ Active Pix key already exists:', active.key);
    return;
  }

  // 2. Create EVP (random) Pix key
  console.log('Creating EVP Pix key...');
  const created = await asaas(apiKey, 'POST', '/pix/addressKeys', { type: 'EVP' });
  console.log('Result:', JSON.stringify(created, null, 2));
};

run().catch((e) => { console.error('✗', e.message); process.exit(1); });
