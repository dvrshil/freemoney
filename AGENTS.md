# Repository Guidelines

## Project Structure & Module Organization
- App Router: `src/app/**` with route segments (`page.tsx`, `layout.tsx`).
- Assets: `public/*` for static files (SVGs, images).
- Styling: `src/app/globals.css` with Tailwind CSS (via `@tailwindcss/postcss`).
- Config: `tsconfig.json` (path alias `@/*`), `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`.
- Package scripts and deps live in `package.json`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server at `http://localhost:3000`.
- `npm run build`: Create a production build (`.next/`).
- `npm start`: Serve the production build.
- `npm run lint`: Run ESLint checks. Use `npx eslint . --fix` to auto-fix.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Prefer functional components and App Router patterns.
- Names: Components in PascalCase; hooks/utilities in `camelCase`; route files as `page.tsx`/`layout.tsx`.
- Imports: Use `@/*` alias for `src/*`.
- Lint: Fix all ESLint errors; justify any `eslint-disable` with a comment.

## Testing Guidelines
- No test runner is configured yet. If adding tests:
  - Unit: `src/__tests__` with `*.test.ts` or `*.test.tsx`.
  - E2E: consider Playwright in `e2e/` with clear, reliable selectors.
- Focus on critical paths; avoid brittle snapshots. Ensure tests run in CI before merging.

## Commit & Pull Request Guidelines
- Commits: Use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.). Current history has no convention—adopt this going forward.
- PRs: Include a clear description, linked issues, screenshots/GIFs for UI changes, and validation steps. Ensure `npm run lint` and `npm run build` pass locally.

## Security & Misc
- Telemetry: Do not use Sentry anywhere.
- Secrets: Never commit secrets. Use `.env.local`; document required keys in `README.md` without values.
- Notebooks: If adding Jupyter notebooks, keep code simple and do not run/save outputs in the repo.
