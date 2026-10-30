# SongVerse — Supabase Authentication & Email Configuration Guide

This directory contains the production-ready email templates for SongVerse.

---

## 1. Confirm Signup Template (The "Yes" Button)

To update your email confirmation template in Supabase:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your SongVerse project.
3. In the left navigation, navigate to **Authentication** > **Email Templates**.
4. Select the **Confirm signup** tab.
5. In **Subject**, enter:  
   `Confirm your SongVerse account`
6. In **Body**, replace the entire contents with the HTML code from:  
   [`supabase/templates/confirm_signup.html`](./confirm_signup.html)
7. Click **Save Changes**.

---

## 2. Supabase URL Configuration (Prevent Localhost Links)

To ensure confirmation emails always link to your live site (`https://songverse.pages.dev`) rather than localhost:

1. In your Supabase Dashboard, go to **Authentication** > **URL Configuration**.
2. Set **Site URL** to:  
   `https://songverse.pages.dev`
3. Under **Redirect URLs**, add the following allowlisted URLs:
   - `https://songverse.pages.dev/**`
   - `https://songverse.pages.dev/auth/callback`
   - `https://songverse.pages.dev/auth/reset-password`
   - `http://localhost:5173/**` (for local development testing)
   - `http://localhost:3000/**`
4. Click **Save Changes**.

> **Note**: SongVerse's client code automatically passes `https://songverse.pages.dev/auth/callback` whenever a user registers, so even if registrations happen on local environments or user devices, the verification link in the email will always point to the production live site.
