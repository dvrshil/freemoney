# Repository Guidelines

## Project Structure & Modules
- App Router: `src/app/**` with `layout.tsx` and `page.tsx`.
- Entry UI: `src/app/page.tsx` is a Client Component powering “freemoney.baby” Outreach Agent with two fields (About you, About your startup), an industry dropdown, animated loading steps, and a results list.
- Styling: `src/app/globals.css` defines a dark grey‑green theme via CSS variables and small animation utilities.
- Assets: `public/*` for static files. Config lives in `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`.

## Build & Development
- `npm run dev`: Run locally at `http://localhost:3000`.
- `npm run build`: Production build to `.next/`.
- `npm start`: Serve the production build.
- `npm run lint`: ESLint checks; use `npx eslint . --fix` to auto-fix.

## Theming & Icons
- Theme tokens (globals.css): `--background`, `--foreground`, `--surface`, `--surface-2`, `--border`, `--accent`, `--accent-strong`, `--muted`.
- Use with Tailwind arbitrary values, e.g., `bg-[color:var(--surface)]`.
- Icons: Material Symbols Rounded via `<link>` in `layout.tsx`. Render with `<span class="msr">icon_name</span>` (no emojis).
- Animations: `.spinner` (ring), `.dot` (pulsing dots), `.progress-fill` (eased width), `.pulse-soft` (active step).

## Coding Style & Conventions
- TypeScript (strict). Prefer functional components and App Router patterns.
- Names: Components in PascalCase; hooks/utilities in `camelCase`.
- Client vs SSR: Keep non‑deterministic logic in Client Components. `layout.tsx` uses `suppressHydrationWarning` to avoid dev hydration noise—do not rely on it to mask SSR issues.
- Imports: Use `@/*` alias for `src/*`. Fix ESLint errors or document exceptions inline.

## Testing Guidelines
- No tests configured yet. If adding:
  - Unit: `src/__tests__` with `*.test.ts(x)`.
  - E2E: Playwright in `e2e/`; prefer stable `data-testid` hooks.
- Validate key flows: form → loading steps → results. Avoid brittle animation timing assertions.

## Commit & PR Guidelines
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- PRs: Describe UX changes; include screenshots/GIFs. Ensure `npm run lint` and `npm run build` pass.

## Security & Notes
- Telemetry: do not use Sentry anywhere.
- Secrets: never commit. Use `.env.local`; document required keys (no values) in `README.md`.
- Notebooks: if added, keep code minimal in‑notebook and do not execute/save outputs.
