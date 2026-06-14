// Dev helper: open a public Cloudflare quick-tunnel to the local app.
//
//   pnpm tunnel        → tunnels http://localhost:3000 (run `pnpm dev` first)
//   pnpm tunnel 3001   → tunnels another port
//
// No Cloudflare account needed; it prints a temporary *.trycloudflare.com URL.
// Finds an existing `cloudflared` (PATH, %LOCALAPPDATA%, or ~/.cloudflared) and
// downloads the binary once if none is present.
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const port = process.argv[2] ?? process.env.PORT ?? '3000';
const isWin = process.platform === 'win32';
const exe = isWin ? 'cloudflared.exe' : 'cloudflared';

const cached = [
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, exe),
  join(homedir(), '.cloudflared', exe),
]
  .filter(Boolean)
  .find((p) => existsSync(p));

const download = async () => {
  const asset = {
    'win32-x64': 'cloudflared-windows-amd64.exe',
    'win32-arm64': 'cloudflared-windows-arm64.exe',
    'linux-x64': 'cloudflared-linux-amd64',
    'linux-arm64': 'cloudflared-linux-arm64',
  }[`${process.platform}-${process.arch}`];

  if (!asset) {
    console.error('cloudflared não encontrado. Instale-o (ex.: macOS `brew install cloudflared`) e rode de novo.');
    process.exit(1);
  }

  const dir = join(homedir(), '.cloudflared');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, exe);
  console.log('Baixando cloudflared (uma vez só)…');
  const res = await fetch(`https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`);
  if (!res.ok) {
    console.error(`Falha ao baixar cloudflared (HTTP ${res.status}).`);
    process.exit(1);
  }
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  if (!isWin) chmodSync(dest, 0o755);
  return dest;
};

const run = (bin) => {
  console.log(`\n🌐 Abrindo túnel público → http://localhost:${port}`);
  console.log('   (a app precisa estar rodando: pnpm dev · Ctrl+C encerra o túnel)\n');
  const child = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'], {
    stdio: 'inherit',
  });
  child.on('error', (err) => {
    // Not found on PATH → download the binary, then retry once.
    if (err.code === 'ENOENT' && bin === exe) {
      download().then(run).catch((e) => {
        console.error(e);
        process.exit(1);
      });
    } else {
      console.error(err);
      process.exit(1);
    }
  });
};

run(cached ?? exe);
