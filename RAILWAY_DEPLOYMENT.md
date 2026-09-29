# Railway Deployment

Railway builds this application from `Dockerfile`. The runtime image includes Tesseract OCR with Simplified Chinese support and runs the optimized Next.js standalone server.

## 1. Push the Current Code

The previous Railway log came from an older revision: the two blocking lint errors in `app/api/auth/wechat/route.ts` are fixed in the current workspace. Commit and push the changes before redeploying. A Railway “Redeploy” of the old revision will repeat the same failure.

## 2. Create the Service

Connect the `AIMistakeLib` GitHub repository to a new Railway service. Because `AIMistakeLib` is currently its own Git repository, leave **Root Directory** empty. If it is later moved into the parent repository, set Root Directory to `/AIMistakeLib`.

Railway detects the root `Dockerfile` automatically. Do not override the build or start command; the image starts with `node server.js` and listens on Railway's injected `PORT`.

Before the first deployment of the invite/credit release, apply
`supabase/migrations/20260929_add_invites_credits_and_ai_billing.sql` in the
Supabase SQL Editor. Railway does not apply Supabase migrations automatically.
Create the first campaign and code using the examples in
`BILLING_AND_INVITES.md`; without a redeemed code, AI endpoints intentionally
return `INVITE_REQUIRED`.

## 3. Configure Variables

Add these required variables under **Service → Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_USER_IDS=your-supabase-user-id
ALIBABA_API_KEY=your-alibaba-key
BAIDU_API_KEY=your-baidu-key
BAIDU_SECRET_KEY=your-baidu-secret
DEEPSEEK_API_KEY=your-deepseek-key
```

`ADMIN_USER_IDS` is a comma-separated list of Supabase Auth user IDs allowed to use the administrator pages. Add `GEMINI_API_KEY`, `KIMI_API_KEY`, `MINIMAX_API_KEY`, `WECHAT_APP_ID`, and `WECHAT_APP_SECRET` only for enabled integrations. `NEXT_PUBLIC_*` values are intentionally included in the browser bundle; never give `SUPABASE_SERVICE_ROLE_KEY` that prefix.

Variable changes to `NEXT_PUBLIC_*` require a rebuild, not only a restart.

## 4. Networking and Health

Generate a public domain in **Settings → Networking**. Set the healthcheck path to `/api/health`; the endpoint does not call Supabase or an AI provider. No volume is needed because uploaded images use Supabase Storage and OCR temporary files are deleted after each request.

After deployment, verify:

```bash
curl https://your-domain.up.railway.app/api/health
```

Then test login, image upload, `/api/v1/ai/recognize`, and saving a recognized draft. Point the iOS `API_BASE_URL` to `https://your-domain/api/v1`; the Mini Program base URL should be the origin without `/api/v1` because its request helpers append that path.

## Troubleshooting

- **Old lint errors:** confirm the deployment commit contains the current `app/api/auth/wechat/route.ts`.
- **Supabase values are undefined:** verify both `NEXT_PUBLIC_*` variables exist, then trigger a fresh build.
- **Tesseract cannot start:** confirm the deployment used the repository Dockerfile rather than Railpack.
- **Application failed to respond:** remove custom start commands and confirm the service uses Railway's `PORT`.
- **OCR fails after two minutes:** inspect application logs and the upstream provider timeout; Railway healthcheck timeout does not control request duration.
