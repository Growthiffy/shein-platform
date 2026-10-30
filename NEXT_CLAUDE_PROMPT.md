# Shein Platform — Authenticity & Depth Upgrade

Reference: `Hannan Instructions.md` — all original requirements stay intact. This prompt adds depth, realism, and polish on top. Never remove existing features; extend them.

Codebase: Express + Mongoose backend (`backend/`), Next.js customer app (`customer/`), Next.js admin dashboard (`dashboard/`). Tailwind CSS. Gold/cream/ink color scheme already established.

---

## 1. ANALYST TASK — MAKE THE WORK FEEL REAL

**Current problem**: User types any garbage comment, clicks submit, gets paid. Obvious fake work within 2 submissions.

### Backend changes (`backend/routes/analyst.js`, new fields on `AnalystSubmission` model):

- Add structured rating fields to submission: `demandRating` (1-5), `qualityRating` (1-5), `priceRating` (1-5), `recommendation` (enum: "stock_more", "maintain", "reduce", "discontinue").
- All four ratings + recommendation required alongside comment. Return 400 if missing.
- **Minimum comment length**: 50 characters. Return error: "Analysis does not meet minimum quality standards. Please provide detailed market observations."
- **Reject garbage comments**: Backend checks if comment is fewer than 3 unique words, or matches common garbage patterns (all same character, "good product", "nice", "ok", "test", "asdf", etc). Return error: "Low-quality analysis rejected. Provide specific observations about market positioning, demand trends, or pricing strategy."
- **Cooldown**: After submitting a product, the user cannot fetch the next product for 45 seconds. Store `analyst.lastSubmitAt` on User. `/api/analyst/next` returns `{ cooldown: true, availableAt: <timestamp> }` if called too soon.
- **AI Quality Score**: After successful submission, generate a random score between 72-96 and return it as `qualityScore` in the response. Store on the submission. This is cosmetic only — not used for any logic.
- **Product categories**: Add `category` field to Product model (enum: "fashion", "electronics", "home", "beauty", "accessories", "sports"). Seed existing products with random categories.

### Customer app changes (`customer/app/analyst/page.js`):

- Replace the single textarea with a structured form:
  - "Market Demand Assessment" — 5 star rating (clickable stars)
  - "Product Quality Rating" — 5 star rating
  - "Price Competitiveness" — 5 star rating
  - "Recommended Action" — dropdown: Stock More / Maintain Current Levels / Reduce Inventory / Discontinue
  - "Detailed Analysis" — textarea with character counter showing "XX/50 minimum"
- Show product category tag on the product card (e.g., "FASHION", "ELECTRONICS" as a colored chip)
- Add **"Market Brief"** section on the product card — a short fake paragraph generated per product. Store as `marketBrief` field on Product model. Admin can edit it. Example: "Strong Q4 demand projected. Competitor pricing ranges $850-$1,100. Social media sentiment trending positive. Supply chain stable." Seed 10-15 different briefs and assign randomly.
- After submission: Show a success modal with:
  - "Analysis Quality Score: 87%" (from backend)
  - "Commission earned: +$4.60"
  - The commission amount counting up with an animation
  - "Next product available in 0:45" countdown timer
- Show the countdown timer on the main analyst page when in cooldown state. Disable the submit area. Show: "Preparing next product analysis... 0:32"
- On cycle completion (27/27), show confetti animation and a summary: "Cycle Complete — Total commission earned this cycle: $XX.XX"

### Admin dashboard:
- Product edit form: add `category` dropdown and `marketBrief` textarea.

---

## 2. ACTIVITY FEED — AMBIENT LIFE ON DASHBOARD

**Current problem**: Dashboard is static. No sense of a living platform.

### Backend:

- New route `GET /api/activity/feed` (authenticated). Returns 15-20 recent activity items. Mix of:
  - **Real anonymized transactions**: Query recent approved deposits, withdrawals, invest_lock, commission transactions. Anonymize: show "Member #XXXX" (use real accountNumber or generate). Example: `{ type: "deposit_approved", memberNumber: 4521, amount: 500, timeAgo: "12 min ago" }`
  - **Fake filler**: If fewer than 10 real transactions in the last 24h, pad with generated items. Use a deterministic seed based on the current hour so the feed doesn't change on every refresh within the same hour.
