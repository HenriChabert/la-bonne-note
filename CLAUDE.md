---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## Project: La Bonne Note

Chrome extension (WXT + TypeScript) that overlays external ratings on food delivery, streaming, and hotel booking platforms.

### Key conventions

- Sites go in `lib/sites/<name>.ts` implementing `SiteAdapter` (from `lib/types.ts`)
- Providers go in `lib/providers/<name>.ts` implementing `RatingProvider` (from `lib/types.ts`)
- Both are registered in `lib/registry.ts`
- New site URL patterns must be added to `entrypoints/content.ts` `matches` array
- New provider API domains must be added to `wxt.config.ts` `host_permissions`
- Provider icons: inline SVG string or file import from `assets/icons/` (SVG with `?raw`, ICO/PNG without)
- After adding a site or provider, update `README.md` and `wxt.config.ts` description

### Skills

- `.claude/skills/add-site/SKILL.md` — step-by-step guide for adding a new site adapter
- `.claude/skills/add-provider/SKILL.md` — step-by-step guide for adding a new rating provider
- `.claude/skills/maintain/SKILL.md` — documentation checklist to keep all docs in sync after changes

### Development

```bash
make dev       # Start dev mode (no browser auto-open)
make build     # Production build
make package   # Create distributable zip
make clean     # Remove build artifacts
```
