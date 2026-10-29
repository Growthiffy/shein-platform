# Shein — Luxury Portfolio Platform

Three apps mirroring the Cushman & Wakefield stack, rebuilt around the Shein brand
and the business model in the attached spec (Product Analyst, Invest, Community, Mentor).

## Folders

| Folder       | What                                        | Port  |
|--------------|---------------------------------------------|-------|
| `backend/`   | Express + Mongoose REST API                 | 4001  |
| `customer/`  | Next.js member site (landing + portals)     | 3010  |
| `dashboard/` | Next.js admin portal                        | 3011  |

The original Cushman repo is left read-only. All new code lives under `Shein/`.

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env            # fill MONGO_URI, JWT_SECRET, SMTP (optional in dev)
npm install
node scripts/seed.js            # creates admin + 60 products + 4 mentors + 2 wallets
npm run dev                     # http://localhost:4001

# 2. Customer
cd ../customer
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3010

# 3. Dashboard
cd ../dashboard
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3011
```

Default admin: `admin@shein.local` / `admin123` (change in production).

Email verification:
- **Production**: set `RESEND_API_KEY` (recommended for Vercel) **or** `SMTP_*` env vars.
  Without a provider the signup/resend endpoints return an error — email is required.
- **Development** (no provider): the signup/resend API response includes a `devCode`
  field with the 6-digit code, and the verify screen shows/pre-fills it, so you can
  test without sending real mail.
- `MAIL_FROM` must be a sender your provider has verified.

## Business model (per spec)

- **Signup reward**: $20 (lands in balance after email verify).
- **Levels** (Beginner → Silver → Gold):
  - Beginner: salary $230/day · 1.2% normal · 23% latest · min balance $0
  - Silver:   salary $500/day · 2% / 28% · min $1000
  - Gold:     salary $750/day · 4% / 35% · min $2000
- **Daily salary**: accrued on each `/api/me` fetch at the level rate (Beginner
  $230, Silver $500, Gold $750). Credited only to email-verified users with a
  positive balance at/above their level's min balance; elapsed days clamped to
  [0,7] so an idle account cannot farm a backlog.
- **Analyst cycle**: 27 products per cycle. System auto-prices from balance; the
  profit % is snapshotted when a product is first shown so a mid-cycle deposit
  does not move the quote. Admin can set a manual profit adjustment (positive or
  negative correction) for a user's next product, which overrides the snapshot.
- **Invest tiers**: Basic 1%/wk @ $1000 → Royal VIP 30%/wk @ $25000. Lock period
  is admin-controlled (not chosen by the user).
- **Mentor**: one-time pick; admin sets/clears a user's mentor from the dashboard.
- **Community**: `daily` and `invest` groups + per-mentor rooms. Admin can publish
  editorial posts via staff announcement accounts, controls which users can reach
  which groups, and manages 20–25 AI personas that post automated chatter.

## Admin settings (dashboard → Settings)

Generic key/value `Setting` collection. Seeded defaults, admin-editable:

| Key                      | Default | Effect                                        |
|--------------------------|---------|-----------------------------------------------|
| `minWithdrawalUsd`       | 50      | Rejects withdrawals below this amount.        |
| `investLockWeeks`        | 4       | Lock duration applied to new investments.     |
| `personaChatIntervalMin` | 15      | Min minutes between automated persona posts.  |

- `GET /api/admin/settings` · `PUT /api/admin/settings/:key {value}` (admin).
- `GET /api/wallet/limits` exposes only `{ minWithdrawalUsd }` to members.

## Personas (dashboard → Personas)

22 AI community members seeded across `daily` / `invest` / `both`. On a community
GET, if the group's last message is older than `personaChatIntervalMin`, one random
active persona posts a generic, non-promotional line (`authorType: "persona"`,
shown with the staff badge). Admin can add, toggle active/canReply, or delete them.

## Community access control (dashboard → Users)

Each user has `communityAccess { daily, invest, mentorRooms }` (all default true).
Unchecking a flag returns 403 on that group's GET/POST; the customer app hides the
tab and disables sending.

## Routes (backend)

```
POST /api/auth/signup   {email, password}        -> sends 6-digit code
POST /api/auth/verify   {email, code}            -> returns {token, user}
POST /api/auth/login    {email, password}
POST /api/auth/resend   {email}

GET  /api/me                                     -> {user}
POST /api/me/username   {username}
POST /api/me/payout-wallet / DELETE :idx

GET  /api/analyst/next                           -> product + buying rate + profit%
POST /api/analyst/submit {comment}
GET  /api/analyst/history

GET  /api/wallet/deposit-addresses
POST /api/wallet/deposit {amount, chain, txHash, slipUrl?}
POST /api/wallet/withdraw {amount, chain, address}   -> enforces minWithdrawalUsd
GET  /api/wallet/history
GET  /api/wallet/limits                          -> {minWithdrawalUsd}

GET  /api/invest/tiers                            -> {tiers, lockWeeks}
POST /api/invest/start   {amount, tierLevel}      -> lockWeeks is admin-set, body ignored
POST /api/invest/release

GET  /api/mentor                                 -> list of mentors
POST /api/mentor/select  {id}

GET  /api/community/:group                       -> daily | invest | mentor:<id> (403 if gated)
POST /api/community/:group {text}

/api/admin/* (admin JWT) -> users, products, tx, wallets, mentors, chat,
                            settings (GET, PUT :key), personas (CRUD)
```

## Deployment

Mirrors Cushman topology: Vercel for `customer/` and `dashboard/`, Render/Vercel
for `backend/`, MongoDB Atlas for data. Do not reuse Cushman env values — Shein
is a separate project.
