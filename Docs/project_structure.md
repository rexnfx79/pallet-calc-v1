# Project Structure – Pallet Calculator Application

## Root Directory
```
pallet-calc-v1/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui generated primitives
│   │   ├── PalletVisualization.tsx
│   │   ├── ContainerVisualization.tsx
│   │   └── NumericInputWithSlider.tsx
│   ├── lib/                  # pure functions & algorithms
│   │   ├── optimization.ts
│   │   ├── containerOptimization.ts
│   │   ├── autoPatternOptimization.ts
│   │   ├── advancedOptimization.ts
│   │   ├── unitConversions.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── index.tsx             # React entry
│   └── index.css             # Tailwind base styles
├── public/                   # static assets served verbatim
├── Docs/                     # project documentation (this folder)
│   ├── Implementation.md
│   ├── project_structure.md
│   └── UI_UX_doc.md
├── tests/                    # (reserved) unit & integration tests – created as needed
├── config/                   # build & tooling configuration
│   ├── craco.config.js
│   └── tailwind.config.js
├── deployment/               # IaC / CI scripts (Netlify, GitHub Actions, Wrangler)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Detailed Structure

### `src/`
Holds all application code.

- **components/** – React components. `ui/` contains generated shadcn primitives that share the design system tokens. Feature-specific components (visualisers, inputs) sit next to the UI library.
- **lib/** – deterministic, testable business-logic functions with no React dependencies (algorithms, utilities, constants).
- **index.tsx** – bootstraps React application and mounts to DOM.
- **index.css** – imports Tailwind’s base styles, custom layer utilities and design tokens.

### `public/`
Static files copied verbatim to the final build (HTML template, favicon, robots.txt, etc.).

### `Docs/`
Living documentation for developers and designers. The three canonical docs (Implementation, Structure, UI/UX) are cross-referenced and kept in sync with code changes.

### `tests/`
Unit tests for algorithms in `lib/` and integration / component tests for React components using Testing Library + Jest. Naming convention: `<component>.test.tsx` or `<libFile>.test.ts`.

### `config/`
Centralised configuration for build tooling:
- **tailwind.config.js** – design tokens and theme extension.
- **craco.config.js** – bundler overrides.

### `deployment/`
Scripts and manifests for platform deployment (Netlify `netlify.toml`, Cloudflare `wrangler.toml`, GitHub Action workflows).

## Configuration & Environment Files
- **`.env.*`** – environment-specific variables (never committed).
- **`wrangler.toml`** – Cloudflare Worker configuration.
- **`netlify.toml`** – Netlify build settings.
- **CI workflows** – store under `.github/workflows/` if using GitHub Actions.

## Asset Organisation
- Images, icons and GLTF models used by Three.js should reside under `public/assets/` with subfolders by type (`/textures`, `/models`, `/images`).
- Fonts loaded via `@font-face` live in `public/fonts/`.

## Documentation Placement
All markdown docs stay within `Docs/`. Additional ADR (Architecture Decision Records) can be stored under `Docs/ADR/`.

## Build & Deployment Structure
- Local dev: `npm start` (CRACO)
- Production build: `npm run build` → output to `build/`
- Deploy preview: Netlify build hook
- Edge API: `wrangler publish` from `src/worker/`

## Environment-Specific Configurations
- **Development**: `.env.development` – verbose logging, mock data.
- **Staging**: `.env.staging` – connect to staging API endpoints.
- **Production**: `.env.production` – analytics keys, error reporting.

Keep environment secrets out of VCS; use Netlify / Cloudflare dashboard variables for CI.
