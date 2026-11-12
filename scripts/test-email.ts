/**
 * SongVerse Email Dispatch Verification Script
 * Usage: npx tsx scripts/test-email.ts your_email@gmail.com
 */

import nodemailer from 'nodemailer';
import 'dotenv/config';

async function main() {
  const targetEmail = process.argv[2] || process.env.GMAIL_USER;
  if (!targetEmail) {
    console.error('Usage: npx tsx scripts/test-email.ts <recipient_email>');
    console.error('Example: npx tsx scripts/test-email.ts studyonly1267@gmail.com');
    process.exit(1);
  }

  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || '').trim();

  const smtpHost = (process.env.SMTP_HOST || (gmailUser ? 'smtp.gmail.com' : '')).trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = (process.env.SMTP_USER || gmailUser).trim();
  const smtpPass = (process.env.SMTP_PASS || gmailPass).trim();

  console.log('\n====================================================');
  console.log('  SONGVERSE — EMAIL DISPATCH TEST');
  console.log('====================================================');
  console.log(`Target Recipient : ${targetEmail}`);
  console.log(`SMTP Host        : ${smtpHost || '(not set)'}`);
  console.log(`SMTP Port        : ${smtpPort}`);
  console.log(`SMTP User        : ${smtpUser || '(not set)'}`);
  console.log(`Password Configured: ${smtpPass ? 'YES' : 'NO'}\n`);

  if (!smtpUser || !smtpPass) {
    console.log('⚠️  Gmail/SMTP credentials not configured in .env yet.');
    console.log('To send real emails to your inbox via Gmail:');
    console.log('1. Go to https://myaccount.google.com/apppasswords');
    console.log('2. Create an App Password for SongVerse');
    console.log('3. Put GMAIL_USER="your@gmail.com" and GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx" in .env\n');
    process.exit(0);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    console.log('Connecting to SMTP server and verifying credentials...');
    await transporter.verify();
    console.log('✓ SMTP Connection Verified successfully!\n');

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Sending 6-digit OTP (${testOtp}) to ${targetEmail}...`);

    const info = await transporter.sendMail({
      from: `"SongVerse Security" <${smtpUser}>`,
      to: targetEmail,
      subject: `🔐 SongVerse: Your Test Verification Code is ${testOtp}`,
      html: `
        <div style="background-color: #0b0e14; color: #f8fafc; padding: 40px 16px; font-family: sans-serif; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #151a23; border: 1px solid #232d3f; border-radius: 16px; padding: 32px 24px;">
            <h1 style="color: #ea580c; margin: 0 0 8px;">🎵 SongVerse</h1>
            <p style="color: #94a3b8; font-size: 13px;">The Ultimate Music Trivia Arena</p>
            <h2 style="color: #ffffff; margin: 20px 0 10px;">Verification Code Test</h2>
            <p style="color: #94a3b8; font-size: 14px;">Your 6-digit SongVerse verification code is:</p>
            <div style="background: #0e121a; border: 2px dashed #f97316; border-radius: 14px; padding: 18px 24px; display: inline-block; margin: 16px 0;">
              <span style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #f97316;">${testOtp}</span>
            </div>
            <p style="color: #ea580c; font-size: 12px; font-weight: 700;">⏱ Valid for 10 minutes</p>
          </div>
        </div>
      `
    });

    console.log('✓ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Check inbox for ${targetEmail}!\n`);
  } catch (err: any) {
    console.error('✗ Failed to send email:', err.message);
  }
}

main();
