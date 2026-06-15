import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Lock, ArrowRight, User, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const CandidateSettings = () => {
  const [profile, setProfile] = useState({ name: '', phone: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const userId = localStorage.getItem('user_id');

  const [originalPhone, setOriginalPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTransactionToken, setOtpTransactionToken] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`/api/users/${userId}`);
        const formattedPhone = (response.data.phone || '').replace(/^\+/, '');
        setProfile({
          name: response.data.name || '',
          phone: formattedPhone,
          email: response.data.email || ''
        });
        setOriginalPhone(formattedPhone);
      } catch (err) {
        console.error("Error fetching profile", err);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const handlePhoneChange = (newPhone) => {
    const formatted = newPhone.replace(/\D/g, '');
    setProfile(prev => ({ ...prev, phone: formatted }));
    
    if (formatted === originalPhone) {
      setPhoneVerified(false);
      setOtpStep(false);
      setOtpValue('');
      setOtpError('');
    } else {
      setPhoneVerified(false);
    }
  };

  const handleSendOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const fullPhone = '+' + profile.phone.replace(/\D/g, '');
      const res = await axios.post('/api/auth/phone-verify/send-otp', {
        phone: fullPhone
      });
      setOtpTransactionToken(res.data.transaction_token);
      setOtpStep(true);
      setOtpValue('');
      setProfileMessage('');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) { setOtpError('Please enter the OTP.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await axios.post('/api/auth/phone-verify/verify-otp', {
        transaction_token: otpTransactionToken,
        otp_code: otpValue
      });
      setPhoneVerified(true);
      setOtpStep(false);
      setOtpError('');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (profile.phone !== originalPhone && !phoneVerified) {
      setProfileMessage({ type: 'error', text: 'Please verify your new mobile number with an OTP before saving.' });
      return;
    }
    try {
      await axios.put(`/api/users/${userId}`, {
        ...profile,
        phone: '+' + profile.phone.replace(/\D/g, '')
      });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
      setOriginalPhone(profile.phone);
      setPhoneVerified(false);
      localStorage.setItem('name', profile.name);
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    try {
      await axios.put(`/api/users/${userId}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update password' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-20">
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 text-blue-900 shadow-sm shadow-blue-50">
        <div className="flex items-center gap-2 text-blue-600/70 font-bold text-xs uppercase tracking-widest mb-1">
          <Settings size={14} className="text-blue-600" />
          Account Management
        </div>
        <h1 className="text-3xl font-extrabold text-blue-900">Candidate Settings</h1>
        <p className="text-blue-700/80 mt-2">Manage your personal information and security.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            Profile Details
          </h2>
          <p className="text-xs text-slate-500 mt-1">Update your name and primary contact number.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-500 font-bold select-none text-base">
                      +
                    </div>
                    <input
                      type="tel"
                      required
                      className={`w-full h-12 pl-9 pr-10 rounded-xl border outline-none font-bold transition-all ${
                        phoneVerified ? 'border-emerald-400 bg-emerald-50/20 text-slate-700 focus:ring-emerald-100' :
                        profile.phone !== originalPhone ? 'border-amber-400 bg-amber-50/10 focus:ring-amber-100' :
                        'border-slate-200 focus:ring-blue-100 text-slate-700'
                      }`}
                      value={profile.phone}
                      readOnly={phoneVerified}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                    />
                    {phoneVerified && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>

                  {profile.phone !== originalPhone && !phoneVerified && !otpStep && (
                    <div className="mt-2 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="text-[11px] text-amber-800 font-bold">Number changed. Verification OTP is required.</div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpLoading}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {otpLoading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </div>
                  )}

                  {otpStep && !phoneVerified && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                      <p className="text-[11px] text-blue-800 font-bold">
                        Enter the 4-digit OTP sent to +{profile.phone}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="0000"
                          className="flex-1 h-9 px-3 rounded-lg border border-blue-200 outline-none text-sm font-bold text-center tracking-widest text-slate-800 focus:ring-2 focus:ring-blue-100"
                          value={otpValue}
                          onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpLoading}
                          className="px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {otpLoading ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading}
                          className="px-3 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Resend
                        </button>
                      </div>
                      {otpError && <p className="text-[10px] text-red-600 font-bold">{otpError}</p>}
                    </div>
                  )}
                </div>
            </div>

            {profileMessage && (
              <div className={`p-4 rounded-xl text-sm ${profileMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {profileMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-4 shadow-lg shadow-blue-200"
            >
              Save Changes
              <Save size={18} />
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Lock size={18} className="text-blue-600" />
            Security
          </h2>
          <p className="text-xs text-slate-500 mt-1">Keep your account safe by updating your password regularly.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
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
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
            >
              Update Password
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CandidateSettings;
