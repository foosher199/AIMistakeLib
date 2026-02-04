# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A Chinese-language web app for capturing wrong/missed exam questions via AI-powered image recognition, storing them in the cloud, and reviewing them over time. The frontend is a React + TypeScript SPA; the backend is serverless via Tencent CloudBase (TCB) and Tencent Cloud Functions.

## Project Layout

```
/
├── app/                        # React frontend (the main app)
│   ├── src/
│   │   ├── App.tsx             # Root component; owns view routing state and all top-level handlers
│   │   ├── main.tsx            # Entry point
│   │   ├── types/index.ts      # Core types (Question, Subject, ViewMode) and static data (SUBJECTS, CATEGORIES)
│   │   ├── config/
│   │   │   ├── tcb.ts          # CloudBase SDK init (singleton app instance)
│   │   │   ├── cloud-functions.ts  # Cloud function URLs + callAIRecognize helper
│   │   │   └── database.ts     # Database schema docs
│   │   ├── hooks/
│   │   │   ├── useTCBAuth.ts   # Auth state: login, register, anonymous login, logout
│   │   │   ├── useTCBQuestions.ts  # CRUD for questions collection; optimistic local updates
│   │   │   └── useOCR.ts       # Registers AI providers, exposes recognize() and provider switching
│   │   ├── services/ai/
│   │   │   ├── index.ts        # AIServiceManager singleton + AIProvider interface
│   │   │   └── providers/
│   │   │       ├── alibaba.ts  # Alibaba DashScope (qwen-vl-plus) — default, does vision + structured extraction
│   │   │       ├── baidu.ts    # Baidu OCR — text-only extraction, subject/difficulty inferred client-side
│   │   │       └── mock.ts     # Returns fake data; useful for UI development without API calls
│   │   ├── sections/           # Page-level components (Navbar, Hero, UploadSection, QuestionList, etc.)
│   │   └── components/ui/      # Shadcn UI component wrappers (60+ Radix-based components)
│   ├── package.json
│   └── vite.config.ts          # Vite config; sets base: './' and @/ alias to src/
└── cloud-functions/
    └── ai-recognize/
        ├── index.js            # Tencent Cloud Function: proxies image to Alibaba or Baidu AI
        └── package.json        # Only dependency: axios
```

## Commands (run from `app/`)

```bash
cd app

npm install          # Install dependencies
npm run dev          # Start dev server with HMR
npm run build        # Type-check (tsc -b) then production build (vite build)
npm run lint         # ESLint
npm run preview      # Serve the production build locally
```

There is no test suite configured in this project.

## Architecture & Data Flow

**View routing** is state-based (not URL-based). `App.tsx` holds a `currentView` state (`'home' | 'upload' | 'list' | 'history' | 'detail'`) and passes `handleViewChange` down. There is no router library.

**Auth gate:** If `useTCBAuth` reports not logged in, `App.tsx` renders only `AuthSection`. Once authenticated, it renders the full app with `Navbar` + content.

**Data layer** lives entirely in custom hooks:
- `useTCBAuth` — wraps the CloudBase Auth SDK. Supports email/password and anonymous login.
- `useTCBQuestions` — wraps CloudBase database SDK for the `questions` collection. All queries are scoped to the current user via `_openid`. Performs optimistic local state updates after each write, plus tracks `isSyncing` state for a floating sync indicator.

**AI recognition flow:**
1. User uploads an image in `UploadSection`.
2. `useOCR` converts the file to base64, calls `aiService.recognize()`.
3. `AIServiceManager` (singleton in `services/ai/index.ts`) dispatches to the selected provider.
4. The default provider (`alibaba`) sends the base64 image directly to the Alibaba DashScope API and gets back structured JSON (content, subject, difficulty, answer, explanation).
5. `baidu` provider is a fallback that does text-only OCR; subject and difficulty are inferred via keyword matching in the provider itself.
6. A `mock` provider is also registered — returns hardcoded sample questions. Useful when developing UI without hitting real APIs.

**Cloud Function (`ai-recognize`)** is an alternative path for AI calls, deployed on Tencent Cloud. It avoids CORS issues that occur when calling third-party AI APIs directly from the browser. The frontend URL for this function is configured in `src/config/cloud-functions.ts` (currently empty — must be filled in after deployment).

## Key Patterns & Conventions

- **Path alias:** All imports from `src/` use the `@/` alias (e.g., `@/config/tcb`, `@/types`).
- **UI components:** All UI primitives come from `components/ui/` (Shadcn wrappers around Radix UI). Do not add new third-party component libraries.
- **Toast notifications:** Use `sonner`'s `toast` for all user feedback. Already rendered globally via `<Toaster>` in `App.tsx`.
- **Styling:** Tailwind CSS with custom color tokens (e.g., `text-[#626a72]`, `bg-[#0070a0]`). Animations via `tailwindcss-animate` / `tw-animate-css`.
- **Forms:** React Hook Form + Zod for validation where applicable.
- **CloudBase environment ID:** `mistake-record-1gfkpu0t4d9e8174` — configured in `src/config/tcb.ts`.

## Hardcoded API Keys (current state)

The Alibaba DashScope and Baidu OCR API keys are hardcoded in both `app/src/services/ai/providers/*.ts` and `cloud-functions/ai-recognize/index.js`. If you are adding or modifying AI provider integration, keep this layout consistent across both locations unless the cloud function is being adopted as the sole path for AI calls.

## Cloud Function Deployment

The `cloud-functions/ai-recognize` function targets Tencent Cloud Functions (Node.js 18.15, 256 MB, 60 s timeout). It is triggered via HTTP POST with a JSON body `{ imageBase64, provider }`. CORS headers are set to `*`. After deploying, paste the trigger URL into `CLOUD_FUNCTIONS.AI_RECOGNIZE` in `src/config/cloud-functions.ts`.
