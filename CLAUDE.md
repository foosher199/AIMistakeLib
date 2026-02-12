# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A Chinese-language web application for capturing wrong/missed exam questions via AI-powered image recognition, storing them in the cloud, and reviewing them over time. Built with Next.js 15, React 19, TypeScript, and Supabase.

## Project Layout

```
/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home page
│   ├── globals.css             # Global styles + Tailwind imports
│   ├── api/                    # Next.js API routes
│   │   ├── ai/recognize/       # AI image recognition endpoint
│   │   └── questions/          # CRUD API for questions
│   └── dashboard/
│       ├── layout.tsx          # Dashboard layout with Navbar + Footer
│       ├── page.tsx            # Main dashboard page (question list)
│       ├── upload/             # Upload page for new questions
│       ├── questions/          # Question detail pages
│       ├── history/            # Review history page
│       └── profile/            # User profile page
├── components/
│   ├── auth/                   # Auth components (LoginForm, RegisterForm, LoginDialog)
│   ├── layout/                 # Layout components (Navbar, Footer)
│   ├── questions/              # Question-related components (QuestionCard, QuestionList, etc.)
│   ├── upload/                 # Upload-related components
│   └── ui/                     # Shadcn UI components (button, dialog, dropdown-menu, etc.)
├── hooks/
│   ├── useAuth.ts              # Supabase auth hook (login, register, anonymous login)
│   ├── useQuestions.ts         # React Query hooks for question CRUD operations
│   └── useOCR.ts               # AI image recognition hook
├── lib/
│   ├── supabase.ts             # Supabase client factory (browser, server, admin)
│   ├── supabase-client.ts      # Browser client wrapper
│   ├── supabase-server.ts      # Server client wrapper
│   ├── utils.ts                # Utility functions (cn, image compression, etc.)
│   ├── providers.tsx           # React Query provider
│   ├── ai/
│   │   ├── alibaba.ts          # Alibaba DashScope integration (qwen-vl-plus)
│   │   ├── baidu.ts            # Baidu OCR integration (fallback)
│   │   └── gemini.ts           # Google Gemini integration (gemini-2.0-flash-exp)
│   └── validations/            # Zod schemas for form validation
├── types/
│   └── database.ts             # Supabase database types + type helpers
├── cloud-functions/
│   └── ai-recognize/
│       ├── index.js            # Tencent Cloud Function for AI proxy (optional CORS workaround)
│       └── package.json        # Dependencies: axios
├── supabase/
│   └── migrations/             # Database migration files
├── package.json
├── next.config.js              # Next.js config
├── tsconfig.json               # TypeScript config with @/* path alias
└── tailwind.config.js          # Tailwind CSS config with custom animations
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Next.js dev server on http://localhost:4001
npm run build        # Type-check and production build
npm run start        # Start production server
npm run lint         # ESLint
```

There is no test suite configured in this project.

## Architecture & Data Flow

**Framework:** Next.js 15 with App Router. Pages are in `app/`, layouts use nested routing, and data fetching uses React Server Components where applicable.

**Routing:** URL-based routing via Next.js App Router. Main routes:
- `/` - Home/landing page
- `/dashboard` - Main dashboard (question list)
- `/dashboard/upload` - Upload new questions
- `/dashboard/questions/[id]` - Question detail page
- `/dashboard/history` - Review history
- `/dashboard/profile` - User profile

**Authentication:** Supabase Auth with three modes:
1. **Anonymous login** (`useAuth().loginAnonymous()`) - Quick guest access, data saved to user_id, can upgrade to email/password later
2. **Email/password registration** (`useAuth().signUp()`) - Email verification currently disabled for faster onboarding
3. **Email/password login** (`useAuth().signIn()`)
4. **Guest upgrade** (`useAuth().bindEmail()`) - Anonymous users can bind email to keep their data

Auth state is managed client-side via `useAuth` hook (hooks/useAuth.ts), which wraps Supabase Auth SDK and provides reactive state updates via `onAuthStateChange`.

**Database:** Supabase (PostgreSQL) with Row Level Security (RLS). Two main tables:
- `mistake_questions` - Question records with subject, difficulty, answer, image_url, review_count, is_mastered, etc. All queries scoped to user via RLS.
- `mistake_profiles` - User profile extensions (username, avatar_url)

See `types/database.ts` for full schema and type definitions.

**Data layer:** React Query (`@tanstack/react-query`) for server state management:
- `useQuestions()` - Fetch question list with filters
- `useQuestion(id)` - Fetch single question
- `useQuestionStats()` - Fetch stats (total, mastered, pending)
- `useCreateQuestion()` - Create new question
- `useUpdateQuestion()` - Update question (optimistic updates)
- `useDeleteQuestion()` - Delete question
- `useReviewQuestion()` - Increment review_count
- `useMasterQuestion()` - Mark as mastered

All mutations use optimistic updates and automatic cache invalidation for responsive UX.

**Supabase client pattern:** Three client types based on context:
1. `createBrowserClient()` - Client components (`'use client'`), auto session management
2. `createServerClient()` - Server components, Server Actions, API routes, reads from cookies
3. `createAdminClient()` - API routes only, bypasses RLS, requires `SUPABASE_SERVICE_ROLE_KEY`

See `lib/supabase.ts` for detailed usage examples and warnings.

