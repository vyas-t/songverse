import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  KeyRound,
  Check,
  ChevronLeft
} from 'lucide-react';
import { authService, AuthState, AuthView } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // 6-digit OTP Form states
  const [otpInput, setOtpInput] = useState('');
  const [resetOtpInput, setResetOtpInput] = useState('');

  useEffect(() => {
    return authService.subscribe((state) => {
      setAuthState(state);
      if (state.pendingEmail && !email) {
        setEmail(state.pendingEmail);
      }
    });
  }, [email]);

  if (!isOpen) return null;

  // Password validation helpers
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSwitchView = (view: AuthView) => {
    setLocalError(null);
    authService.clearError();
    authService.setAuthView(view);
  };

  const handlePlayAsGuest = () => {
    authService.playAsGuest();
    onSuccess();
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    try {
      await authService.signInWithGoogleOAuth();
    } catch (err: any) {
      setLocalError(err.message || 'Failed to start Google sign-in.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    try {
      await authService.signInWithEmail({ email, password });
      onSuccess();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Login failed.');
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!agreeTerms) {
      setLocalError('Please agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setLocalError('Please meet all password security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const result = await authService.registerWithEmail({
        displayName,
        email,
        password,
        confirmPassword
      });

      if (!result.requiresVerification) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const clean = otpInput.trim();
    if (clean.length !== 6) {
      setLocalError('Please enter the full 6-digit verification code.');
      return;
    }

    try {
      await authService.verifySignInOtp(clean);
      onSuccess();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'OTP verification failed.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Please enter your email address to receive a 6-digit password reset code.');
      return;
    }

    try {
      await authService.requestPasswordReset(email);
    } catch (err: any) {
      setLocalError(err.message || 'Password reset request failed.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanOtp = resetOtpInput.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setLocalError('Mandatory 6-digit security OTP is required.');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setLocalError('Password must be at least 8 characters with letters and numbers.');
      return;
    }

    if (!passwordsMatch) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      await authService.resetPasswordWithOtp({
        email: email || authState.pendingEmail || '',
        otp: cleanOtp,
        newPassword: password,
        confirmPassword
      });
    } catch (err: any) {
      setLocalError(err.message || 'Password update failed.');
    }
  };

  const handleResendVerification = async () => {
    setLocalError(null);
    const target = (authState.pendingEmail || email).trim();
    if (!target) {
      setLocalError('Please enter your email address to resend verification.');
      return;
    }
    try {
      await authService.resendVerificationEmail(target);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend code.');
    }
  };

  const activeError = localError || authState.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="bg-white dark:bg-sv-midnight border border-slate-200/90 dark:border-sv-burgundy/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative my-auto text-slate-900 dark:text-slate-100 transition-all duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer focus:outline-none"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =========================================================================
            VIEW 1: SIGN IN (LOGIN)
           ========================================================================= */}
        {authState.authView === 'login' && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 bg-gradient-to-tr from-sv-red via-sv-red-orange to-sv-gold text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Shield className="w-6 h-6" />
              </div>
              <h2 id="auth-modal-title" className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Sign in to sync your score, climb leaderboards, and enter multiplayer rooms.
              </p>
            </div>

            {/* Error & Success Alerts */}
            {activeError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-relaxed">{activeError}</span>
              </div>
            )}
            {authState.successNotice && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-relaxed">{authState.successNotice}</span>
              </div>
            )}

            {/* Continue with Google */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authState.isLoading}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-sv-burgundy/80 w-full" />
              <span className="bg-white dark:bg-sv-midnight px-3 text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold absolute">
                or sign in with email
              </span>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSwitchView('forgot_password')}
                    className="text-[11px] font-semibold text-sv-red dark:text-sv-gold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authState.isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-sv-red/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authState.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Register */}
            <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchView('register')}
                  className="font-bold text-sv-red dark:text-sv-gold hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </p>
            </div>

            {/* Guest Option */}
            <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Prefer playing instantly?
                </div>
                <div className="text-[11px] text-slate-500">
                  Guest mode requires zero sign-in or setup.
                </div>
              </div>
              <button
                type="button"
                onClick={handlePlayAsGuest}
                className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0"
              >
                Guest Mode
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: REGISTRATION (SIGN UP)
           ========================================================================= */}
        {authState.authView === 'register' && (
          <div className="space-y-4">
            <div className="text-center space-y-1 pt-1">
              <div className="w-12 h-12 bg-gradient-to-tr from-sv-red via-sv-red-orange to-sv-gold text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Create Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Join SongVerse with verified email registration.
              </p>
            </div>

            {/* Error Alert */}
            {activeError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-relaxed">{activeError}</span>
              </div>
            )}

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authState.isLoading}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign up with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-sv-burgundy/80 w-full" />
              <span className="bg-white dark:bg-sv-midnight px-3 text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold absolute">
                or with email and password
              </span>
            </div>

            <form onSubmit={handleEmailRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={30}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. MelodyMaster"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password security check indicator */}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasMinLength ? 'opacity-100' : 'opacity-40'}`} />
                    8+ chars
                  </span>
                  <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasLetter ? 'opacity-100' : 'opacity-40'}`} />
                    Letters
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                    <Check className={`w-3 h-3 ${hasNumber ? 'opacity-100' : 'opacity-40'}`} />
                    Numbers
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div className={`mt-1 text-[10px] font-semibold ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-sv-red focus:ring-sv-red cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  I agree to the SongVerse Terms of Service and Privacy Policy. Mandatory email verification is required.
                </label>
              </div>

              <button
                type="submit"
                disabled={authState.isLoading || !passwordsMatch || !hasMinLength}
                className="w-full py-2.5 bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-sv-red/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authState.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchView('login')}
                  className="font-bold text-sv-red dark:text-sv-gold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: MANDATORY 6-DIGIT OTP VERIFICATION
           ========================================================================= */}
        {authState.authView === 'verification_pending' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-sv-amber/20 to-sv-gold/30 border border-sv-gold/40 text-sv-amber rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <KeyRound className="w-7 h-7 text-sv-warm-orange" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Enter 6-Digit OTP
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                A 6-digit verification code has been issued for{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{authState.pendingEmail || email}</strong>.
              </p>
            </div>

            {/* Email Inbox Notice Card */}
            <div className="p-3.5 bg-gradient-to-r from-sv-red/10 via-sv-warm-orange/15 to-sv-gold/10 border border-sv-warm-orange/30 rounded-2xl flex items-start gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-sv-red/10 flex items-center justify-center shrink-0 mt-0.5 text-sv-red">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Check your email inbox
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  We've sent a 6-digit code to <span className="font-semibold text-slate-900 dark:text-white">{authState.pendingEmail || email}</span>. Please check your inbox (and spam/junk folder) and enter it below.
                </p>
              </div>
            </div>

            {/* Error or Success Notice */}
            {activeError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-300 text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{activeError}</span>
              </div>
            )}
            {authState.successNotice && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 text-left flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{authState.successNotice}</span>
              </div>
            )}

            {/* 6-Digit Input Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full max-w-xs mx-auto py-3 px-4 text-center font-mono text-2xl font-black tracking-[0.4em] bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sv-red focus:ring-2 focus:ring-sv-red/30 shadow-inner"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={authState.isLoading || otpInput.trim().length !== 6}
                className="w-full py-3 bg-gradient-to-r from-sv-red to-sv-orange hover:from-sv-crimson hover:to-sv-red text-white font-black rounded-xl text-xs shadow-md shadow-sv-red/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authState.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP & Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={authState.isLoading || authState.resendCooldownSeconds > 0}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authState.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Code...</span>
                  </>
                ) : authState.resendCooldownSeconds > 0 ? (
                  <span>Resend Code in {authState.resendCooldownSeconds}s</span>
                ) : (
                  <span>Resend 6-Digit Code</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="w-full py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 4: EMAIL CONFIRMED SUCCESS
           ========================================================================= */}
        {authState.authView === 'verified_success' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Email Verified!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Your SongVerse account is fully verified. Your profile, stats, and achievements will now be persistently saved.
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              You are signed in as <span className="font-bold">{authState.user.displayName}</span>.
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Yes — Continue to SongVerse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            VIEW 5: FORGOT PASSWORD
           ========================================================================= */}
        {authState.authView === 'forgot_password' && (
          <div className="space-y-4">
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Reset Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Enter your registered email address and we will send you a recovery link.
              </p>
            </div>

            {activeError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                {activeError}
              </div>
            )}
            {authState.successNotice && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                {authState.successNotice}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authState.isLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authState.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Link...</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 6: SET NEW PASSWORD WITH MANDATORY 6-DIGIT OTP
           ========================================================================= */}
        {authState.authView === 'reset_password' && (
          <div className="space-y-4">
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Reset Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Enter your mandatory 6-digit security OTP code and choose your new password.
              </p>
            </div>

            {/* Email Inbox Notice Card */}
            <div className="p-3 bg-gradient-to-r from-sv-amber/10 to-sv-gold/15 border border-sv-gold/40 rounded-2xl flex items-start gap-2.5 text-left">
              <Mail className="w-4 h-4 text-amber-600 dark:text-sv-gold shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                A 6-digit recovery code was dispatched to your email. Enter the code and your new password below.
              </p>
            </div>

            {activeError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                {activeError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory 6-Digit Security OTP
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtpInput}
                    onChange={(e) => setResetOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP code"
                    className="w-full pl-10 pr-3.5 py-2.5 font-mono text-sm tracking-widest font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (min 8 chars, letter + number)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sv-red/30 focus:border-sv-red"
                />
              </div>

              <button
                type="submit"
                disabled={authState.isLoading || resetOtpInput.length !== 6 || !passwordsMatch || !hasMinLength}
                className="w-full py-2.5 bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-sv-red/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authState.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying OTP & Resetting...</span>
                  </>
                ) : (
                  <span>Verify OTP & Update Password</span>
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => handleSwitchView('login')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
