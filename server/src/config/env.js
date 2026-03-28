import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/golf-charity-platform',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@golfcharity.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripeMonthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
  stripeYearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID || '',
  stripeWebhookPath: process.env.STRIPE_WEBHOOK_PATH || '/api/subscriptions/webhook',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@golfcharityplatform.local',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: process.env.SMTP_SECURE === 'true'
};
