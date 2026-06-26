import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [isAuthorized, setIsAuthorized] = useState(null); // null: loading, true: authorized, false: unauthorized
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Login, 2: OTP
  const [transactionToken, setTransactionToken] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkGatewaySecret = async () => {
      try {
        const response = await axios.get('/api/settings');
        const configuredSecret = response.data.admin_login_secret;

        if (!configuredSecret || configuredSecret.trim() === '') {
          setIsAuthorized(true);
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const secretParam = params.get('secret');

        if (secretParam === configuredSecret) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error("Failed to check administrative gateway secret:", err);
        setIsAuthorized(true);
      }
    };
    checkGatewaySecret();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post('/api/auth/admin-login', formData);
      
      if (response.data.otp_required) {
        setTransactionToken(response.data.transaction_token);
        setSuccessMessage(response.data.message || 'OTP sent successfully.');
        setStep(2);
        setIsLoading(false);
        return;
      }

      completeLogin(response.data.user);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Invalid administrator credentials');
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post('/api/auth/login/verify-otp', {
        transaction_token: transactionToken,
        otp_code: otp
      });

      completeLogin(response.data.user);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Invalid verification OTP');
      setIsLoading(false);
    }
  };

  const completeLogin = (user) => {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('role', user.role);
    localStorage.setItem('name', user.name);
    localStorage.setItem('email', user.email);
    localStorage.setItem('permissions', JSON.stringify(user.permissions || {}));

    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-sm font-bold animate-pulse">Securing gateway connection...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="max-w-md mx-auto py-32 text-center font-sans">
        <h1 className="text-9xl font-black text-slate-200">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-2">Page Not Found</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
        <Link to="/" className="inline-flex items-center justify-center h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100">
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-20 font-sans">
      <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-sm text-slate-800">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-100 animate-pulse">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Administrative Gateway</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">Secure access for authorized Job Connect administrators.</p>

        {step === 1 ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-500">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-slate-900"
                  placeholder="admin@jobconnect.gov.in"
                  value={formData.identifier}
                  onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <Link to="/admin-forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-slate-900"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
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

            {message && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{message}</div>}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50 shadow-lg shadow-blue-100"
            >
              {isLoading ? 'Verifying Gateway...' : 'Authenticate'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-6 animate-in fade-in duration-500">
            <div className="p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs font-bold leading-relaxed">
              {successMessage || 'An administrative verification token has been generated. Please enter it below to authorize this session.'}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Verification Code</label>
              <input 
                type="text" 
                required
                maxLength={4}
                autoFocus
                className="w-full h-16 text-center text-3xl font-black border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all rounded-2xl tracking-[0.5em] text-slate-900"
                placeholder="0000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {message && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{message}</div>}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
            >
              {isLoading ? 'Authorizing Access...' : 'Verify & Continue'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
