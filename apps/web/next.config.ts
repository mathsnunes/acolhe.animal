import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source (no build step) — Next compiles them.
  transpilePackages: [
    '@acolhe-animal/shared',
    '@acolhe-animal/db',
    '@acolhe-animal/domain',
    '@acolhe-animal/integrations',
    '@acolhe-animal/messaging',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
      // Accept Server Actions when the app is reached through a dev tunnel (the
      // public host differs from localhost), so uploads work over `pnpm tunnel`
      // with no per-run config. Quick tunnels are `*.trycloudflare.com`.
      allowedOrigins: ['localhost:3000', '*.trycloudflare.com'],
    },
  },
  // Allow dev-asset/HMR requests from the same tunnel hosts.
  allowedDevOrigins: ['*.trycloudflare.com'],
  // Keep native/binary-backed media deps out of the server bundle: webpack can't
  // resolve fluent-ffmpeg's dynamic requires nor the static binary paths, which
  // breaks transcoding/poster extraction. Externalizing loads them from
  // node_modules at runtime. (sharp is externalized by Next automatically.)
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static', 'ffprobe-static'],
  /**
   * Force-externalize `@resvg/resvg-js` on the server build. It's a native
   * `.node` addon webpack can't parse. `serverExternalPackages` doesn't cover it
   * because it's imported from a `transpilePackages` workspace package
   * (`@acolhe-animal/integrations`), so Next bundles the chain and webpack
   * follows it (including `createRequire` calls). An explicit `commonjs` external
   * makes the server `require()` it from node_modules at runtime.
   */
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean);
      config.externals = [...externals, { '@resvg/resvg-js': 'commonjs @resvg/resvg-js' }];
    }
    return config;
  },
  images: {
    // Mock storage serves uploaded images from a local route in dev.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  /**
   * Public URLs are pt-BR; the route folders stay English. These `beforeFiles`
   * rewrites map a pt-BR URL (`source`) → the English route file (`destination`).
   * `beforeFiles` is required because the root `app/[slug]` portal segment would
   * otherwise capture single-segment pt-BR URLs (e.g. `/animais`) before a normal
   * rewrite runs. Most-specific paths first. Query strings are preserved.
   */
  redirects: async () => [
    { source: '/membros', destination: '/config/membros', permanent: true },
  ],
  rewrites: async () => ({
      beforeFiles: [
        // Animais (nested create / edit / detail)
        { source: '/animais/novo', destination: '/animals/new' },
        { source: '/animais/:id/editar', destination: '/animals/:id/edit' },
        { source: '/animais/:id', destination: '/animals/:id' },
        { source: '/animais', destination: '/animals' },
        // Candidatos ("nova" before ":id" so it isn't captured as an id)
        { source: '/candidatos/nova', destination: '/candidates/new' },
        { source: '/candidatos/:id', destination: '/candidates/:id' },
        { source: '/candidatos', destination: '/candidates' },
        // Adoções
        { source: '/adocoes/:id', destination: '/adoptions/:id' },
        { source: '/adocoes', destination: '/adoptions' },
        // Single-segment admin sections
        { source: '/doacoes', destination: '/donations' },
        { source: '/caixa', destination: '/cashflow' },
        { source: '/campanhas', destination: '/campaigns' },
        { source: '/historias', destination: '/stories' },
        { source: '/necessidades-recorrentes', destination: '/recurring-needs' },
        { source: '/apoiadores', destination: '/supporters' },
        { source: '/config/membros', destination: '/settings/members' },
        { source: '/config/financeiro/:path*', destination: '/settings/finance/:path*' },
        { source: '/config/financeiro', destination: '/settings/finance' },
        { source: '/config', destination: '/settings' },
        { source: '/inicio', destination: '/home' },
        // Auth surface
        { source: '/entrar', destination: '/login' },
        { source: '/criar-conta', destination: '/signup' },
        { source: '/recuperar-senha', destination: '/recover' },
        { source: '/convite/:token', destination: '/invite/:token' },
        // Public portal sub-routes (the slug itself stays as-is)
        { source: '/:slug/adotar/:animalId/enviada', destination: '/:slug/adopt/:animalId/submitted' },
        { source: '/:slug/adotar/:animalId', destination: '/:slug/adopt/:animalId' },
        { source: '/:slug/animais/:animalId', destination: '/:slug/animals/:animalId' },
      ],
    }),
};

export default withNextIntl(nextConfig);
