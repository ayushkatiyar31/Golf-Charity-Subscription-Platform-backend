# Backend Interview Notes - Golf Charity Subscription Platform

## 1. One-Line Project Explanation

This backend powers a golf charity subscription platform where users register, choose a charity, subscribe through Stripe, submit golf scores, participate in monthly prize draws, donate to charities, and upload proof for prize payouts, while admins manage users, charities, draw results, analytics, and prize verification.

## 2. Tech Stack

- Runtime: Node.js 20+
- Framework: Express.js
- Database: MongoDB with Mongoose ODM
- Authentication: JWT with support for both `Authorization: Bearer <token>` and an HTTP-only `auth_token` cookie
- Password security: `bcryptjs` hashing through a Mongoose pre-save hook
- Payments: Stripe Checkout subscriptions and Stripe webhooks
- File uploads: Multer disk storage for prize proof images
- Emails: Nodemailer, with JSON preview transport when SMTP is not configured
- Logging and middleware: Morgan, CORS, cookie-parser, Express JSON/urlencoded parsers
- Deployment: Render Blueprint via root-level `render.yaml`

## 3. High-Level Architecture

- `src/server.js`: Express entry point, middleware setup, route mounting, static uploads, health endpoint, and database connection
- `src/routes`: Defines API endpoints and applies route-level middleware
- `src/controllers`: Contains business logic for auth, charities, subscriptions, users, and admins
- `src/models`: Mongoose schemas for users, charities, donations, draws, prizes, plans, subscriptions, and payments
- `src/middleware`: Authentication, admin authorization, subscription refresh/checking, and error handling
- `src/utils`: Shared helpers for JWTs, Stripe, email, uploads, draw logic, subscription syncing, and default plans
- `src/data`: Seed script and default charity/plan data

## 4. Server Startup Flow

1. Environment variables are loaded in `src/config/env.js`.
2. Upload directory is created if it does not exist.
3. Express app is configured with CORS, cookies, logging, parsers, and static `/uploads` serving.
4. JSON parsing is skipped only for the Stripe webhook route because Stripe requires the raw request body for signature verification.
5. Routes are mounted under `/api/auth`, `/api/charities`, `/api/subscriptions`, `/api`, and `/api/admin`.
6. Global error handler returns JSON errors.
7. MongoDB connection is established through Mongoose before the server starts listening.

## 5. Main API Areas

- Auth routes: register, login, logout, and current-user lookup
- Charity routes: list/search charities, get featured charity, get charity by slug, and admin CRUD
- Subscription routes: status, Stripe checkout creation, checkout confirmation, cancellation, independent donations, and Stripe webhook
- User routes: dashboard, preferences, scores, prizes, proof upload, published draws, and admin draw preview/publish
- Admin routes: analytics, user management, pending proof listing, and prize review

## 6. Authentication And Authorization

- Registration validates name, email, password, contribution percentage, and optional selected charity.
- User email is normalized to lowercase.
- Passwords are hashed automatically in the `User` model before save.
- Login compares the submitted password using `user.matchPassword`.
- JWTs contain `userId` and expire in 7 days.
- The token is returned in JSON and also stored in an HTTP-only cookie.
- `protect` middleware accepts token from either bearer header or cookie, verifies it, loads the user, and attaches it to `req.user`.
- `adminOnly` middleware checks `req.user.role === 'admin'`.

## 7. Database Models

- `User`: name, email, hashed password, role, selected charity, contribution percentage, independent donation total, last five golf scores, and a subscription snapshot
- `Charity`: name, slug, category/cause, location, website, image, featured flag, descriptions, impact metric, and tags
- `Donation`: user, charity, amount, type (`subscription_share` or `independent`), note, and unique optional reference key
- `Plan`: monthly/yearly subscription plans, price, currency, duration, benefits, Stripe price ID, active/default flags
- `SubscriptionRecord`: detailed subscription state from Stripe/mock provider, status, period dates, provider IDs, cancellation flags, and webhook metadata
- `PaymentTransaction`: separate payment history for initial payments, renewals, failures, refunds, provider IDs, amount, currency, and timestamps
- `Draw`: monthly draw result, winning numbers, pool amounts, rollover amounts, entries, and publication status
- `Prize`: links a user to a draw with match count, prize amount, proof image, verification status, payout status, review notes, and review timestamp

## 8. Subscription And Stripe Flow

1. User chooses a plan and optionally a charity.
2. Backend ensures default plans exist and validates the selected plan.
3. Backend checks that Stripe environment variables and price IDs are configured.
4. A Stripe Checkout subscription session is created with user/plan/charity metadata.
5. A pending `PaymentTransaction` is stored.
6. When checkout completes, the backend confirms the session or receives `checkout.session.completed` via webhook.
7. A `SubscriptionRecord` is upserted from Stripe subscription data.
8. A paid `PaymentTransaction` is created or updated.
9. A donation record is created for the user's charity using their contribution percentage.
10. `syncUserSubscriptionSnapshot` updates the lightweight `user.subscription` object for fast dashboard/draw checks.

## 9. Stripe Webhook Handling

- The webhook route uses `express.raw({ type: 'application/json' })`.
- `constructWebhookEvent` verifies the Stripe signature using `STRIPE_WEBHOOK_SECRET`.
- `checkout.session.completed` activates subscription and records payment.
- `invoice.paid` handles renewals and extends period dates.
- `invoice.payment_failed` marks subscription as `past_due`.
- `customer.subscription.updated` and `customer.subscription.deleted` synchronize cancellation, expiration, and auto-renew state.

