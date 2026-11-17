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

## MCQ tests (Phase 1)

Run `supabase/migrations/20261117000000_phase1_mcq_tests.sql` in the Supabase SQL editor first.

- **Question bank** (`/admin/question-bank`): topics per subject, CSV upload (download the template on the
  page; from Excel use *Save As → CSV UTF-8*). Every row is validated; exact duplicates are skipped and
  near-duplicates (similar wording, ≥60% character overlap) are held back until the admin imports them anyway.
- **Test format** (`/admin/test-settings`): marks are basic 1, intermediate 2, advanced 4. Each level's mix
  must total exactly 50 marks with at least 20 questions (defaults: Basic 24/7/3, Intermediate 14/8/5,
  Advanced 6/6/8). The admin also sets the time limit, negative marking on/off and its value, and credit prices.
- **Credits**: new students get the default balance on registration; a test's price is deducted atomically
  when it starts (`start_test_attempt`). Admins top up from the Students page. Every change is in `credit_ledger`.
- **Levels** (`/admin/levels`): a level is a list of requirements such as "5 × Basic tests, any subject,
  score ≥ 25". Tests count toward the level the student is currently on.
- **Deterministic by design**: questions are picked at random by code, scoring is rule-based
  (`app/lib/tests/scoring.ts`), and correct answers never reach the browser during a test. The only LLM call
  is the written summary on the report, with a template fallback (`app/lib/ai/testReport.ts`).
- **Anti-cheating**: copy/paste/right-click/selection blocked; every tab or window switch is logged and
  counted (the 5th auto-submits); being away more than 20 seconds auto-submits (measured on the server).
  The timer is server-side, so closing the tab doesn't stop it.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production build
- `npm run lint` — ESLint
