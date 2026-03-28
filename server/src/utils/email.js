import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined
    })
  : nodemailer.createTransport({ jsonTransport: true });

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    return;
  }

  const info = await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject,
    text,
    html
  });

  if (!env.smtpHost) {
    console.log('Email preview', info.message);
  }
};

export const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to Golf Charity Subscription Platform',
    text: `Hi ${user.name}, your account is ready. Your selected charity support journey starts now.`
  });

export const sendSubscriptionEmail = ({ user, plan, amount, endDate }) =>
  sendEmail({
    to: user.email,
    subject: 'Subscription activated',
    text: `Your ${plan} subscription is active. Amount: $${amount}. Access valid until ${new Date(endDate).toLocaleDateString()}.`
  });

export const sendCancellationEmail = ({ user, endDate }) =>
  sendEmail({
    to: user.email,
    subject: 'Subscription cancelled',
    text: `Your auto-renewal has been cancelled. Access remains available until ${endDate ? new Date(endDate).toLocaleDateString() : 'the current period ends'}.`
  });

export const sendPrizeProofReceivedEmail = ({ user, prize }) =>
  sendEmail({
    to: user.email,
    subject: 'Prize proof received',
    text: `We received your proof upload for your ${prize.matchCount}-match prize worth $${prize.amount.toFixed(2)}.`
  });

export const sendPrizeReviewEmail = ({ user, prize }) =>
  sendEmail({
    to: user.email,
    subject: 'Prize review updated',
    text: `Your prize review is now ${prize.verificationStatus}. Payout status: ${prize.payoutStatus}.`
  });

export const sendDrawPublishedEmail = ({ to, monthKey, winningNumbers }) =>
  sendEmail({
    to,
    subject: `Draw results published for ${monthKey}`,
    text: `The monthly draw for ${monthKey} is live. Winning numbers: ${winningNumbers.join(', ')}.`
  });