## 10. Charity And Donation Logic

- Default charities are ensured when listing or fetching charities.
- Users can choose a charity during registration or update it later in preferences.
- A minimum contribution percentage of 10% is enforced.
- Subscription donations are calculated as `plan.price * contributionPercentage / 100`.
- Independent donations can also be recorded separately.
- Charity detail endpoint aggregates total donation amount and count with MongoDB aggregation.

## 11. Draw And Prize Logic

- Users submit golf score values from 1 to 45.
- Only the latest five scores are kept per user.
- Admin can preview or publish a monthly draw.
- Draw winning numbers can be random or algorithmic based on score frequency.
- Only users with active subscription snapshots are included in draw eligibility.
- Prize tiers are based on matching 3, 4, or 5 numbers.
- Prize pool splits are 40% for 5 matches, 35% for 4 matches, and 25% for 3 matches.
- If nobody gets 5 matches, that 5-match pool rolls over to the next draw.
- Publishing a draw creates `Prize` documents and emails active subscribers.

## 12. Prize Proof And Admin Review

- Users can upload proof for their own prize using Multer.
- Uploaded files are saved locally and served under `/uploads`.
- Prize proof status becomes `pending` after upload.
- Admins can review proof, set verification status, set payout status, and add review notes.
- Review updates trigger email notifications.

## 13. Admin Features

- Admin routes are protected by `protect`, `refreshSubscription`, and `adminOnly`.
- Admin dashboard analytics include total subscribers, total prize pool, total charity contributions, total draws, and payout stats.
- Admin can list/update users.
- Admin can list all proof records and review prizes.
- Admin draw controls are in user routes but protected with `adminOnly`.

## 14. Error Handling And Reliability

- `asyncHandler` wraps async controllers so errors go to Express error middleware.
- `createError` standardizes HTTP status and message.
- `errorHandler` returns JSON `{ message }`.
- Stripe configuration is validated before creating checkout sessions.
- Subscription snapshots are refreshed on protected requests to keep user state current.
- Donation reference keys prevent duplicate subscription donation records for the same Stripe checkout or manual subscription.

## 15. Deployment Notes

- `render.yaml` configures a Render web service with `rootDir: server`, `npm ci`, `npm start`, and `/api/health`.
- Required production variables include `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `APP_URL`.
- Stripe variables are needed for live payments and webhooks.
- SMTP variables are optional; without SMTP the app logs email previews.
- Local file uploads are simple but can be ephemeral on cloud hosting, so object storage would be better for production.

## 16. How To Explain Request Flow In Interview

Example: user subscription flow

1. The frontend sends an authenticated request to create a checkout session.
2. Auth middleware verifies the JWT and attaches the user to the request.
3. Subscription middleware refreshes the user's current subscription state.
4. Controller validates the plan and selected charity.
5. Stripe helper creates a checkout session.
6. Backend stores a pending transaction and returns Stripe redirect URL.
7. Stripe later sends a webhook after payment.
8. Webhook verifies signature, updates subscription, records payment, creates charity contribution, and syncs the user subscription snapshot.

Example: monthly draw flow

1. Admin calls preview or publish draw.
2. Backend loads users and latest rollover from previous published draw.
3. Draw engine chooses winning numbers using random or algorithmic mode.
4. Active subscribers with scores are evaluated for matches.
5. Prize pool and rollover are calculated.
6. Publishing saves the draw, recreates related prize records, and emails active subscribers.

## 17. Strengths To Mention

- Clear separation of concerns between routes, controllers, models, middleware, and utilities.
- Secure authentication with password hashing, JWT expiry, and HTTP-only cookie support.
- Stripe webhook design correctly preserves raw body for signature verification.
- Payment records are separated from subscription records, which improves auditability.
- User subscription snapshot makes eligibility checks simpler and faster.
- Admin functionality is protected with dedicated middleware.
- Default plans and charities help the app bootstrap cleanly.
- Deployment configuration and health check are already prepared for Render.

## 18. Improvements You Can Mention If Asked

- Move uploaded prize proof images from local disk to cloud object storage.
- Add automated tests for auth, Stripe webhook flows, draw logic, and admin routes.
- Add stronger upload validation such as file type and size limits.
- Add request validation middleware such as Zod/Joi/express-validator.
- Add rate limiting for auth routes.
- Add pagination for admin user lists and proof lists.
- Add structured logging and monitoring for production.
- Consider a job queue for sending emails and processing webhook side effects.

## 19. Short Interview Pitch

I built the backend using Express and MongoDB with a feature-based structure. The main flow is that users register, choose a charity, subscribe through Stripe, and then become eligible for monthly golf-score-based prize draws. I used JWT authentication with HTTP-only cookie support, Mongoose models for users, charities, donations, subscriptions, payments, draws, and prizes, and middleware to centralize auth, admin checks, subscription refresh, and error handling. Stripe Checkout handles subscription payments, and webhooks keep subscription records, payment transactions, and donation contributions in sync. Admins can manage users, charities, analytics, prize proof reviews, and monthly draw publishing. The backend is also deployable on Render with environment-based configuration and a health check endpoint.