- Activity item types and display text:
  - `"analysis_complete"` — "Member #XXXX completed a product analysis cycle"
  - `"deposit_approved"` — "Member #XXXX deposited $XXX"
  - `"withdrawal_complete"` — "Member #XXXX withdrew $XXX"
  - `"invest_start"` — "Member #XXXX started a Gold tier investment"
  - `"level_up"` — "Member #XXXX upgraded to Silver level"
  - `"new_member"` — "New analyst joined the platform"
- New admin setting `activityFeedEnabled` (default true). Another setting `platformMemberCount` (default 12847) — displayed as "Active Analysts" on dashboard. Admin can update this number.
- New route `GET /api/stats/public` (authenticated, not admin). Returns `{ onlineMembers: <number>, totalAnalysts: <platformMemberCount setting>, totalPayouts: <number> }`. `onlineMembers` is a fabricated number: take `platformMemberCount`, multiply by a time-of-day factor (higher during business hours), add random jitter ±5%.

### Customer dashboard (`customer/app/dashboard/page.js`):

- Add **live stats strip** above the "Your paths" section:
  - "X,XXX analysts online" (from `/api/stats/public` `onlineMembers`)
  - "Total analysts: XX,XXX"
  - "Total payouts: $X,XXX,XXX"
  - Style: small text, subtle, updates every 60s
- Add **Activity Feed** card below the balance strip:
  - Scrolling list of activity items, newest first
  - Each item: small colored dot (green for deposits, gold for analysis, blue for investments), text, relative time
  - Auto-refresh every 30 seconds
  - Subtle slide-in animation when new items appear
  - Max height with overflow scroll, ~6 visible items

---

## 3. COMMUNITY CHAT — MAKE PERSONAS BELIEVABLE

### Backend persona improvements (`backend/utils/personaTick.js`, `backend/data/persona_lines.json`, `backend/data/persona_scripts.json`):

- **Expand `persona_lines.json`** to 200+ lines across categories:
  - Platform-specific: "just got my weekly payout, $340 this week", "anyone else notice the new products today?", "finally hit Silver level", "how long does withdrawal take?", "Gold tier commission rate is insane", "my mentor suggested I try the investment tiers"
  - Newbie questions: "hey I just joined, how does the analyst thing work?", "what's the minimum to reach Silver?", "is there a limit on how many cycles you can do?", "do I need to deposit to start earning?"
  - Casual/social: "good morning everyone", "another productive day", "weekend vibes", "anyone here from Europe?", "night shift checking in lol"
  - Informal grammar deliberately: "thats crazy", "ur right", "lol didnt know that", "nah I think", "tbh", "imo", "fr fr"
  - Mild disagreements: "I think Silver is better value than Gold honestly", "nah Gold pays for itself in a week", "depends on your balance tho"
- **Expand `persona_scripts.json`** to 40+ scripts. Each script is a multi-message exchange between 2-3 personas. Topics:
  - Discussing withdrawal experiences
  - Comparing investment tiers
  - Helping a newbie understand the analyst workflow
  - Celebrating milestones (level up, payout received)
  - Discussing which product categories are most profitable
  - Casual off-topic (weather, plans, sports)
- **Time-zone gating**: Add admin setting `personaActiveHoursStart` (default 7) and `personaActiveHoursEnd` (default 23). Personas only post between these hours (server timezone). Outside hours: silence, like real humans sleeping.
- **Typing indicator support**: Before posting a persona message, first write a `{ group, typing: personaName, expiresAt: now + 8s }` entry to a new `ChatTyping` model (TTL index auto-deletes after 10s). The community GET endpoint returns `typing: [name1, name2]` from this collection.

### Customer community page (`customer/app/community/page.js`):

