# StoneCentury Financial — Client Portal (Sprint 1)

MVP onboarding flow: admin invites a client, client sets a password, uploads
Phase 1 documents, and unlocks Phase 2 by scheduling a meeting. Admin has a
minimal client list showing everyone's current phase.

## Prerequisites

- Node 20+
- A local PostgreSQL server (e.g. `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`)

## Setup

```bash
# 1. Server
cd server
cp .env.example .env      # adjust DATABASE_URL if needed
npm install
npm run prisma:generate
npm run prisma:migrate    # creates tables
npm run prisma:seed       # seeds Phase 1 document categories + an admin user
npm run dev                # http://localhost:4000

# 2. Web (separate terminal)
cd web
npm install
npm run dev                # http://localhost:5173
```

The seed script prints the admin login (`admin@stonecenturyfinancial.com` /
`changeme123` — change this password immediately in a real environment).

## Trying the flow

1. Sign in as the seeded admin at `http://localhost:5173/login`.
2. On **Clients**, click **+ Add client** and send an invite. The invite link
   is logged to the **server** console (email sending is stubbed for dev —
   see `server/src/services/inviteEmail.ts`).
3. Open that link in a private/incognito window, set a password.
4. Log in as the client — you land directly on the onboarding journey.
5. Upload a file for each of the 11 Phase 1 categories, then
   **Schedule your next meeting** to unlock Phase 2.
6. Back in the admin client list, the client's phase and Phase 1 progress
   should be updated.

## Known gaps (by design — see the sprint plan)

Phase 2–4 checklists, Document Library, Action Items + LLM extraction,
Ask Brock, Chat, Learning Library, and notifications are not built yet.
File storage is local disk only — migrate to S3/R2 before real client PII
is uploaded. Email sending is a console-log stub — swap in Resend/Postmark
before real invites go out.
