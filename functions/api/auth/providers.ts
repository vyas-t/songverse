import { json } from '../../_shared/http';
import { SupabaseEnv } from '../../_shared/supabase';

export function onRequestGet(context: { env: SupabaseEnv }): Response {
  const env = context.env;
  const googleClientId = (env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const appleClientId = (env.APPLE_CLIENT_ID || env.VITE_APPLE_CLIENT_ID || '').trim();
  const appleConfigured = Boolean(appleClientId && env.APPLE_TEAM_ID && env.APPLE_KEY_ID);
  return json({
    google: {
      id: 'google', name: 'Google', configured: Boolean(googleClientId),
      clientId: googleClientId || undefined,
      missingEnvVars: googleClientId ? [] : ['GOOGLE_CLIENT_ID'],
      setupInstructions: ['Enable Google as a provider in Supabase Auth and configure its OAuth client and callback URL.']
    },
    apple: {
      id: 'apple', name: 'Apple', configured: appleConfigured,
      clientId: appleConfigured ? appleClientId : undefined,
      missingEnvVars: [
        ...(!appleClientId ? ['APPLE_CLIENT_ID'] : []),
        ...(!env.APPLE_TEAM_ID ? ['APPLE_TEAM_ID'] : []),
        ...(!env.APPLE_KEY_ID ? ['APPLE_KEY_ID'] : [])
      ],
      setupInstructions: ['Enable Apple as a provider in Supabase Auth and configure the Services ID, key, and callback URL.']
    }
  });
}