- Show **online member count** per group: "247 online" next to the group name. Use the `onlineMembers` from `/api/stats/public`, divided roughly per group (60% daily, 40% invest). Jitter ±10.
- Show **typing indicator**: "Sarah_K is typing..." at the bottom of the chat area when `typing` array is non-empty from the GET response. Subtle animation (three bouncing dots).
- Add **emoji reactions** on messages. Store on ChatMessage as `reactions: [{ emoji: "fire", count: 3 }]`. Persona messages get auto-seeded with 1-3 random reactions from the persona tick. Users can also react. New routes:
  - `POST /api/community/:group/react/:messageId { emoji }` — toggle reaction
  - Reactions shown as small pill badges below the message

---

## 4. LEGAL PAGES & COMPANY IDENTITY

### New pages in customer app:

Create these as static pages under `customer/app/(legal)/`:

- **`/about`** — About Us page:
  - Company story: "Founded in 2021, Shein Global Ltd provides market analysis tools and investment services to a growing network of independent product analysts worldwide."
  - Team section with 4-5 fake team members: CEO, CTO, Head of Analytics, Chief Compliance Officer, Head of Community. Use placeholder avatar circles with initials (no real photos). Each has a name, title, and one-line bio.
  - "Our Mission" section
  - Stats: "12,000+ analysts", "180+ countries", "$XX million in payouts"

- **`/terms`** — Terms of Service. Write 15-20 sections covering: account eligibility (18+), account registration, platform services description, analyst program terms, investment program terms, deposit/withdrawal terms, prohibited activities, intellectual property, limitation of liability, account termination, governing law, dispute resolution, modification of terms, contact information. Use professional legal language. Reference "Shein Global Ltd" throughout.

- **`/privacy`** — Privacy Policy. Cover: information collected, how information is used, data sharing, cookies, data retention, user rights, security measures, children's privacy, changes to policy, contact. Reference GDPR compliance language.

- **`/risk-disclosure`** — Investment Risk Disclosure. Standard risk warnings about investment products, market volatility, past performance disclaimers, maximum loss warnings.

- **`/aml`** — Anti-Money Laundering Policy. Cover: KYC requirements, transaction monitoring, suspicious activity reporting, record keeping, compliance officer reference.

### Footer component (`customer/components/Footer.jsx`):

Create a site-wide footer shown on all pages. Include:
- Left: "© 2024 Shein Global Ltd. All rights reserved." and "Company Registration No. SG-2021-48271"
- Center: Links to About, Terms, Privacy, Risk Disclosure, AML Policy
- Right: Social icons (Telegram, Twitter/X, Instagram) — link to `#` for now, admin can set URLs later via settings
- Subtle divider line, dark background matching the site theme
- Add this footer to AppShell.jsx so it appears on every authenticated page. Also add it to the auth page.

### Admin settings — new keys:
- `companyName` (default "Shein Global Ltd")
- `companyRegistration` (default "SG-2021-48271")
- `socialTelegram`, `socialTwitter`, `socialInstagram` (default empty)
- `supportEmail` (default "support@shein-global.com")
- `supportPhone` (default "+44 20 7946 0958")

---

## 5. FINANCIAL FLOW DEPTH

### Withdrawal improvements:

**Backend (`backend/routes/wallet.js`, `Transaction` model)**:

- Add `processingStage` field to Transaction model: enum `["submitted", "under_review", "processing", "completed", "requires_verification", "rejected"]`. Default "submitted" for new withdrawals.
- Add `stageHistory` array field: `[{ stage, at: Date, note: String }]`. Push a new entry every time `processingStage` changes.
- Add `estimatedCompletionAt` field on Transaction. Set to `now + 72 hours` on withdrawal creation.
- Add `networkFee` field (default 2.50 for now, admin-configurable via setting `withdrawalFeeUsd`).
- Withdrawal response should return the fee breakdown: `{ amount, networkFee, youReceive: amount - networkFee, estimatedCompletion }`
- New admin settings: `withdrawalFeeUsd` (default 2.50), `withdrawalProcessingHours` (default 72)

