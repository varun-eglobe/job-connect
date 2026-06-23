import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Briefcase, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ApplyModal({ isOpen, onClose, job, userId, settings, onSuccess }) {
  const [applyFormData, setApplyFormData] = useState({ candidate_name: '', candidate_phone: '' });
  const [originalPhone, setOriginalPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTransactionToken, setOtpTransactionToken] = useState('');
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApplyFormData({ candidate_name: '', candidate_phone: '' });
      setOriginalPhone('');
      setPhoneVerified(false);
      setOtpStep(false);
      setOtpValue('');
      setOtpError('');
      setOtpTransactionToken('');
      setAcceptedRules(false);
      setApplyError('');

      if (userId) {
        axios.get(`/api/users/${userId}`)
          .then(res => {
            const countryCode = settings?.country_phone_code || '91';
            const rawPhone = res.data.phone ? res.data.phone.replace(/^\+/, '') : '';
            let formattedPhone = rawPhone;
            if (rawPhone.startsWith(countryCode)) {
              formattedPhone = rawPhone.slice(countryCode.length);
            }
            setApplyFormData({
              candidate_name: res.data.name || '',
              candidate_phone: formattedPhone
            });
            setOriginalPhone(formattedPhone);
          })
          .catch(err => {
            console.error("Error fetching user profile in modal", err);
          });
      }
    }
  }, [isOpen, userId, settings]);

  if (!isOpen || !job) return null;

  const isPhoneChanged = () => {
    const current = applyFormData.candidate_phone.replace(/\D/g, '');
    const orig = originalPhone.replace(/\D/g, '');
    return orig && current && current !== orig;
  };

  const handleSendOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const countryCode = settings?.country_phone_code || '91';
      let cleanPhone = applyFormData.candidate_phone.replace(/\D/g, '');
      if (cleanPhone.startsWith(countryCode)) {
        cleanPhone = cleanPhone.slice(countryCode.length);
      }
      const fullPhone = '+' + countryCode + cleanPhone;
      const res = await axios.post('/api/auth/phone-verify/send-otp', {
        phone: fullPhone
      });
      setOtpTransactionToken(res.data.transaction_token);
      setOtpStep(true);
      setOtpValue('');
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
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleConfirmApply = async (e) => {
    e.preventDefault();
    if (!applyFormData.candidate_name.trim() || !applyFormData.candidate_phone.trim()) {
      setApplyError('Name and phone number are required.');
      return;
    }
    if (isPhoneChanged() && !phoneVerified) {
      setApplyError('Please verify your new phone number via OTP before applying.');
      return;
    }
    setApplyLoading(true);
    setApplyError('');
    try {
      const countryCode = settings?.country_phone_code || '91';
      let cleanPhone = applyFormData.candidate_phone.replace(/\D/g, '');
      if (cleanPhone.startsWith(countryCode)) {
        cleanPhone = cleanPhone.slice(countryCode.length);
      }
      const fullPhone = '+' + countryCode + cleanPhone;
      const response = await axios.post(`/api/jobs/${job.id}/apply`, {
        candidate_id: userId,
        candidate_name: applyFormData.candidate_name,
        candidate_phone: fullPhone
      });
      onSuccess({
        ...response.data,
        candidate_name: applyFormData.candidate_name,
        candidate_phone: fullPhone
      });
      onClose();
    } catch (err) {
      setApplyError(err.response?.data?.error || 'Failed to apply. Please try again.');
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-slate-100 z-10 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        {/* Sticky Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Briefcase size={22} className="text-blue-600" />
              Confirm Interview Slot
            </h3>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6">
          <form onSubmit={handleConfirmApply} className="space-y-4 pb-2">
            <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 mb-4">
              <div className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-1">Applying For</div>
              <div className="text-base font-black text-slate-800">{job.title}</div>
              <div className="text-sm font-bold text-blue-600 mt-0.5">{job.company_name}</div>
            </div>

            {settings?.interview_rules && (
              <div className="rounded-2xl border border-blue-200 overflow-hidden mb-4">
                <div className="bg-blue-600 px-4 py-2.5 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-100" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Interview Rules &amp; Regulations</span>
                </div>
                <div className="bg-blue-50 px-4 py-3">
                  <div className="prose prose-sm text-[11px] leading-relaxed text-slate-700 [&_strong]:text-blue-800 [&_strong]:font-black [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1.5 [&_p]:mb-3 last:[&_p]:mb-0 last:[&_ul]:mb-0 last:[&_ol]:mb-0" dangerouslySetInnerHTML={{ __html: settings.interview_rules }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Candidate Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter candidate name"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none font-semibold text-slate-800"
                  value={applyFormData.candidate_name}
                  onChange={(e) => setApplyFormData({...applyFormData, candidate_name: e.target.value})}
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Prefilled from your account. Edit if applying for someone else.</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Contact Phone Number</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-500 font-bold select-none text-base border-r border-slate-200 pr-3 h-6 flex items-center">
                    +{settings?.country_phone_code || '91'}
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number"
                    style={{ paddingLeft: `${(settings?.country_phone_code || '91').length * 9 + 52}px` }}
                    className={`w-full h-12 pr-10 rounded-xl border outline-none font-bold text-slate-800 transition-all ${
                      phoneVerified ? 'border-emerald-400 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-100' :
                      isPhoneChanged() ? 'border-amber-400 bg-amber-50/20 focus:ring-2 focus:ring-amber-100' :
                      'border-slate-200 focus:ring-2 focus:ring-blue-100'
                    }`}
                    value={applyFormData.candidate_phone}
                    readOnly={phoneVerified}
                    onChange={(e) => {
                      setApplyFormData({...applyFormData, candidate_phone: e.target.value.replace(/\D/g, '')});
                      setPhoneVerified(false);
                      setOtpStep(false);
                      setOtpValue('');
                      setOtpError('');
                    }}
                  />
                  {phoneVerified && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                {phoneVerified && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 ml-1 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Phone number verified successfully.
                  </p>
                )}
              </div>
            </div>

            {isPhoneChanged() && !phoneVerified && !otpStep && (
              <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] text-amber-800 font-bold">This is a different phone number from your account.</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">You must verify it with OTP before applying.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
                >
                  {otpLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            )}

            {otpStep && !phoneVerified && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <p className="text-[11px] text-blue-800 font-bold flex items-center gap-1">
                  <ShieldCheck size={13} className="text-blue-600" />
                  Enter the OTP sent to +{settings?.country_phone_code || '91'}{applyFormData.candidate_phone}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter OTP"
                    className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-blue-200 outline-none text-sm font-bold tracking-widest text-slate-800 focus:ring-2 focus:ring-blue-100"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading}
                    className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition-colors disabled:opacity-50 shrink-0"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="px-3 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shrink-0"
                  >
                    Resend
                  </button>
                </div>
                {otpError && <p className="text-[10px] text-red-600 font-bold">{otpError}</p>}
              </div>
            )}

            {applyError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                {applyError}
              </div>
            )}

            {settings?.interview_rules && (
              <label className="flex items-center gap-3 cursor-pointer px-1 py-2 select-none">
                <input
                  type="checkbox"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-600">
                  I accept the <span className="text-blue-600">Rules &amp; Regulations</span>
                </span>
              </label>
            )}

            <div className="flex gap-3 pt-1 pb-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition-colors text-center border border-slate-100"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={applyLoading || (settings?.interview_rules && !acceptedRules)}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors text-center shadow-lg shadow-blue-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {applyLoading ? 'Applying...' : 'I agree and apply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
