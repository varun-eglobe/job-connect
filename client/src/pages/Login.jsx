import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User, Lock, ArrowRight, Eye, EyeOff, Shield, Users, Key, X, HelpCircle, Briefcase } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Login, 2: OTP
  const [transactionToken, setTransactionToken] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const otpInputRef = useRef(null);

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

  const [debugAccounts, setDebugAccounts] = useState([]);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('employer');

  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname === '192.168.1.32';

  useEffect(() => {
    if (isLocalhost) {
      const fetchDebugAccounts = async () => {
        setDebugLoading(true);
        try {
          const response = await axios.get('/api/auth/debug-accounts');
          setDebugAccounts(response.data);
        } catch (err) {
          console.error("Error fetching debug accounts:", err);
        } finally {
          setDebugLoading(false);
        }
      };
      fetchDebugAccounts();
    }
  }, [isLocalhost]);

  const handlePrefill = (account) => {
    if (account.role === 'admin') {
      alert(`This is an admin account. Please use the Admin Login page at /admin-login to login with email: ${account.email}`);
      navigate('/admin-login');
      return;
    }
    
    setFormData({
      identifier: account.phone ? account.phone.replace(/^\+/, '') : '',
      password: account.password || ''
    });
    setStep(1);
    setOtp('');
    setShowDebugModal(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post('/api/auth/login', {
        ...formData,
        identifier: '+' + formData.identifier
      });
      
      if (response.data.otp_required) {
        setTransactionToken(response.data.transaction_token);
        setStep(2);
        setIsLoading(false);
        return;
      }

      completeLogin(response.data.user);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Invalid credentials');
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
      setMessage(err.response?.data?.error || 'Invalid OTP');
      setIsLoading(false);
    }
  };

  const completeLogin = (user) => {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('role', user.role);
    localStorage.setItem('name', user.name);
    localStorage.setItem('email', user.email);
    if (user.company_name) {
      localStorage.setItem('company_name', user.company_name);
    } else {
      localStorage.removeItem('company_name');
    }
    localStorage.setItem('permissions', JSON.stringify(user.permissions || {}));

    if (user.role === 'admin') {
      navigate('/admin');
    } else if (user.role === 'employer') {
      navigate('/employer/dashboard');
    } else {
      navigate('/jobs');
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 sm:py-20 px-4 sm:px-0">
      <div className="bg-transparent sm:bg-white p-6 sm:p-10 rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-none sm:shadow-sm">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6">
          <LogIn size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-slate-500 mb-8">Login to manage your Job Connect profile.</p>

        {step === 1 ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Mobile Number</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-500 font-bold select-none text-base">
                  +
                </div>
                <input 
                  type="tel" 
                  required
                  className="w-full h-14 pl-9 pr-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                  placeholder="919876543210"
                  value={formData.identifier}
                  onChange={(e) => setFormData({...formData, identifier: e.target.value.replace(/\D/g, '')})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
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

            {message && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{message}</div>}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold leading-relaxed border border-blue-100">
                A 4-digit verification code has been sent to your registered mobile number. Please enter it below to continue.
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Verification Code</label>
              <input 
                ref={otpInputRef}
                type="text" 
                required
                maxLength={4}
                autoFocus
                className="w-full h-16 text-center text-3xl font-black tracking-[0.5em] rounded-2xl border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                placeholder="0000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {message && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{message}</div>}

            <div className="flex flex-col gap-3">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
              >
                {isLoading ? 'Verifying OTP...' : 'Verify & Login'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
              
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="w-full h-12 text-slate-500 font-bold hover:text-slate-800 transition-all text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold hover:underline transition-all">
            Register here
          </Link>
        </div>
      </div>

      {/* Dev Mode Accounts Helper Button */}
      {isLocalhost && (
        <div className="mt-6 text-center">
          <button 
            onClick={() => setShowDebugModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-indigo-200 shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
          >
            <Key size={14} className="text-indigo-600" />
            Dev Mode: Test Accounts
          </button>
        </div>
      )}

      {/* Dev Mode Accounts Modal */}
      {showDebugModal && isLocalhost && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowDebugModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Key size={20} className="text-indigo-600" />
                  Local Development Accounts
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Quickly select any seeded user/employer to log in.</p>
              </div>
              <button 
                onClick={() => setShowDebugModal(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4 flex-shrink-0">
              <input 
                type="text"
                placeholder="Search by name, phone or email..."
                className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 font-semibold text-sm text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-100 mb-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('employer')}
                className={`flex-1 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'employer'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Employers ({debugAccounts.filter(a => a.role === 'employer').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('candidate')}
                className={`flex-1 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'candidate'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Candidates ({debugAccounts.filter(a => a.role === 'candidate').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex-1 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Admins ({debugAccounts.filter(a => a.role === 'admin').length})
              </button>
            </div>

            {/* Scrollable Accounts List */}
            <div className="overflow-y-auto flex-1 pr-1">
              {debugLoading ? (
                <div className="text-center py-12 text-slate-400 font-bold">Loading test accounts...</div>
              ) : debugAccounts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">No accounts found in the database.</div>
              ) : (
                <>
                  {/* Candidates Tab */}
                  {activeTab === 'candidate' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {debugAccounts
                          .filter(a => a.role === 'candidate' && (
                            !searchTerm || 
                            a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.phone?.includes(searchTerm)
                          ))
                          .map(acc => (
                            <div 
                              key={acc.id} 
                              onClick={() => handlePrefill(acc)}
                              className="p-4 bg-slate-50/50 hover:bg-emerald-50/20 border border-slate-200/60 hover:border-emerald-200 rounded-2xl cursor-pointer transition-all group flex flex-col justify-between"
                            >
                              <div>
                                <div className="font-extrabold text-slate-800 text-sm mb-1 group-hover:text-emerald-700 transition-colors">{acc.name}</div>
                                <div className="text-xs text-slate-500 font-mono flex flex-col gap-0.5">
                                  <span>Phone: <strong className="text-slate-700">{acc.phone || 'N/A'}</strong></span>
                                  <span>Password: <strong className="text-slate-700 font-mono">{acc.password}</strong></span>
                                </div>
                              </div>
                              <div className="mt-3 text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center justify-between">
                                <span>Candidate</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">Use Account &rarr;</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Employers Tab */}
                  {activeTab === 'employer' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {debugAccounts
                          .filter(a => a.role === 'employer' && (
                            !searchTerm || 
                            a.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.phone?.includes(searchTerm)
                          ))
                          .map(acc => (
                            <div 
                              key={acc.id} 
                              onClick={() => handlePrefill(acc)}
                              className="p-4 bg-slate-50/50 hover:bg-blue-50/20 border border-slate-200/60 hover:border-blue-200 rounded-2xl cursor-pointer transition-all group flex flex-col justify-between"
                            >
                              <div>
                                <div className="font-extrabold text-slate-800 text-sm mb-1 group-hover:text-blue-700 transition-colors">
                                  {acc.company_name && acc.company_name !== 'NA' && acc.company_name !== 'N/A' 
                                    ? acc.company_name 
                                    : acc.name}
                                </div>
                                <div className="text-xs text-slate-500 font-mono flex flex-col gap-0.5">
                                  <span>Phone: <strong className="text-slate-700">{acc.phone || 'N/A'}</strong></span>
                                  <span>Password: <strong className="text-slate-700 font-mono">{acc.password}</strong></span>
                                  {acc.company_name && acc.company_name !== 'NA' && acc.company_name !== 'N/A' && (
                                    <span>Contact: <strong className="text-slate-700">{acc.name}</strong></span>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center justify-between">
                                <span>Employer</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">Use Account &rarr;</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Admins Tab */}
                  {activeTab === 'admin' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {debugAccounts
                          .filter(a => a.role === 'admin' && (
                            !searchTerm || 
                            a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.email?.toLowerCase().includes(searchTerm.toLowerCase())
                          ))
                          .map(acc => (
                            <div 
                              key={acc.id} 
                              onClick={() => handlePrefill(acc)}
                              className="p-4 bg-slate-50/50 hover:bg-rose-50/20 border border-slate-200/60 hover:border-rose-200 rounded-2xl cursor-pointer transition-all group flex flex-col justify-between"
                            >
                              <div>
                                <div className="font-extrabold text-slate-800 text-sm mb-1 group-hover:text-rose-700 transition-colors">{acc.name}</div>
                                <div className="text-xs text-slate-500 font-mono flex flex-col gap-0.5">
                                  <span>Email: <strong className="text-slate-700">{acc.email || 'N/A'}</strong></span>
                                  <span>Password: <strong className="text-slate-700 font-mono">{acc.password}</strong></span>
                                </div>
                              </div>
                              <div className="mt-3 text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center justify-between">
                                <span>Admin (Go to Admin Page)</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">Redirect &rarr;</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Dev Mode Sticky Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-amber-600 font-bold bg-amber-50/50 p-2.5 rounded-xl flex-shrink-0">
              <HelpCircle size={14} className="text-amber-500 shrink-0" />
              <span>Note: OTP validation is mocked to automatically accept code <strong>9999</strong> for all dev environment accounts.</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
