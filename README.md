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

Email verification: in dev with no SMTP set, codes are printed to the backend console.

## Business model (per spec)

- **Signup reward**: $20 (lands in balance after email verify).
- **Levels** (Beginner → Silver → Gold):
  - Beginner: salary $230/day · 1.2% normal · 23% latest · min balance $0
  - Silver:   salary $500/day · 2% / 28% · min $1000
  - Gold:     salary $750/day · 4% / 35% · min $2000
- **Analyst cycle**: 27 products per cycle. System auto-prices from balance; admin
  can override next product's profit % (incl. negatives) per user.
- **Invest tiers**: Basic 1%/wk @ $1000 → Royal VIP 30%/wk @ $25000.
- **Mentor**: one-time pick; change via support (admin edits user).
- **Community**: `daily` and `invest` groups + per-mentor rooms. Admin can post as AI personas.

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
POST /api/wallet/withdraw {amount, chain, address}
GET  /api/wallet/history

GET  /api/invest/tiers
POST /api/invest/start   {amount, tierLevel, lockWeeks?}
POST /api/invest/release

GET  /api/mentor                                 -> list of mentors
POST /api/mentor/select  {id}

GET  /api/community/:group                       -> daily | invest | mentor:<id>
POST /api/community/:group {text}

/api/admin/* (admin JWT)                         -> users, products, tx, wallets, mentors, chat
```

## Deployment

Mirrors Cushman topology: Vercel for `customer/` and `dashboard/`, Render/Vercel
for `backend/`, MongoDB Atlas for data. Do not reuse Cushman env values — Shein
is a separate project.