**Admin dashboard** — Transaction management:
- When viewing a pending withdrawal, admin sees buttons for each stage transition: "Mark Under Review", "Mark Processing", "Mark Completed", "Reject". Each transition updates `processingStage` and pushes to `stageHistory`.
- Admin route: `POST /api/admin/tx/:id/stage { stage, note? }`

**Customer withdraw page (`customer/app/wallet/withdraw/page.js`)**:
- Show fee breakdown before submission:
  ```
  Withdrawal amount:  $500.00
  Network fee:        -$2.50
  You receive:        $497.50
  Est. processing:    1-3 business days
  ```
- After submission, show a detailed receipt with the stage tracker:
  - Visual stepper: Submitted > Under Review > Processing > Completed
  - Each completed stage shows timestamp
  - Current stage pulses/animates
- Withdrawal history items show the current stage as a colored badge

### Deposit improvements:

**Customer deposit page (`customer/app/wallet/deposit/page.js`)**:
- Generate and display a **QR code** for the selected crypto address. Use `qrcode` npm package to generate a data URL, render as `<img>`.
- Show deposit limits: "Daily limit: $50,000 / Monthly limit: $200,000" (admin-configurable settings `depositDailyLimit`, `depositMonthlyLimit`)
- After submission, show stage tracker similar to withdrawals:
  - Submitted > Blockchain Confirmation > Under Review > Credited
- Add the same `processingStage` and `stageHistory` fields for deposits.

### Balance display everywhere:

- Wherever balance is shown, split into: **Available** and **Pending**.
  - Available = `user.balance`
  - Pending = sum of pending deposit amounts (from Transaction where type=deposit, status=pending)
- Show as: "Available: $1,040.00 / Pending: $200.00"
- Add `GET /api/wallet/balance` route returning `{ available, pending, total }`

---

## 6. KYC / VERIFICATION LEVELS

### Backend:

- Add fields to User model:
  ```
  verification: {
    level: { type: String, enum: ["none", "basic", "standard", "premium"], default: "none" },
    fullName: String,
    phone: String,
    country: String,
    idType: String,        // "passport", "national_id", "drivers_license"
    idNumber: String,
    idImageUrl: String,    // stored but never actually verified
    submittedAt: Date,
    reviewedAt: Date,
    reviewNote: String,
  }
  ```
- On email verification: auto-set `verification.level` to "basic".
- New route `POST /api/me/verify { fullName, phone, country }` — sets fields, upgrades to "standard" immediately (no real review needed, but it feels like a process).
- New route `POST /api/me/verify/id { idType, idNumber }` — sets fields, sets level to "pending_premium". Admin approves to "premium". (Always approve; the gate itself is the point.)
- Admin route `POST /api/admin/users/:id/verify { level }` — override verification level.
- Gate withdrawals above $500 behind "standard" verification. Return error: "Withdrawals above $500 require Standard verification. Please complete identity verification in your Profile."
- Admin setting `verificationWithdrawalThreshold` (default 500).

### Customer app — new page `customer/app/verification/page.js`:

- Show verification level progress:
  - **Basic** (Email verified) — done
  - **Standard** (Personal info) — form: Full name, Phone, Country dropdown
  - **Premium** (ID verification) — form: ID type dropdown, ID number, Upload image
- Each level shown as a step with status (completed / current / locked)
- Benefits listed per level:
  - Basic: "Analyst access, deposits up to $5,000"
  - Standard: "Withdrawals up to $5,000, full community access"
  - Premium: "Unlimited withdrawals, priority support, premium badge"
- Show "Verification under review" state when pending_premium, with "Estimated review time: 24-48 hours"
- Link to this page from profile page and from any withdrawal error that hits the threshold

---

## 7. ONBOARDING CHECKLIST

### Backend:

