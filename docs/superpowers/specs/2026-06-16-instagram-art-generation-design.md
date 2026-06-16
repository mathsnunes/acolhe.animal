# Instagram art + caption generation

**Status:** approved · **Date:** 2026-06-16 · **Branch:** feat/auth-onboarding-and-members

## Goal

Let an org generate a ready-to-post Instagram **feed** (1080×1080) and **story**
(1080×1920) image plus a suggested caption for any animal, straight from the
animal detail page. The product never publishes — the user copies the image,
copies the caption, or downloads the PNG, and posts from their own account.

The `animal_instagram_art` table already exists (migration `0000`): one row per
`(animal, type)`, regenerate = upsert. No DB migration is needed.

## Decisions (from brainstorming)

- **Generation engine:** deterministic templates. No AI, no API key, works
  offline in `mock` mode, fast enough to run synchronously.
- **Photo:** the user picks which gallery photo goes on the art; the cover
  (primary) photo is pre-selected.
- **Brand:** the art carries the **org's** brand — its uploaded logo, falling
  back to the org name in Fraunces when there is no logo. Acolhe palette is the
  visual base.
- **Template direction:** "Foto dominante" — the photo fills the frame, brand
  text sits over a bottom scrim.
- **Caption:** pure function of the animal's structured data. Persisted in the
  `caption` column on generate. The modal textarea is editable locally for
  copy convenience only; edits are not persisted; regenerate overwrites.

## Render pipeline

`satori` (JSX → SVG, with embedded font buffers) → `@resvg/resvg-js` (SVG →
PNG). Deterministic, pure Node, no headless browser.

- Fonts vendored as buffers (no `next/font` reuse at runtime): **Fraunces**
  (headline) + **Inter Tight** (eyebrow/facts), one weight each. Name emphasis
  uses the terra accent color instead of italic to keep the font set to two
  files.
- The chosen photo is fetched from storage, resized to a `cover` square/portrait
  with `sharp`, and passed to satori as a base64 `backgroundImage`. The org logo
  (if any) is fetched and embedded the same way.

## Architecture (layers)

```
shared            createId('animalInstagramArt'), InstagramArtType, zod input
  ← integrations  media/instagram-art.ts: render({type,photo,logo?,texts}) → PNG Buffer
  ← messaging     instagram/: pure caption builders (feed + story), versioned
  ← domain        instagram/service.ts: generateInstagramArt / listInstagramArt
      ← apps/web   server actions + modal UI + i18n
```

### `packages/integrations/src/media/instagram-art.ts`

Pure media util (like `processLogo`), no external provider.

```
renderInstagramArt(input: {
  type: 'feed-square' | 'story-vertical';
  photo: Buffer;            // source photo bytes
  logo?: Buffer | null;     // org logo bytes (png/jpg)
  orgName: string;          // logo fallback
  eyebrow: string;          // e.g. "Espera por um lar"
  headline: string;         // e.g. "Conhece a Frida?"
  facts: string;            // e.g. "~4 anos · porte médio · vacinada"
}): Promise<{ body: Buffer; contentType: 'image/png'; width; height }>
```

Holds the two satori layouts (feed 1080², story 1080×1920) for the
"foto dominante" direction and the vendored font buffers (loaded once).

### `packages/messaging/src/instagram/`

Pure, versioned caption builders (same spirit as the WhatsApp/email templates):

- `instagramFeedCaption(animal, org)` → rich caption: name, age, size/weight,
  neutered + vaccinated flags, temperament hints, a trimmed `shortStory`, CTA.
- `instagramStoryCaption(animal, org)` → short caption + hashtags derived from
  the org name + city (e.g. `#adote #angelifelice #criciuma`).

Authored in pt-BR (end-user-facing content, like the other templates).

### `packages/domain/src/instagram/service.ts`

- `generateInstagramArt(ctx, { animalId, type, photoId })`:
  1. Load animal tenant-scoped (`organizationId === ctx.organizationId`); 404 otherwise.
  2. Load org + the chosen photo; validate the photo belongs to the animal.
  3. Fetch photo bytes (and logo bytes if `org.logoUrl`) via `getStorage()`.
  4. Build caption (messaging) + render PNG (integrations).
  5. `storage.put` at stable key `instagram-art/{animalId}/{type}.png`;
     `imageUrl = getPublicUrl(key) + '?v=' + id`.
  6. Upsert `animal_instagram_art` on `(animalId, type)` with imageUrl, caption,
     generatedAt. Returns `{ id, type, imageUrl, caption, generatedAt }`.
- `listInstagramArt(ctx, animalId)` → existing arts for the modal's initial state.

Zod validates input in `shared`. Multi-tenancy enforced by the animal scope; the
storage key is namespaced by the org-scoped animal id.

### `apps/web`

- **Button** "Gerar arte" on the animal detail page, next to "Editar ficha".
- **Modal** "Gerar arte para Instagram" (`ui/dialog` + `ui/tabs`): Feed / Story
  tabs, gallery photo picker (cover pre-selected), preview, and actions:
  - **Copiar imagem** → `navigator.clipboard.write([ClipboardItem 'image/png'])`,
    fallback to download when unsupported.
  - **Copiar legenda** → clipboard text.
  - **Baixar PNG** → anchor download.
  - **Gerar de novo** → regenerate (overwrites the stored art).
- Server actions wrap the domain via `action()`; `revalidatePath` the animal page.
- New i18n namespace `messages/pt/instagram.json`.

Generation is **synchronous** (sub-2s composition); the modal shows a brief
spinner. No async/processing pipeline.

## Out of scope (YAGNI)

- Publishing directly to Instagram (the product never posts).
- AI-written captions, multiple template variants, scheduling.

## Risks

- **Clipboard image write:** `ClipboardItem` image support varies by browser;
  the download fallback covers the gap.

## Bundling notes (resolved during implementation)

The renderer lives in a `transpilePackages` workspace package, so Next bundles
its whole import chain — which breaks two ways that `serverExternalPackages`
does NOT fix (it doesn't cover deps imported from transpiled packages):

- **Fonts** — `createRequire`/`fs` font resolution fails at runtime because the
  bundler rewrites `createRequire(import.meta.url)` into an empty webpack context.
  Fixed by **inlining** the two `.woff` weights as base64 in
  `packages/integrations/src/media/fonts.ts` (no fs, no resolve, bundler-proof).
- **`@resvg/resvg-js`** (native `.node`) — webpack can't parse the binary. Fixed
  by an explicit `webpack` `commonjs` external in `next.config.ts`, which also
  requires `@resvg/resvg-js` to be a **direct dependency of `apps/web`** so the
  runtime `require()` resolves (same pattern as `ffmpeg-static`). `satori` bundles
  fine (yoga WASM inlined) and stays bundled.

Verified end to end through the Next server runtime: generation returns a valid
1080² / 1080×1920 PNG + caption.
