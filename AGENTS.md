# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 15 App Router application in TypeScript. Pages and route handlers live in `app/`; dashboard screens are under `app/dashboard/` and server endpoints under `app/api/`. Reusable components are grouped by feature in `components/`, hooks in `hooks/`, and services and utilities in `lib/`. AI adapters belong in `lib/ai/`, validation schemas in `lib/validations/`, and database types in `types/`. Supabase changes live in `supabase/migrations/`; keep one dated SQL file per change. `cloud-functions/` contains deployable functions, while `z_publish/test-scripts/` contains manual provider checks.

## Build, Test, and Development Commands

- `npm ci` installs the exact dependency versions from `package-lock.json`.
- `npm run dev` starts the local Next.js server on port `4001`.
- `npm run build` creates a production build and catches integration errors.
- `npm run start` serves the production build.
- `npm run lint` runs the configured lint command; resolve warnings before submitting changes.
- `npx tsc --noEmit` performs a standalone strict type check.

Provider scripts are manual checks, for example `node z_publish/test-scripts/test-gemini.mjs`. They require credentials and may call paid APIs.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes in TypeScript, and functional components. Name components in PascalCase (`QuestionCard.tsx`), hooks with a `use` prefix (`useQuestions.ts`), and helpers in kebab-case or descriptive lowercase modules. Follow App Router filenames such as `page.tsx`, `layout.tsx`, and `route.ts`. Prefer the `@/` alias over long relative imports. Mark client-only code with `'use client'`, and validate request data with Zod where applicable.

## Testing Guidelines

No automated test runner or coverage threshold is currently configured. For every change, run `npx tsc --noEmit`, `npm run lint`, and `npm run build`. Manually exercise affected pages and API routes; for UI changes, include desktop and mobile screenshots. Never make live-provider smoke tests part of an offline verification claim.

## Commit & Pull Request Guidelines

Recent history has mostly placeholder `no message` commits, so use clearer, imperative summaries going forward, such as `Fix draft save status` or `Add Gemini OCR fallback`. Keep commits focused. Pull requests should explain the problem and solution, list verification performed, link relevant issues, note migrations or environment changes, and include screenshots for visible UI work.

## Security & Configuration

Copy `.env.example` to `.env.local` and keep Supabase and AI-provider secrets out of Git. Never expose service-role keys through `NEXT_PUBLIC_*` variables or log credentials, tokens, or uploaded student content.
