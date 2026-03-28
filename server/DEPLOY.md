# Deploying The Backend

This backend is set up to deploy on Render as a standard Node.js web service from the `server` folder.

## Required environment variables

Set these before the first production boot:

- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Optional environment variables

Set these only if you use the related features:

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, `STRIPE_WEBHOOK_PATH`
- Email: `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`
- Uploads: `UPLOAD_DIR`

## Render

This repository includes a root-level `render.yaml` for the simplest setup.

1. Push this repo to GitHub.
2. In Render, create a new Blueprint instance or new Web Service from the repository.
3. If you create the service manually, set the root directory to `server`.
4. Use `npm ci` as the build command.
5. Use `npm start` as the start command.
6. Set the health check path to `/api/health`.
7. Add the environment variables listed above.

## Production notes

- The health endpoint is `GET /api/health`.
- The API listens on `PORT`, which most platforms inject automatically.
- Uploaded files are stored on the local filesystem. On many cloud platforms, that storage is ephemeral, so uploaded files may disappear after redeploys or restarts. For long-term persistence, move uploads to object storage such as S3, Cloudinary, or Supabase Storage.
- If your frontend is hosted on a different domain, make sure `CLIENT_URL` is set to the exact frontend origin.
- Stripe webhooks must be pointed at `https://your-api-domain/api/subscriptions/webhook` unless you change `STRIPE_WEBHOOK_PATH`.
