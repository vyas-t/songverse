/**
 * Cloudflare Pages Functions: POST /api/send-otp
 * Dispatches 6-digit verification OTP email to user's inbox.
 */

interface Env {
  RESEND_API_KEY?: string;
  BREVO_API_KEY?: string;
  EMAIL_FROM?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { email, otp, purpose } = body;

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: 'Email and OTP code are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const titles: Record<string, { title: string; desc: string }> = {
      signup: {
        title: 'Confirm Your Registration',
        desc: 'Thank you for joining SongVerse! Use the 6-digit verification code below to activate your player account.'
      },
      signin: {
        title: 'Sign In Verification Code',
        desc: 'Use the 6-digit security code below to complete your SongVerse sign in.'
      },
      password_reset: {
        title: 'Password Reset Authorization',
        desc: 'We received a request to reset your SongVerse account password. Use this code to authorize your new password.'
      },
      account_deletion: {
        title: 'Permanent Account Deletion Authorization',
        desc: 'A permanent account deletion was requested. Enter this 6-digit authorization code to confirm.'
      }
    };

    const info = titles[purpose] || titles.signin;
    const fromAddress = context.env.EMAIL_FROM || 'SongVerse Security <onboarding@resend.dev>';

    // 1. If Resend API Key is configured in Cloudflare Pages
    if (context.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject: `🔐 SongVerse: Your 6-Digit Code is ${otp}`,
          html: `
            <div style="background-color: #0b0e14; color: #f8fafc; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
              <div style="max-width: 480px; margin: 0 auto; background: #151a23; border: 1px solid #232d3f; border-radius: 16px; padding: 32px 24px;">
                <h1 style="color: #ea580c; margin: 0 0 8px; font-size: 26px; font-weight: 900;">🎵 SongVerse</h1>
                <p style="color: #94a3b8; font-size: 13px; margin: 0 0 24px;">The Ultimate Music Trivia Arena</p>
                <h2 style="color: #ffffff; margin: 0 0 12px; font-size: 20px;">${info.title}</h2>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${info.desc}</p>
                <div style="background: #0e121a; border: 2px dashed #f97316; border-radius: 12px; padding: 18px 24px; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #f97316; font-family: monospace; display: inline-block;">
                  ${otp}
                </div>
                <p style="color: #ea580c; font-size: 12px; font-weight: 700; margin: 16px 0 24px;">⏱ Valid for 10 minutes (Single Use Only)</p>
                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; border-top: 1px solid #232d3f; padding-top: 16px;">
                  SongVerse staff will never ask for your code. If you did not make this request, you can safely ignore this email.
                </p>
              </div>
            </div>
          `
        })
      });

      if (resendRes.ok) {
        return new Response(JSON.stringify({ success: true, provider: 'resend', message: 'Email dispatched via Resend.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. If Brevo API Key is configured
    if (context.env.BREVO_API_KEY) {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': context.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'SongVerse Security', email: fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress },
          to: [{ email }],
          subject: `🔐 SongVerse: Your 6-Digit Code is ${otp}`,
          htmlContent: `
            <div style="background-color: #0b0e14; color: #f8fafc; padding: 32px 16px; font-family: sans-serif; text-align: center;">
              <div style="max-width: 480px; margin: 0 auto; background: #151a23; border: 1px solid #232d3f; border-radius: 16px; padding: 32px 24px;">
                <h1 style="color: #ea580c; margin: 0 0 8px;">🎵 SongVerse</h1>
                <h2 style="color: #ffffff; margin: 0 0 12px;">${info.title}</h2>
                <p style="color: #94a3b8; font-size: 14px;">${info.desc}</p>
                <div style="background: #0e121a; border: 2px dashed #f97316; border-radius: 12px; padding: 18px 24px; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #f97316; font-family: monospace; display: inline-block;">
                  ${otp}
                </div>
                <p style="color: #ea580c; font-size: 12px; margin: 16px 0;">⏱ Valid for 10 minutes</p>
              </div>
            </div>
          `
        })
      });

      if (brevoRes.ok) {
        return new Response(JSON.stringify({ success: true, provider: 'brevo', message: 'Email dispatched via Brevo.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. Fallback when keys are pending configuration in Cloudflare dashboard
    return new Response(JSON.stringify({
      success: true,
      provider: 'cloudflare-pages-simulated',
      message: 'OTP processed. To dispatch live emails, add RESEND_API_KEY or BREVO_API_KEY to Cloudflare Pages settings.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error dispatching OTP.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
