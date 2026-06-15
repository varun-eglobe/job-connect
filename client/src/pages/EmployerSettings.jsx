import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Lock, ArrowRight, User, Building2, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const EmployerSettings = () => {
  const [profile, setProfile] = useState({ name: '', company_name: '', email: '', phone: '', address: '', google_map_link: '', gst_number: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isGstVerified, setIsGstVerified] = useState(false);
  const [originalGst, setOriginalGst] = useState('');
  const [originalCompanyName, setOriginalCompanyName] = useState('');
  const [gstMessage, setGstMessage] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [selectedLicenseFile, setSelectedLicenseFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [licenseMessage, setLicenseMessage] = useState('');
  const [licenseImageUrl, setLicenseImageUrl] = useState('');
  const [siteSettings, setSiteSettings] = useState({ gst_domains: '', trade_license_domains: '' });

  const [originalPhone, setOriginalPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTransactionToken, setOtpTransactionToken] = useState('');
  
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await axios.get('/api/settings');
        setSiteSettings(response.data || {});
      } catch (err) {
        console.error("Error fetching site settings", err);
      }
    };
    fetchSiteSettings();
  }, []);

  const shouldShowSection = (sectionDomainsString) => {
    if (!sectionDomainsString || sectionDomainsString.trim() === '') {
      return true;
    }
    const currentUrl = window.location.href;
    const domains = sectionDomainsString.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    const origin = window.location.origin.toLowerCase();
    const host = window.location.host.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    return domains.some(domain => {
      return currentUrl.toLowerCase().includes(domain) || 
             domain.includes(origin) || 
             domain.includes(host) || 
             domain.includes(hostname);
    });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`/api/users/${userId}`);
        const formattedPhone = (response.data.phone || '').replace(/^\+/, '');
        setProfile({
          name: response.data.name || '',
          company_name: response.data.company_name || '',
          email: response.data.email || '',
          phone: formattedPhone,
          address: response.data.address || '',
          google_map_link: response.data.google_map_link || '',
          gst_number: response.data.gst_number || ''
        });
        setIsVerified(!!response.data.is_verified);
        setIsGstVerified(!!response.data.is_gst_verified);
        setOriginalGst(response.data.gst_number || '');
        setOriginalCompanyName(response.data.company_name || '');
        if (response.data.company_name) {
          localStorage.setItem('company_name', response.data.company_name);
          window.dispatchEvent(new Event('storage'));
        }
        setLicenseImageUrl(response.data.license_image_url || '');
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
      const res = await axios.put(`/api/users/${userId}`, {
        ...profile,
        phone: '+' + profile.phone.replace(/\D/g, '')
      });
      localStorage.setItem('name', profile.name);
      if (profile.company_name) {
        localStorage.setItem('company_name', profile.company_name);
      } else {
        localStorage.removeItem('company_name');
      }
      
      let successMessage = 'Profile updated successfully.';
      
      if (res.data.clearedGst) {
        setProfile(prev => ({ ...prev, gst_number: '' }));
        setOriginalGst('');
        setIsVerified(false);
        setIsGstVerified(false);
        setOriginalCompanyName(profile.company_name);
        successMessage = 'Profile updated. Business name was changed: GST verified state and GST number cleared. Please re-enter and verify the GST for the new Business Name.';
      } else {
        setOriginalGst(profile.gst_number);
        setOriginalCompanyName(profile.company_name);
        if (res.data.resetVerification) {
          setIsVerified(false);
          setIsGstVerified(false);
        }
      }
      
      setOriginalPhone(profile.phone);
      setPhoneVerified(false);
      setProfileMessage({ type: 'success', text: successMessage });
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    }
  };

  const handleVerifyGst = async () => {
    if (!profile.gst_number) {
      setGstMessage({ type: 'error', text: 'Please enter a GST number first' });
      return;
    }
    try {
      const res = await axios.put(`/api/users/${userId}/verify-gst`, { gst_number: profile.gst_number });
      setIsGstVerified(false);
      setIsVerified(false);
      setOriginalGst(profile.gst_number);
      setGstMessage({ type: 'success', text: res.data.message || 'GST Number submitted successfully' });
    } catch (err) {
      setGstMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit GST' });
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

  const handleLicenseFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedLicenseFile(e.target.files[0]);
    }
  };

  const handleUploadLicenseImage = async () => {
    if (!selectedLicenseFile) return;
    setIsUploading(true);
    setLicenseMessage('');

    const formData = new FormData();
    formData.append('license_image', selectedLicenseFile);

    try {
      const res = await axios.post(`/api/employers/${userId}/upload-license-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLicenseImageUrl(res.data.imageUrl);
      setIsVerified(false);
      setLicenseMessage({ type: 'success', text: 'License document uploaded successfully! Pending Admin verification.' });
      setSelectedLicenseFile(null);
    } catch (err) {
      console.error(err);
      setLicenseMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload license document.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-20">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Settings size={14} />
              Account Management
            </div>
            <h1 className="text-3xl font-extrabold">Employer Settings</h1>
            <p className="text-slate-400 mt-2">Manage your account credentials and preferences.</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
              isGstVerified 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : isVerified 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }`}>
              {isGstVerified ? (
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              ) : isVerified ? (
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
              {isGstVerified 
                ? 'GST Verified' 
                : isVerified 
                  ? 'Verified by Admin' 
                  : 'Not Verified'}
            </div>
            {!isVerified && <p className="text-[10px] text-slate-400 font-medium italic">Visible to public once verified.</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            Profile Details
          </h2>
          <p className="text-xs text-slate-500 mt-1">Update your personal and company contact information.</p>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={profile.company_name}
                    onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                  />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
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

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Office/Shop Address</label>
              <textarea
                rows="3"
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none h-28"
                value={profile.address}
                onChange={(e) => setProfile({...profile, address: e.target.value})}
              />
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
              Save Profile
              <Save size={18} />
            </button>
          </form>
        </div>
      </div>
      {shouldShowSection(siteSettings.gst_domains) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              GST Verification
            </h2>
            <p className="text-xs text-slate-500 mt-1">Verify your GST number to get a verified badge on your employer profile.</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">GST Number</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none uppercase"
                    placeholder="e.g. 29ABCDE1234F2Z5"
                    value={profile.gst_number || ''}
                    onChange={(e) => setProfile({...profile, gst_number: e.target.value})}
                  />
                  {isGstVerified ? (
                    <div className="flex items-center justify-center px-6 h-12 bg-green-50 text-green-600 font-bold rounded-xl border border-green-200 whitespace-nowrap">
                      Verified ✓
                    </div>
                  ) : (originalGst && profile.gst_number === originalGst) ? (
                    <div className="flex items-center justify-center px-6 h-12 bg-amber-50 text-amber-600 font-bold rounded-xl border border-amber-200 whitespace-nowrap">
                      Pending Admin Review
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleVerifyGst}
                      className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
                    >
                      Submit GST
                    </button>
                  )}
                </div>
              </div>

              {gstMessage && (
                <div className={`p-4 rounded-xl text-sm ${gstMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {gstMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {shouldShowSection(siteSettings.trade_license_domains) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              Business License
            </h2>
            <p className="text-xs text-slate-500 mt-1">Upload your business license or registration certificate as an image. An admin will manually verify your profile.</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {licenseImageUrl && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={licenseImageUrl} alt="Business License" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">Uploaded License Image</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Status: {isVerified && !isGstVerified ? (
                          <span className="text-green-600 font-bold">Verified by Admin ✓</span>
                        ) : (
                          <span className="text-orange-500 font-bold">Pending Admin Review</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <a href={licenseImageUrl} target="_blank" rel="noreferrer" className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors">
                    View Full Size
                  </a>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {licenseImageUrl ? "Replace Business License (Image)" : "Upload Business License (Image)"}
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLicenseFileChange}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 file:uppercase file:tracking-wider hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-1"
                  />
                  {selectedLicenseFile && (
                    <button
                      type="button"
                      onClick={handleUploadLicenseImage}
                      disabled={isUploading}
                      className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {isUploading ? "Uploading..." : "Upload Image"}
                    </button>
                  )}
                </div>
              </div>

              {licenseMessage && (
                <div className={`p-4 rounded-xl text-sm ${licenseMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {licenseMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Lock size={18} className="text-blue-600" />
            Reset Password
          </h2>
          <p className="text-xs text-slate-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
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

export default EmployerSettings;