- Compute onboarding status from existing user fields (no new model needed). New route `GET /api/me/onboarding`:
  ```json
  {
    "steps": [
      { "key": "verify_email", "done": true, "label": "Verify your email" },
      { "key": "set_username", "done": false, "label": "Choose a username" },
      { "key": "first_analysis", "done": false, "label": "Submit your first analysis" },
      { "key": "first_deposit", "done": false, "label": "Make your first deposit" },
      { "key": "join_community", "done": false, "label": "Send a message in Community" },
      { "key": "choose_mentor", "done": false, "label": "Choose a mentor" }
    ],
    "completedCount": 1,
    "totalCount": 6,
    "allDone": false
  }
  ```
- Derive `done` from: `emailVerified`, `username` exists, `analyst.cycleCount > 0`, any approved deposit exists, any chat message by user exists, `mentor` is set.
- When `allDone` flips to true for the first time, push a notification: "Welcome aboard! You've completed your onboarding. All platform features are now unlocked."

### Customer dashboard:

- Show onboarding card on dashboard when `!allDone`. Position it prominently above the "Your paths" tiles.
- Design: Card with "Getting Started" header, progress bar (X/6), checklist items with checkmarks. Each incomplete item is a link to the relevant page.
- "Complete all steps to earn your Analyst certification badge" — cosmetic motivation.
- Card has a dismiss/minimize button (stores in localStorage). If dismissed, show a small "Resume onboarding (X/6)" link instead.
- When all done: briefly show a congratulations card with a gold badge animation, then hide the onboarding section permanently.

---

## 8. NOTIFICATION SYSTEM — TOAST + EMAIL

### Toast notifications (customer app):

- Create a `ToastProvider` component wrapping the app. Renders toasts in bottom-right corner.
- `useToast()` hook: `toast({ text, type, duration })`.
- Trigger toasts on key events:
  - After analyst submit: "Commission earned: +$4.60" (success toast)
  - After deposit submit: "Deposit submitted — pending review" (info toast)
  - After withdrawal submit: "Withdrawal request submitted" (info toast)
  - On balance change detected (compare previous me.balance vs new on refresh): "Balance updated: $1,240.00" (success toast)
  - After investment start: "Investment locked — Gold tier" (success toast)
- Toast design: dark card with gold accent, slides in from bottom-right, auto-dismisses after 4s, close button.

### Email lifecycle (backend):

- Expand `backend/utils/mailer.js` to support HTML email templates. Create a base template function that wraps content in Shein-branded HTML (dark background, gold accents, logo text, footer with company info + unsubscribe link).
- Send emails on these events (when SMTP/Resend is configured; silently skip in dev):
  - **Welcome** (on verify): "Welcome to Shein — Your analyst account is ready"
  - **Daily salary credited** (from accrual.js when salary > 0): "Daily earnings credited: +$230.00"
  - **Withdrawal status change**: "Your withdrawal of $500 is now [Under Review / Processing / Completed]"
  - **Deposit approved**: "Your deposit of $500 has been credited"
  - **Investment payout**: "Weekly investment return: +$150.00"
- Each email has an anti-phishing line: "Your security phrase: [user's antiPhishCode]" (see Security section below).

---

## 9. SECURITY DEPTH

### Backend — User model additions:
```
antiPhishCode: String,          // user-set phrase shown in all emails
withdrawalWhitelist: [{
  chain: String,
  address: String,
  label: String,
  addedAt: Date,
  active: Boolean,              // 24h hold: addedAt + 24h before active=true
}],
twoFactorEnabled: { type: Boolean, default: false },
twoFactorSecret: String,       // TOTP secret (base32)
loginAlerts: { type: Boolean, default: true },
```

### New features:

- **Anti-phishing code**: `POST /api/me/anti-phish { code }`. User sets a personal word/phrase. Shown in all platform emails. Security page has a section to set/change it.
- **Withdrawal address whitelist**:
  - `POST /api/me/payout-wallet` already exists — modify to set `active: false` and `addedAt: now` on new addresses.
  - Withdrawals to an address with `active: false` are rejected: "This withdrawal address is in a 24-hour security hold. Please wait until [time]."
  - Show the hold status on the withdraw page and in the payout wallet list on profile.
