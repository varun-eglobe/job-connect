import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';

const PaymentSimulation = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const employerId = localStorage.getItem('user_id');
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => setSettings(res.data))
      .catch(err => console.error(err));
  }, []);


  const handlePayment = async () => {
    setLoading(true);
    try {
      await axios.post('/api/employers/payment', {
        employer_id: employerId
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/employer/dashboard');
      }, 3000);
    } catch (err) {
      console.error(err);
      alert('Payment failed simulation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h2>
          <p className="text-slate-500 mb-6">Registration fee of {settings?.currency_code || 'INR'} 100 received. Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <CreditCard size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Registration Fee</h2>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">One-time Verification</p>
          </div>
        </div>
 
        <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-600">Verification Fee</span>
            <span className="font-bold">{settings?.currency_code || 'INR'} 100.00</span>
          </div>
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>Processing fee</span>
            <span>{settings?.currency_code || 'INR'} 0.00</span>
          </div>
          <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center">
            <span className="font-bold text-slate-800">Total Due</span>
            <span className="text-2xl font-black text-blue-600">{settings?.currency_code || 'INR'} 100</span>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
            <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 leading-relaxed">
              Paying this fee verifies your business and allows you to post jobs once the administration office approves your profile.
            </p>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          className={`w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Processing...' : 'Simulate Payment'}
        </button>
        
        <p className="text-center text-xs text-slate-400 mt-6">
          Secured by JobConnect Gateway
        </p>
      </div>
    </div>
  );
};

export default PaymentSimulation;