**AI recognition flow:**
1. User uploads image(s) in `/dashboard/upload`
2. `useOCR().recognize(file)` validates file, compresses to max 1024px, converts to base64
3. Calls `/api/ai/recognize` POST endpoint with `{ imageBase64, provider }`
4. API route selects AI provider and calls corresponding service
5. **Supported AI providers:**
   - **Alibaba DashScope (default):** Uses qwen-vl-plus model for multimodal understanding, returns structured JSON with content, subject, difficulty, answer, explanation. High accuracy (0.8-0.95 confidence).
   - **Google Gemini:** Uses gemini-2.0-flash-exp model with structured output, similar capabilities to Alibaba. High accuracy (0.85-0.95 confidence).
   - **Baidu OCR (fallback):** Text-only OCR with keyword-based subject/difficulty inference. Medium accuracy (0.75 confidence).
6. **Automatic fallback:** If primary provider fails, API automatically tries backup providers (Alibaba → Gemini → Baidu)
7. Results returned as `AIRecognitionResult[]`, user reviews and saves to Supabase

**Cloud Function (optional):** `cloud-functions/ai-recognize` is a Tencent Cloud Function that proxies AI API calls to avoid CORS issues. It's not required if API calls work directly from the client. The function receives `{ imageBase64, provider }` and returns `{ success: true, data: [...] }` or `{ success: false, error: "..." }`.

## Key Patterns & Conventions

- **Path alias:** All imports use `@/` alias (e.g., `@/hooks/useAuth`, `@/lib/supabase`). Configured in tsconfig.json.
- **Client vs Server components:** Components with state, hooks, or browser APIs must have `'use client'` directive. Server components (default) can use async/await for data fetching.
- **UI components:** All primitives from `components/ui/` (Shadcn wrappers around Radix UI + `class-variance-authority`). Do not add new third-party component libraries.
- **Toast notifications:** Use `sonner`'s `toast` for all user feedback (success, error, info). `<Toaster />` rendered globally in root layout.
- **Styling:** Tailwind CSS with custom color tokens. Animations via `tailwindcss-animate`.
- **Form validation:** Zod schemas in `lib/validations/` for type-safe validation.
- **Data fetching:** Prefer React Query hooks (`useQuestions`, etc.) over raw fetch in components. API routes handle auth via `createServerClient()` and validate user session before operations.
- **Optimistic updates:** All mutation hooks use `onMutate` for immediate UI feedback, `onError` for rollback, `onSuccess` for cache invalidation.

## Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only, bypasses RLS

# AI Providers (server-side only)
ALIBABA_API_KEY=your-alibaba-dashscope-key        # Alibaba DashScope API key
BAIDU_API_KEY=your-baidu-api-key                  # Baidu OCR API key
BAIDU_SECRET_KEY=your-baidu-secret-key            # Baidu OCR Secret key
GEMINI_API_KEY=your-google-gemini-key             # Google Gemini API key (or use GOOGLE_API_KEY)
```

## Database Schema

**mistake_questions** table:
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users) - RLS ensures users only see their own questions
- `content` (text) - Question text
- `subject` (text) - One of: math, chinese, english, physics, chemistry, biology, history, geography, politics
- `category` (text) - Subject-specific category (e.g., "代数", "几何" for math)
- `difficulty` (text) - One of: easy, medium, hard
- `answer` (text) - Correct answer
- `user_answer` (text, nullable) - User's answer
- `explanation` (text, nullable) - Explanation/solution
- `image_url` (text, nullable) - Original question image URL
- `review_count` (integer, default 0) - Number of times reviewed
- `is_mastered` (boolean, default false) - Whether user has mastered this question
- `last_reviewed` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**mistake_profiles** table:
- `id` (uuid, PK, FK to auth.users)
- `username` (text, nullable)
- `avatar_url` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

See `types/database.ts` for TypeScript types and helper constants (SUBJECTS, DIFFICULTIES, CATEGORIES).

## API Routes

All routes in `app/api/`:

**AI Recognition:**
- `POST /api/ai/recognize` - Recognizes questions from base64 image, returns `{ results: AIRecognitionResult[] }`

**Questions CRUD:**
- `GET /api/questions?subject=&difficulty=&is_mastered=&search=&limit=&offset=` - List questions with filters
- `POST /api/questions` - Create new question, body: `QuestionInsert`
- `GET /api/questions/[id]` - Get single question
- `PATCH /api/questions/[id]` - Update question, body: `QuestionUpdate`
- `DELETE /api/questions/[id]` - Delete question
- `POST /api/questions/[id]/review` - Increment review_count and update last_reviewed
- `POST /api/questions/[id]/master` - Mark as mastered (is_mastered = true)
- `GET /api/questions/stats` - Get stats (total, mastered, pending)

All routes require authentication via Supabase session (checked in route handler with `createServerClient()`).

## Adding New Features

When adding features:
1. **New pages:** Add under `app/dashboard/` with appropriate layout
2. **New API routes:** Create in `app/api/`, use `createServerClient()` for auth, validate with Zod if needed
3. **New data queries:** Add React Query hooks in `hooks/useQuestions.ts` following existing patterns
4. **New components:** Follow Shadcn conventions, use `@/` imports, add TypeScript types
5. **Database changes:** Create Supabase migration, update `types/database.ts` (can generate with Supabase CLI)