- **Login alerts**: When `loginAlerts` is true and a new LoginHistory entry is created, send email: "New login detected — [IP], [Browser], [Time]. If this wasn't you, change your password immediately."
- **Session management**: New route `GET /api/me/sessions` — returns recent LoginHistory entries formatted as "active sessions". `POST /api/me/sessions/revoke-all` — invalidates all tokens (change a `tokenVersion` field on User; auth middleware checks it).

### Customer security page (`customer/app/security/page.js`) — expand:

- **Anti-phishing code** section: Input to set code, explanation: "This phrase appears in every email from Shein, proving the email is genuine."
- **Withdrawal address whitelist** section: List of saved addresses with status (Active / 24h Hold with countdown). Explanation: "New addresses have a 24-hour security hold for your protection."
- **Login alerts** toggle: "Receive email when a new device signs in"
- **Active sessions** section: List showing device/browser, IP, last active time. "Sign out all other devices" button.
- **Two-factor authentication** section: Toggle to enable/disable. Show QR code for TOTP setup using `otpauth://` URI. Verify with a confirmation code before enabling. (Use `otplib` npm package.)

---

## 10. DASHBOARD TIMERS & LIVE DATA

### Customer dashboard additions:

- **Next salary countdown**: Show "Next salary credit in: 14h 23m" — calculate from `me.lastSalaryAt + 24h - now`. Visual circular progress or simple countdown text.
- **Investment live card** (if user has active investment): Show on dashboard as a compact card:
  - "Gold Tier / $5,000 locked"
  - "Weekly return: $500 / Next payout in 3d 14h"
  - Mini progress bar for the week
- **Portfolio growth chart**: Simple line chart showing balance over time. Backend route `GET /api/me/balance-history` — derive from Transaction history: replay transactions chronologically to build balance-over-time points. Return last 30 data points. Use a lightweight inline SVG chart (no heavy charting library — draw the SVG path manually).

---

## 11. ANNOUNCEMENTS / NEWS

### Backend:

- New model `Announcement`: `{ title, body, type: enum["news", "update", "maintenance", "promotion"], pinned: Boolean, publishedAt: Date, active: Boolean }`
- Admin CRUD routes under `/api/admin/announcements`.
- Public route `GET /api/announcements` (authenticated) — returns active announcements sorted by pinned desc, publishedAt desc. Limit 20.

### Customer app:

- Show pinned announcement as a **banner** at the top of the dashboard (dismissable per-session via sessionStorage).
- Add an **Announcements** section on the dashboard below the activity feed. Card with latest 3-5 announcements. Each shows title, date, type badge. Click expands the body.

### Admin dashboard:

- New "Announcements" page. CRUD table. Columns: Title, Type, Published, Pinned, Active. Create/edit form with title, body (plain text), type dropdown, pinned toggle.

---

## 12. MENTOR ENHANCEMENTS

### Mentor availability status:

- Add fields to Mentor model: `status: enum["online", "away", "offline"]`, `lastSeenAt: Date`.
- Backend cron-like logic (or computed on read): Rotate mentor status on a schedule. During `personaActiveHours`: cycle between "online" (60% of time) and "away" (40%). Outside hours: "offline".
- Show status dot on mentor cards: green = online, yellow = away, gray = offline.
- Show "Last seen 2h ago" when offline.

### Mentor auto-reply:

- When a user sends a message in a mentor room and there are no mentor-type messages in the last 4 hours, auto-post a reply from the mentor persona after a random 2-8 minute delay:
  - "Thanks for your message! I'll review this shortly."
  - "Good question — let me look into that for you."
  - "I'm reviewing your portfolio. Give me a moment."
  - Store these as mentor-specific response templates.
- Use a mechanism similar to personaTick but for mentor rooms. New `mentorTick.js` utility.

---

## 13. LOADING STATES & MICRO-INTERACTIONS

### Global improvements across customer app:

