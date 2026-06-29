import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Key, User, Building2, Lock, ArrowRight, Eye, EyeOff, CheckCircle, ShieldCheck, Mail } from 'lucide-react';

const ForgotPassword = ({ isAdmin = false }) => {
  const [role, setRole] = useState(isAdmin ? 'admin' : 'candidate');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1: Lookup, 2: Reset Form, 3: Success
  const [transactionToken, setTransactionToken] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const { search } = useLocation();
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (isAdmin) {
      setRole('admin');
      return;
    }
    const params = new URLSearchParams(search);
    const r = params.get('role');
    if (r === 'candidate' || r === 'employer') {
      setRole(r);
    }
  }, [search, isAdmin]);

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        if (otpInputRef.current) {
          otpInputRef.current.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    document.title = 'Reset Password - Job Connect';
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        setSettings(res.data);
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    fetchSettings();
  }, []);

  // Redirect to login after 3 seconds on success
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin-login');
        } else {
          navigate('/login');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, navigate, role]);

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      let finalIdentifier = identifier;
      if (role !== 'admin') {
        const countryCode = settings?.country_phone_code || '91';
        let cleanId = identifier.replace(/\D/g, '');
        if (cleanId.startsWith(countryCode)) {
          cleanId = cleanId.slice(countryCode.length);
        }
        finalIdentifier = '+' + countryCode + cleanId;
      }
      const response = await axios.post('/api/auth/forgot-password', {
        role,
        identifier: finalIdentifier
      });

      if (response.data.otp_required) {
        setTransactionToken(response.data.transaction_token);
        setSuccessMessage(response.data.message || 'OTP sent successfully.');
        setStep(2);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/reset-password', {
        transaction_token: transactionToken,
        otp_code: otp,
        new_password: newPassword
      });

      if (response.data.success) {
        setStep(3);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Verification or password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 sm:py-20 px-4 sm:px-0">
      <div className="bg-transparent sm:bg-white p-6 sm:p-10 rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-none sm:shadow-sm">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6">
              {isAdmin ? <ShieldCheck size={32} /> : <Key size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isAdmin ? 'Administrative Reset' : 'Reset Password'}
            </h2>
            <p className="text-slate-500 mb-8 text-sm">
              {isAdmin ? 'Verify your administrative email to reset password.' : 'Please verify your details to reset your password.'}
            </p>

            {/* Role Selector */}
            {!isAdmin && (
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setRole('candidate');
                    setIdentifier('');
                    setMessage('');
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                    role === 'candidate' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 grayscale'
                  }`}
                >
                  <User size={24} />
                  <span className="font-bold text-xs uppercase tracking-wider">Candidate</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('employer');
                    setIdentifier('');
                    setMessage('');
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                    role === 'employer' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 grayscale'
                  }`}
                >
                  <Building2 size={24} />
                  <span className="font-bold text-xs uppercase tracking-wider">Employer</span>
                </button>
              </div>
            )}

            <form onSubmit={handleIdentifierSubmit} className="space-y-4">
              {role === 'admin' ? (
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold"
                      placeholder="admin@jobconnect.gov.in"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-500 font-bold select-none text-base border-r border-slate-200 pr-3 h-6 flex items-center">
                      +{settings?.country_phone_code || '91'}
                    </div>
                    <input
                      type="tel"
                      required
                      style={{ paddingLeft: `${(settings?.country_phone_code || '91').length * 9 + 52}px` }}
                      className="w-full h-14 pr-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                      placeholder="9876543210"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
              )}

              {message && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{message}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Request Reset OTP'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Set New Password</h2>
            <p className="text-slate-500 mb-8 text-sm">Please verify the OTP code and enter your new password.</p>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold leading-relaxed border border-blue-100 mb-4">
                {successMessage || 'A 4-digit verification code has been generated. Please enter it below along with your new password.'}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Verification Code</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  required
                  maxLength={4}
                  autoFocus
                  className="w-full h-14 text-center text-2xl font-black tracking-[0.2em] rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {message && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{message}</div>}

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setMessage('');
                  }}
                  className="w-full h-12 text-slate-500 font-bold hover:text-slate-800 transition-all text-sm"
                >
                  Cancel & Go Back
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6 border border-green-100 shadow-sm shadow-green-50">
              <CheckCircle size={44} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Password Reset Successful</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto mb-8">
              Your password has been successfully updated. You will now be automatically redirected to the login page.
            </p>
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 font-medium">
          Remembered your password?{' '}
          <Link to={role === 'admin' ? "/admin-login" : "/login"} className="text-blue-600 hover:text-blue-700 font-bold hover:underline transition-all">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
