/**
 * Deprecated compatibility shim. Security codes must be generated and verified by Supabase Auth.
 */
export interface SendOtpPayload {
  email: string;
  otp: string;
  purpose: 'signin' | 'signup' | 'password_reset' | 'account_deletion';
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  provider?: string;
}

class EmailService {
  public async sendOtpEmail(_payload: SendOtpPayload): Promise<SendOtpResponse> {
    return {
      success: false,
      error: 'Custom OTP delivery is disabled. Use the Supabase Auth verification or recovery flow.'
    };
  }
}

export const emailService = new EmailService();
