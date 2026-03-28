# Deploying The Backend

This service is ready to deploy as a standalone Node.js app from the `server` folder.

## Recommended platforms

- Render
- Railway
- Any Docker host

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

If this folder is the repo root:

1. Create a new Web Service.
2. Point Render to this repository.
3. Use `npm ci` as the build command.
4. Use `npm start` as the start command.
5. Set the health check path to `/api/health`.
6. Add the environment variables from `.env.example`.

You can also deploy with the included `render.yaml`.

## Railway

1. Create a new project from the repository.
2. Set the root directory to `server` if your repo root is one level above this folder.
3. Railway should detect Node automatically.
4. Set the start command to `npm start` if it does not auto-detect it.
5. Add the environment variables from `.env.example`.

## Docker

Build and run locally:

```bash
docker build -t golf-charity-backend .
docker run --env-file .env -p 5000:5000 golf-charity-backend
```

## Production notes

- The health endpoint is `GET /api/health`.
- The API listens on `PORT`, which most platforms inject automatically.
- Uploaded files are stored on the local filesystem. On many cloud platforms, that storage is ephemeral, so uploaded files may disappear after redeploys or restarts. For long-term persistence, move uploads to object storage such as S3, Cloudinary, or Supabase Storage.
- If your frontend is hosted on a different domain, make sure `CLIENT_URL` is set to the exact frontend origin.
- Stripe webhooks must be pointed at `https://your-api-domain/api/subscriptions/webhook` unless you change `STRIPE_WEBHOOK_PATH`.
