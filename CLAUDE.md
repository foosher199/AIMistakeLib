# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A Chinese-language web application for capturing wrong/missed exam questions via AI-powered image recognition, storing them in the cloud, and reviewing them over time. Built with Next.js 15, React 19, TypeScript, and Supabase.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Next.js dev server on http://localhost:4001
npm run build        # Type-check and production build
npm run start        # Start production server
npm run lint         # ESLint
```

There is no test suite configured in this project.

## Project Layout

```
/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout with Providers, Navbar, Footer, Toaster
│   ├── page.tsx                # Home/landing page
│   ├── globals.css             # Global styles + Tailwind imports + CSS variables
│   ├── api/                    # API routes
│   │   ├── ai/recognize/       # POST /api/ai/recognize - AI image recognition
│   │   ├── drafts/             # GET/POST /api/drafts + [id]/save, DELETE [id]
│   │   ├── questions/          # GET/POST /api/questions + [id]/review/master/stats
│   │   └── feedbacks/          # GET/POST /api/feedbacks
│   └── dashboard/              # Dashboard pages (no layout.tsx here - uses root)
│       ├── page.tsx            # Main dashboard (question list with filters)
│       ├── upload/             # Upload page for new questions
│       ├── questions/[id]/     # Question detail/edit page
│       ├── history/            # Review history page
│       ├── profile/            # User profile page
│       └── feedback/           # User feedback page
├── components/
│   ├── auth/                   # LoginForm, RegisterForm, BindEmailForm, LoginDialog, AuthSection
│   ├── layout/                 # Navbar, Footer
│   ├── questions/              # QuestionCard, QuestionList, QuestionFilters, QuestionStats
│   ├── upload/                 # ImageUpload, MultiImageUpload, QuestionForm, RecognitionResults, ImageQueueList
│   └── ui/                     # Shadcn UI primitives (button, dialog, dropdown-menu, badge, input, progress, tabs)
├── hooks/
│   ├── useAuth.ts              # Supabase auth (anonymous, email/password, bindEmail)
│   ├── useQuestions.ts         # React Query hooks for question CRUD + optimistic updates
│   ├── useDrafts.ts            # React Query hooks for drafts (list, save, delete)
│   ├── useFeedback.ts          # React Query hooks for feedback (create, list)
│   └── useOCR.ts               # AI image recognition hook
├── lib/
│   ├── supabase.ts             # createBrowserClient/createServerClient/createAdminClient + getCurrentUser/requireAuth
│   ├── utils.ts                # cn() utility, image compression, formatValidationError
│   ├── providers.tsx           # React Query QueryClientProvider
│   ├── rate-limit.ts           # LRU-based rate limiter for AI recognition
│   ├── ai/
│   │   ├── alibaba.ts          # Alibaba DashScope (qwen-vl-plus) vision recognition
│   │   ├── baidu.ts            # Baidu OCR + understanding pipeline
│   │   ├── deepseek.ts         # DeepSeek text analysis
│   │   ├── gemini.ts           # Google Gemini analysis
│   │   ├── kimi.ts             # Moonshot Kimi analysis
│   │   ├── minimax.ts          # MiniMax analysis
│   │   ├── ocr.ts              # Tesseract CLI OCR wrapper
│   │   └── image-utils.ts      # Image processing utilities
│   └── validations/
│       └── question.ts         # Zod schemas for question CRUD + parseAndValidate helper
├── types/
│   └── database.ts             # Supabase Database types, Question/Draft/Profile/Feedback types, SUBJECTS/DIFFICULTIES/CATEGORIES constants
├── cloud-functions/
│   └── ai-recognize/           # Tencent Cloud Function proxy (optional CORS workaround)
├── supabase/
│   └── migrations/             # Database migration files
├── package.json
├── next.config.js              # Next.js config (port 4001 dev, reactStrictMode, remotePatterns)
├── tsconfig.json               # TypeScript with @/* alias, noUnusedLocals/noUnusedParameters
├── tailwind.config.js          # Tailwind with custom colors, animations, sidebar tokens
├── vercel.json                 # Vercel deployment config (regions, maxDuration 10s for API)
└── Dockerfile                  # Render deployment with Tesseract OCR + Chinese language pack
```

## Architecture & Data Flow

**Framework:** Next.js 15 with App Router. Server components by default; client components need `'use client'`.

**Routing:**
- `/` - Home/landing page
- `/dashboard` - Question list with filters (subject, difficulty, mastered status, search)
- `/dashboard/upload` - Image upload + AI recognition
- `/dashboard/questions/[id]` - Question detail/edit
- `/dashboard/history` - Review history
- `/dashboard/profile` - User profile
- `/dashboard/feedback` - Submit feedback

**Authentication:** Supabase Auth with four modes (all via `useAuth` hook):
1. **Anonymous login** (`loginAnonymous()`) - Quick guest access, `user.is_anonymous = true`
2. **Email/password registration** (`signUp()`) - Email verification disabled for faster onboarding
3. **Email/password login** (`signIn()`)
4. **Guest upgrade** (`bindEmail()`) - Anonymous users bind email/password, keeps user_id and data

Auth state managed via `onAuthStateChange` listener in `useAuth` hook.

**Database:** Supabase PostgreSQL with RLS. Four tables:
- `mistake_questions` - Question records (content, subject, category, difficulty, answer, image_url, review_count, is_mastered, user_id)
- `mistake_drafts` - Temporary storage for AI-recognized questions before user saves (content, subject, category, difficulty, answer, confidence, image_url, user_id)
- `mistake_profiles` - User profile extensions (username, avatar_url)
- `mistake_feedbacks` - User feedback (category, subject, content, status, email, user_id)

All queries scoped to user via RLS. See `types/database.ts` for full schema and helper constants (SUBJECTS, DIFFICULTIES, CATEGORIES).

**Data layer:** React Query (`@tanstack/react-query`) for server state:
- `useQuestions(params)` - Fetch list with filters, staleTime 5min
- `useQuestion(id)` - Fetch single question
- `useQuestionStats()` - Fetch stats (total, mastered, pending)
- `useCreateQuestion()` - Create (invalidates questions + stats)
- `useUpdateQuestion()` - Update with optimistic updates + rollback
- `useDeleteQuestion()` - Delete with cache removal
- `useReviewQuestion()` - Increment review_count with optimistic update
- `useMasterQuestion()` - Mark mastered with optimistic update

All mutations use `onMutate` for optimistic updates, `onError` for rollback, `onSuccess` for cache invalidation.

**Supabase client pattern:** Three clients based on context:
1. `createBrowserClient()` - Client components (`'use client'`), auto session management. Import from `@/lib/supabase-client`
2. `createServerClient()` - Server components, API routes, reads from cookies. Import from `@/lib/supabase-server`
3. `createAdminClient()` - API routes only, bypasses RLS, requires `SUPABASE_SERVICE_ROLE_KEY`. Import from `@/lib/supabase-server`

**AI recognition flow:**
1. User uploads image in `/dashboard/upload`
2. Image uploaded to Supabase Storage (`mistake-images` bucket), public URL returned
3. `useOCR().recognize(imageUrl)` calls `/api/ai/recognize` with `{ imageUrl, provider }`
4. API route validates auth, checks rate limit (20 requests/hour per user)
5. Multiple AI providers available (configured via `AI_PROVIDER` env var):
   - **alibaba** (default): Alibaba DashScope qwen-vl-plus vision model
   - **baidu**: Baidu OCR + understanding pipeline
   - **deepseek**: DeepSeek text analysis (used after OCR)
   - **gemini**: Google Gemini analysis
   - **kimi**: Moonshot Kimi analysis
   - **minimax**: MiniMax analysis
   - **text**: Tesseract OCR → DeepSeek text structure analysis
6. Recognition results saved to `mistake_drafts` table, user reviews and saves via `useSaveDraft()`
7. After saving, draft deleted and question created in `mistake_questions`

**Rate limiting:** In-memory LRU cache (`lib/rate-limit.ts`), 20 requests/hour per user for AI recognition.

## Key Patterns & Conventions

- **Path alias:** All imports use `@/` alias (e.g., `@/hooks/useAuth`, `@/lib/supabase-server`). Configured in tsconfig.json.
- **TypeScript strictness:** `noUnusedLocals` and `noUnusedParameters` are enabled. Unused variables will cause build errors.
- **Client vs Server components:** Components with state, hooks, or browser APIs must have `'use client'` directive. Server components (default) can use async/await for data fetching.
- **UI components:** All primitives from `components/ui/` (Shadcn wrappers around Radix UI + `class-variance-authority`). Do not add new third-party component libraries.
- **Toast notifications:** Use `sonner`'s `toast` for all user feedback. `<Toaster />` rendered globally in root layout at `app/layout.tsx:34`.
- **Styling:** Tailwind CSS with custom HSL color tokens in `globals.css`. Animations via `tailwindcss-animate`.
- **Form validation:** Zod schemas in `lib/validations/` with `parseAndValidate()` and `formatValidationError()` helpers.
- **Data fetching:** Prefer React Query hooks over raw fetch in components. API routes handle auth via `createServerClient()` from `@/lib/supabase-server`.
- **Optimistic updates:** All mutation hooks use `onMutate` for immediate UI feedback, `onError` for rollback, `onSuccess` for cache invalidation.

## Environment Variables

Required in `.env.local`:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only, bypasses RLS

# AI Provider selection (one or more needed for recognition)
AI_PROVIDER=alibaba  # Default provider: alibaba, baidu, deepseek, gemini, kimi, minimax, text
ALIBABA_API_KEY=your-alibaba-dashscope-key        # For alibaba provider
BAIDU_API_KEY=your-baidu-api-key                  # For baidu provider
BAIDU_SECRET_KEY=your-baidu-secret-key             # For baidu provider
DEEPSEEK_API_KEY=your-deepseek-key                # For text mode / deepseek provider
GEMINI_API_KEY=your-gemini-key                    # For gemini provider
KIMI_API_KEY=your-kimi-key                        # For kimi provider
MINIMAX_API_KEY=your-minimax-key                  # For minimax provider

# Optional: Tesseract OCR is used locally, no API key needed
# For deployment, see Dockerfile for Tesseract + chi_sim installation
```

