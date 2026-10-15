# AI Interviewer

White-label AI interview practice platform. Students register, get approved by an admin, then run
text interviews (by subject + difficulty, or based on their uploaded resume) and get a graded report.

Built with Next.js 16 (App Router), Supabase (auth, Postgres, storage) and Groq.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   | Variable | Purpose |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server only — never expose) |
   | `GROQ_API_KEY` | Groq API key for the interviewer and grader |
   | `RESEND_API_KEY` | Optional — sends the "account approved" email |
   | `EMAIL_FROM` | Optional — sender address for that email (must be a Resend-verified domain) |

3. Apply the database policies: run each file in `supabase/migrations/` in the Supabase SQL editor.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The script runs Node with `--use-system-ca` so HTTPS works behind antivirus HTTPS scanning
   (e.g. AVG), which re-signs traffic with a certificate only the OS trusts.

## How it fits together

**Trust model.** The browser only ever reads its *own* profile and interviews (enforced by RLS).
Everything else — login lookups, chat turns, grading, uploads, admin actions — goes through API
routes that verify the session cookie and use the service-role key. The stored `chat_history` is the
source of truth: the client sends only its newest answer, and the server grades the stored transcript.

```
app/
  page.tsx                 student login / register
  admin/                   admin login, dashboard, reports, white-label settings
  dashboard/
    (shell)/               pages sharing the sidebar + top bar layout
    interview/[id]/        full-screen interview room
  api/
    auth/                  login, admin-login
    interviews/            create a session
    chat/                  next interviewer turn
    evaluate/              grade + save report
    parse-resume/          PDF upload + text extraction
    register/
    admin/                 students, interviews, settings, logo (admin only)
  components/              shared UI (DashboardShell, OrgLogo, Notice, report cards, ...)
  lib/
    supabase/              browser | server (cookie session) | admin (service role) clients
    auth.ts                requireUser / requireAdmin for API routes
    ai/                    Groq client, interviewer prompts, evaluator
    api.ts                 browser helper for calling our API routes
    interviews.ts          server-side interview data access
    questionAnalysis.ts    unique-question counting (shared by client and server)
proxy.ts                   route protection (login, approval status, admin role)
supabase/migrations/       RLS policies
```

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production build
- `npm run lint` — ESLint