- **Skeleton loaders**: Replace all "Loading..." text with skeleton placeholder components (gray pulsing rectangles matching the expected layout). Create a reusable `Skeleton` component: `<Skeleton className="h-6 w-32" />`.
- **Page transitions**: Add subtle fade-in on page mount. Already have `fadein` classes — ensure they're used consistently on every page's main content.
- **Balance counter animation**: When balance changes between refreshes, animate the number counting up/down over 1 second. Use a `CountUp` component that interpolates between old and new values.
- **Button loading states**: Every action button should show a spinner + disabled state while the request is in flight. Audit all pages for this.
- **Empty state illustrations**: Where lists are empty (no history, no messages, no investments), show a small SVG illustration + helpful text + CTA button pointing to the right action. Not just gray text.

---

## 14. SUPPORT AUTO-REPLY

### Backend (`backend/routes/support.js`):

- After a user sends their first message in a new support thread, auto-create a system reply after a 3-second delay (or on next GET):
  - "Thank you for contacting Shein Support. Your ticket #[auto-generated 6-digit number] has been created. A support specialist will respond within 24 hours. For urgent matters, email support@shein-global.com."
- Add admin setting `supportAutoReplyEnabled` (default true) and `supportAutoReplyText` (editable template with `{ticketNumber}` placeholder).

---

## 15. REFERRAL PAGE IMPROVEMENTS

### Customer referral page:

- Add **share buttons**: WhatsApp, Telegram, Copy Link — each pre-fills a message: "Join Shein and earn with me! Use my code [CODE] for a $20 signup bonus. [link]"
- Show **referral earnings total**: Sum of all `referral_bonus` transactions. "Total earned from referrals: $XX"
- Add a **how it works** section:
  1. Share your unique code
  2. Friend signs up and verifies email
  3. You both earn $10 bonus
- Show **tier rewards** (cosmetic for now): "Invite 5 friends: Silver Referrer badge / Invite 20 friends: Gold Referrer badge"

---

## Implementation Order (suggested)

Implement in this sequence for maximum incremental value:

1. **Legal pages + Footer** (static, fast, huge legitimacy boost)
2. **Analyst task depth** (structured form, cooldown, quality score, market brief)
3. **Activity feed + live stats on dashboard**
4. **Financial flow depth** (withdrawal stages, fee breakdown, QR codes, balance split)
5. **Toast notifications**
6. **Community improvements** (expanded persona lines/scripts, typing indicator, online count, reactions)
7. **Onboarding checklist**
8. **KYC / Verification levels**
9. **Security depth** (anti-phishing, whitelist, session management)
10. **Announcements system**
11. **Mentor enhancements**
12. **Loading states & skeleton loaders**
13. **Dashboard timers & charts**
14. **Support auto-reply**
15. **Referral improvements**
16. **Email lifecycle**

Each step should be a working commit. Test each feature before moving to the next.

---

## Hard Rules

- **Hannan's original spec is law.** 27 products per cycle, 3 levels, 7 invest tiers, 4 mentors, mentor is one-time pick, admin controls everything. Do not change these numbers or mechanics.
- **Existing admin controls remain.** Every new feature that has tuneable values must be admin-configurable via the Settings system (key/value in `Setting` collection).
- **No external API dependencies** for core features. QR code generation via npm package is fine. No third-party analytics, no external CDNs for runtime features.
- **Mobile-first.** Every new UI element must work on the existing mobile bottom nav layout. Test at 375px width.
- **Match existing design language.** Use the established CSS classes: `card`, `btn-gold`, `btn-outline`, `field`, `label`, `stat`, `chip`, `fadein`, `font-display`, `text-gold`, `text-cream`, `bg-ink`, `bg-ink2`, `border-line`, `gold-grad`. Do not introduce a new design system.
- **Incremental.** Each feature should work independently. No feature should break if another isn't implemented yet.
- **Backend-first.** Both Next.js apps are plain fetch clients. Build the API, then the UI.
- **Mongoose defaults safe.** New fields must have defaults so old documents keep working without migration.
- **Preserve the role/isAdmin pre-save hook** on User model.
- **Admin endpoints** are already gated by `auth` + `admin` middleware — do not re-add auth.
- Normal prose in code, comments, commits, PRs, docs. Commit each feature on its own branch off `main`.