## API Routes

**AI Recognition:**
- `POST /api/ai/recognize` - Body: `{ imageUrl: string, provider?: string }`. Returns `{ results: AIRecognitionResult[] }`

**Drafts:**
- `GET /api/drafts` - List current user's drafts
- `POST /api/drafts` - Create draft from recognition results
- `DELETE /api/drafts/[id]` - Delete a draft
- `POST /api/drafts/[id]/save` - Convert draft to question in `mistake_questions`

**Questions CRUD:**
- `GET /api/questions?subject=&difficulty=&is_mastered=&search=&limit=&offset=` - List with filters
- `POST /api/questions` - Create new question, body: `CreateQuestionInput`
- `GET /api/questions/[id]` - Get single question
- `PATCH /api/questions/[id]` - Update question, body: `UpdateQuestionInput`
- `DELETE /api/questions/[id]` - Delete question
- `POST /api/questions/[id]/review` - Increment review_count and update last_reviewed
- `POST /api/questions/[id]/master` - Mark as mastered (is_mastered = true)
- `GET /api/questions/stats` - Get stats (total, mastered, pending)

**Feedback:**
- `POST /api/feedbacks` - Submit feedback (allows anonymous)
- `GET /api/feedbacks` - Get current user's feedback list

All routes require authentication (checked via `createServerClient()` + `supabase.auth.getUser()`), except feedback POST which allows anonymous.

## Deployment Notes

**Vercel:** Configured in `vercel.json` with maxDuration 10s for API routes (AI recognition may need more). CORS headers configured for API routes.

**Render/Docker:** `Dockerfile` installs Tesseract OCR + Chinese language pack (`tesseract-ocr-chi-sim`). Build runs `npm run build`, exposes port 3000.

**Local Tesseract:** Required for text mode OCR. Install via:
- Mac: `brew install tesseract tesseract-lang`
- Ubuntu: `apt-get install -y tesseract-ocr tesseract-ocr-chi-sim`

## Adding New Features

1. **New pages:** Add under `app/dashboard/` (no separate layout, root layout handles Navbar/Footer)
2. **New API routes:** Create in `app/api/`, use `createServerClient()` for auth, validate with Zod
3. **New data queries:** Add React Query hooks in `hooks/useQuestions.ts` following existing patterns
4. **New components:** Follow Shadcn conventions, use `@/` imports, add TypeScript types
5. **Database changes:** Create Supabase migration, update `types/database.ts`
