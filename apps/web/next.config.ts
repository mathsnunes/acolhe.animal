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
    // Keep heavy server-only deps out of the bundle.
    serverActions: { bodySizeLimit: '8mb' },
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
  rewrites: async () => ({
      beforeFiles: [
        // Animais (nested create / edit / detail)
        { source: '/animais/novo', destination: '/animals/new' },
        { source: '/animais/:id/editar', destination: '/animals/:id/edit' },
        { source: '/animais/:id', destination: '/animals/:id' },
        { source: '/animais', destination: '/animals' },
        // Candidatos
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
        { source: '/itens-em-falta', destination: '/needed-items' },
        { source: '/apoiadores', destination: '/supporters' },
        { source: '/config', destination: '/settings' },
        { source: '/inicio', destination: '/home' },
        { source: '/entrar', destination: '/login' },
        // Public portal sub-routes (the slug itself stays as-is)
        { source: '/:slug/adotar/:animalId/enviada', destination: '/:slug/adopt/:animalId/submitted' },
        { source: '/:slug/adotar/:animalId', destination: '/:slug/adopt/:animalId' },
        { source: '/:slug/animais/:animalId', destination: '/:slug/animals/:animalId' },
      ],
    }),
};

export default withNextIntl(nextConfig);
