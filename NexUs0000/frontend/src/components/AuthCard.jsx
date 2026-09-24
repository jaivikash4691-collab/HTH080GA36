import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export const AuthCard = ({ onSuccess }) => {
  const {
    authMode,
    setAuthMode,
    authError,
    setAuthError,
    authSuccess,
    setAuthSuccess,
    loading,
    login,
    register,
    forgotPassword,
  } = useAuth();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const strengthColors = ['#CBD5E1', '#E11D48', '#D97706', '#0D9488', '#1E1B4B'];

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok && onSuccess) {
      onSuccess();
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match. Please verify.');
      return;
    }
    const ok = await register(name, email, password, confirmPassword);
    if (ok) {
      // Clear registration passwords
      setPassword('');
      setConfirmPassword('');
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    await forgotPassword(email);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-xl relative backdrop-blur-md animate-fade-in-up">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#1E1B4B] text-white font-black text-xl flex items-center justify-center mx-auto shadow-sm">
          N
        </div>
        <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
          {authMode === 'login'
            ? 'Sign in to NEXUS'
            : authMode === 'register'
            ? 'Create Researcher Account'
            : 'Reset Password'}
        </h2>
        <p className="text-xs text-[#64748B]">
          {authMode === 'login'
            ? 'Access your isolated multi-paper literature intelligence sessions'
            : authMode === 'register'
            ? 'Start your personalized research intelligence workspace'
            : 'Enter your email to receive recovery instructions'}
        </p>
      </div>

      {/* Global Error Banner */}
      {authError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span className="font-medium leading-relaxed">{authError}</span>
        </div>
      )}

      {/* Global Success Banner */}
      {authSuccess && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span className="font-medium leading-relaxed">{authSuccess}</span>
        </div>
      )}

      {/* LOGIN FORM */}
      {authMode === 'login' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A]">Academic Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@university.edu"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#CBD5E1] focus:border-[#1E1B4B] focus:ring-1 focus:ring-[#1E1B4B] outline-none transition-all placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Password</label>
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthSuccess('');
                  setAuthMode('forgot');
                }}
                className="text-[11px] font-semibold text-[#0D9488] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-[#CBD5E1] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1E1B4B] dark:focus:border-[#2563EB] focus:ring-1 focus:ring-[#1E1B4B] dark:focus:ring-[#2563EB] outline-none transition-all placeholder:text-[#94A3B8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E1B4B] dark:hover:text-white transition-colors cursor-pointer p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1E1B4B] hover:bg-[#2A2663] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 text-center border-t border-[#E2E8F0]">
            <p className="text-xs text-[#64748B]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthSuccess('');
                  setAuthMode('register');
                }}
                className="font-bold text-[#1E1B4B] hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </p>
          </div>
        </form>
      )}

      {/* REGISTER FORM */}
      {authMode === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A]">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Elena Vance"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#CBD5E1] focus:border-[#1E1B4B] focus:ring-1 focus:ring-[#1E1B4B] outline-none transition-all placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A]">Academic Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@university.edu"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#CBD5E1] focus:border-[#1E1B4B] focus:ring-1 focus:ring-[#1E1B4B] outline-none transition-all placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Password (min. 6 characters)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-[#CBD5E1] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1E1B4B] dark:focus:border-[#2563EB] focus:ring-1 focus:ring-[#1E1B4B] dark:focus:ring-[#2563EB] outline-none transition-all placeholder:text-[#94A3B8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E1B4B] dark:hover:text-white transition-colors cursor-pointer p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength meter */}
            {password && (
              <div className="pt-1.5 space-y-1">
                <div className="h-1.5 w-full bg-[#E2E8F0] dark:bg-[#334155] rounded-full overflow-hidden flex">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className="h-full flex-1 transition-all duration-300"
                      style={{
                        backgroundColor: step <= strength ? strengthColors[strength] : 'transparent',
                        borderRight: step < 4 ? '1px solid white' : 'none',
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Strength:</span>
                  <span className="font-semibold" style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-[#CBD5E1] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1E1B4B] dark:focus:border-[#2563EB] focus:ring-1 focus:ring-[#1E1B4B] dark:focus:ring-[#2563EB] outline-none transition-all placeholder:text-[#94A3B8]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E1B4B] dark:hover:text-white transition-colors cursor-pointer p-0.5"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1E1B4B] hover:bg-[#2A2663] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 text-center border-t border-[#E2E8F0]">
            <p className="text-xs text-[#64748B]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthSuccess('');
                  setAuthMode('login');
                }}
                className="font-bold text-[#1E1B4B] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      )}

      {/* FORGOT PASSWORD FORM */}
      {authMode === 'forgot' && (
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A]">Academic Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@university.edu"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#CBD5E1] focus:border-[#1E1B4B] focus:ring-1 focus:ring-[#1E1B4B] outline-none transition-all placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#1E1B4B] hover:bg-[#2A2663] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Send Recovery Instructions</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-4 text-center border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => {
                setAuthError('');
                setAuthSuccess('');
                setAuthMode('login');
              }}
              className="text-xs font-bold text-[#1E1B4B] hover:underline cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AuthCard;
