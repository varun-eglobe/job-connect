import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { User, Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [role, setRole] = useState('candidate');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    company_name: '',
    address: '',
    google_map_link: '',
    gst_number: '',
    dob: ''
  });
  const [step, setStep] = useState(1); // 1: Input form, 2: OTP verification
  const [transactionToken, setTransactionToken] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
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
  const [termsSlug, setTermsSlug] = useState('terms-and-conditions');
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await axios.get('/api/pages');
        // Find page with 'terms' in title or slug
        const termsPage = res.data.find(p => 
          p.title?.toLowerCase().includes('terms') || 
          p.slug?.toLowerCase().includes('terms')
        );
        if (termsPage) setTermsSlug(termsPage.slug);
      } catch (err) {
        console.error("Terms link sync failed", err);
      }
    };
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        setSettings(res.data);
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    fetchPages();
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const countryCode = settings?.country_phone_code || '91';
      let cleanPhone = formData.phone;
      if (cleanPhone.startsWith(countryCode)) {
        cleanPhone = cleanPhone.slice(countryCode.length);
      }
      const response = await axios.post('/api/auth/register', {
        ...formData,
        phone: '+' + countryCode + cleanPhone,
        role
      });
      
      if (response.data.otp_required) {
        setTransactionToken(response.data.transaction_token);
        setStep(2);
        setIsLoading(false);
        return;
      }
      
      completeRegistration(response.data.id, role, formData.name);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post('/api/auth/register/verify-otp', {
        transaction_token: transactionToken,
        otp_code: otp
      });
      
      completeRegistration(response.data.id, response.data.role, response.data.name, response.data.company_name);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Invalid OTP code. Please try again.');
      setIsLoading(false);
    }
  };

  const completeRegistration = (userId, userRole, userName, companyName) => {
    localStorage.setItem('user_id', userId);
    localStorage.setItem('role', userRole);
    localStorage.setItem('name', userName);
    if (userRole === 'employer' && companyName) {
      localStorage.setItem('company_name', companyName);
    } else {
      localStorage.removeItem('company_name');
    }

    if (userRole === 'employer') {
      navigate('/employer/dashboard');
    } else {
      setMessage('Registration successful! You can now browse jobs.');
      setTimeout(() => navigate('/jobs'), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto py-5 sm:py-10 px-4 sm:px-0">
      <div className="bg-transparent sm:bg-white p-6 sm:p-8 rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-none sm:shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Account</h2>
        <p className="text-slate-500 mb-8 text-sm italic">Connect with opportunities.</p>

        {step === 1 ? (
          <>
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                  role === 'candidate' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 grayscale'
                }`}
              >
                <User size={24} />
                <span className="font-bold text-xs uppercase tracking-wider">Candidate</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('employer')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                  role === 'employer' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 grayscale'
                }`}
              >
                <Building2 size={24} />
                <span className="font-bold text-xs uppercase tracking-wider">Employer</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Number</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-500 font-bold select-none text-base border-r border-slate-200 pr-3 h-6 flex items-center">
                    +{settings?.country_phone_code || '91'}
                  </div>
                  <input
                    type="tel"
                    required
                    style={{ paddingLeft: `${(settings?.country_phone_code || '91').length * 9 + 52}px` }}
                    className="w-full h-14 pr-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-700"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                  />
                </div>
              </div>

              {role === 'candidate' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-slate-700 font-medium"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full h-14 pl-4 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
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

              {role === 'employer' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      required
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="Official registered name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Office/Shop Address</label>
                    <textarea
                      required
                      rows="3"
                      className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="Detailed address with Landmarks"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </>
              )}

              <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
                By clicking "Register Now", you agree to our <Link to={`/page/${termsSlug}`} className="text-blue-600 font-bold hover:underline">Terms & Conditions</Link>.
              </p>

              {message && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Register Now'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold leading-relaxed border border-blue-100">
              A 4-digit verification code has been sent to your mobile number. Please enter it below to complete registration.
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

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.includes('successful') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {message}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
              >
                {isLoading ? 'Verifying OTP...' : 'Verify & Register'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  setStep(1);
                  setMessage('');
                }}
                className="w-full h-12 text-slate-500 font-bold hover:text-slate-800 transition-all text-sm"
              >
                Back to Registration
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold hover:underline transition-all">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
