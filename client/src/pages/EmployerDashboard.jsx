import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Briefcase, Clock, CheckCircle2, AlertCircle, Pencil, MapPin, Phone, User, Globe, ShieldCheck, Eye, Users, Calendar, Lock, Printer } from 'lucide-react';

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateSafely = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const getLocalDateString = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const regenerateSlots = (count, split, existingSlots = [], appliedCount = 0) => {
  if (count <= 0 || split <= 0) return [];
  const slots = [];
  
  // 1. Identify how many existing slots can be preserved from the beginning
  let preservedCount = 0;
  let maxPreservedEnd = 0;
  
  if (existingSlots && existingSlots.length > 0) {
    for (const slot of existingSlots) {
      const isLocked = appliedCount > 0 && appliedCount >= slot.startNumber;
      const slotSize = slot.endNumber - slot.startNumber + 1;
      
      // Stop preserving at the first slot that is not locked OR exceeds the new split size
      if (!isLocked || slotSize > split) {
        break;
      }
      
      slots.push({ ...slot });
      maxPreservedEnd = slot.endNumber;
      preservedCount++;
    }
  }
  
  // 2. Generate the remaining slots starting from the next token number
  let currentStart = maxPreservedEnd > 0 ? maxPreservedEnd + 1 : 1;
  
  while (currentStart <= count) {
    let currentEnd = currentStart + split - 1;
    if (currentEnd > count) {
      currentEnd = count;
    }
    const rangeText = `Token ${currentStart}-${currentEnd}`;
    
    // Find the existing slot that contains the start token of this new range
    const existing = existingSlots && existingSlots.find(
      ext => ext.startNumber <= currentStart && ext.endNumber >= currentStart
    );
    
    slots.push({
      rangeText,
      startNumber: currentStart,
      endNumber: currentEnd,
      date: existing ? existing.date : '',
      startTime: existing ? existing.startTime : '10:00',
      endTime: existing ? existing.endTime : '17:00'
    });
    currentStart = currentEnd + 1;
  }
  
  return slots;
};

const EmployerDashboard = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [isGstVerified, setIsGstVerified] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [profile, setProfile] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [showPostingForm, setShowPostingForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [settings, setSettings] = useState(null);

  const formatSalary = (range) => {
    if (!range) return 'Not set';
    const cleanRange = range.trim();
    if (/^\d/.test(cleanRange)) {
      const currency = settings?.currency_code || 'INR';
      return `${currency} ${cleanRange}`;
    }
    return cleanRange;
  };
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    job_type: 'Full-time',
    vacancies_count: 1,
    expiry_date: '',
    contact_person: '',
    contact_phone: '',
    status: 'active',
    is_urgent: false,
    salary_range: '',
    is_token_based: false,
    token_count: 35,
    token_split: 10,
    token_slots: [],
    applied_count: 0,
    age_range: '',
    qualification: ''
  });

  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  const employerId = localStorage.getItem('user_id');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'employer' && role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  const [jobs, setJobs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // States for viewing applicants details in a modal
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState(null);
  const [applicantsList, setApplicantsList] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`/api/users/${employerId}`);
        setProfile(response.data);
        setIsVerified(!!response.data.is_verified);
        setIsGstVerified(!!response.data.is_gst_verified);
        setIsApproved(!!response.data.is_approved);
        setPaymentStatus(response.data.payment_status);
        if (response.data.company_name) {
          localStorage.setItem('company_name', response.data.company_name);
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error("Error fetching status", err);
      }
    };

    const fetchJobs = async () => {
      try {
        const response = await axios.get(`/api/jobs?employer_id=${employerId}`);
        setJobs(response.data.jobs);
      } catch (err) {
        console.error("Error fetching jobs", err);
      } finally {
        setLoadingJobs(false);
      }
    };

    const fetchLocations = async () => {
      try {
        const response = await axios.get('/api/locations');
        setLocations(response.data);
        if (response.data.length > 0 && !formData.location) {
          setFormData(prev => ({ ...prev, location: response.data[0].name }));
        }
      } catch (err) {
        console.error("Error fetching locations", err);
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/settings');
        setSettings(response.data);
      } catch (err) {
        console.error("Error fetching settings", err);
      }
    };

    if (employerId) {
      fetchStatus();
      fetchJobs();
      fetchLocations();
      fetchSettings();
      const interval = setInterval(() => {
        fetchStatus();
        fetchJobs();
      }, 5000); 
      return () => clearInterval(interval);
    }
  }, [employerId]);

  const handlePostJob = async (e) => {
    e.preventDefault();
    
    const parentLocObj = locations.find(l => l.name === parentName && !l.parent_id);
    const subPlacesForParent = parentLocObj ? locations.filter(l => l.parent_id === parentLocObj.id) : [];
    const hasSubplaces = subPlacesForParent.length > 0;
    
    if (!formData.location || formData.location === parentName) {
      if (hasSubplaces) {
        setMessage({ type: 'error', text: 'Please select a specific Area / Sub-place.' });
        return;
      } else if (!formData.location) {
        setMessage({ type: 'error', text: 'Please select a Region / District.' });
        return;
      }
    }

    if (formData.is_token_based) {
      if (!formData.token_slots || formData.token_slots.length === 0) {
        setMessage({ type: 'error', text: 'Please generate and configure token slot times.' });
        return;
      }
      // Check if all generated slots have a date set
      const incomplete = formData.token_slots.some(s => !s.date);
      if (incomplete) {
        setMessage({ type: 'error', text: 'Please fill in the interview dates for all token ranges.' });
        return;
      }
      const invalidTime = formData.token_slots.some(s => s.startTime && s.endTime && s.endTime <= s.startTime);
      if (invalidTime) {
        setMessage({ type: 'error', text: 'End time must be greater than start time for all slots.' });
        return;
      }
    }

    let finalExpiryDate = formData.expiry_date;
    if (formData.is_token_based && formData.token_slots && formData.token_slots.length > 0) {
      const lastSlot = formData.token_slots[formData.token_slots.length - 1];
      if (lastSlot && lastSlot.date) {
        finalExpiryDate = lastSlot.date;
      }
    }

    if (!formData.is_token_based && finalExpiryDate && finalExpiryDate < getTodayString()) {
      setMessage({ type: 'error', text: 'Expiry date cannot be in the past.' });
      return;
    }

    if (editingJobId) {
      const currentJob = jobs.find(j => j.id === editingJobId);
      if (currentJob) {
        const wasTokenBased = !!currentJob.is_token_based;
        const appliedCount = currentJob.applied_count || 0;

        if (appliedCount > 0) {
          if (wasTokenBased && !formData.is_token_based) {
            setMessage({ 
              type: 'error', 
              text: `Cannot disable token-based management because candidates have already applied to this job (${appliedCount}).` 
            });
            return;
          }
          if (formData.is_token_based && formData.token_count < appliedCount) {
            setMessage({ 
              type: 'error', 
              text: `Token count cannot be less than the number of candidates who have already applied (${appliedCount}).` 
            });
            return;
          }
        }
      }
    }
    if (formData.is_token_based && formData.token_count <= 0) {
      setMessage({ type: 'error', text: 'Token count must be greater than 0.' });
      return;
    }
    try {
      if (editingJobId) {
        await axios.put(`/api/jobs/${editingJobId}`, {
          ...formData,
          expiry_date: finalExpiryDate,
          employer_id: employerId
        });
        alert('Job updated successfully!');
      } else {
        await axios.post('/api/jobs', {
          ...formData,
          expiry_date: finalExpiryDate,
          employer_id: employerId
        });
        alert('Job posted successfully!');
      }
      
      setShowPostingForm(false);
      setEditingJobId(null);
      setFormData({
        title: '',
        description: '',
        location: '',
        job_type: 'Full-time',
        vacancies_count: 1,
        expiry_date: '',
        contact_person: '',
        contact_phone: '',
        status: 'active',
        is_urgent: false,
        salary_range: '',
        is_token_based: false,
        token_count: 35,
        token_split: 10,
        token_slots: [],
        applied_count: 0,
        age_range: '',
        qualification: ''
      });

      const updatedJobs = await axios.get(`/api/jobs?employer_id=${employerId}`);
      setJobs(updatedJobs.data.jobs);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Operation failed.' 
      });
    }
  };

  const handleEditClick = (job) => {
    setMessage('');
    const formattedDate = getLocalDateString(job.expiry_date);
    let parsedSlots = [];
    if (job.token_slots) {
      try {
        parsedSlots = typeof job.token_slots === 'string' ? JSON.parse(job.token_slots) : job.token_slots;
      } catch (e) {
        parsedSlots = [];
      }
    }
    
    // Auto-align / regenerate slots on load to ensure ranges match the token count and daily split
    const alignedSlots = regenerateSlots(job.token_count || 35, job.token_split || 10, parsedSlots, job.applied_count || 0);
    
    setFormData({
      title: job.title,
      description: job.description,
      location: job.location,
      job_type: job.job_type,
      vacancies_count: job.vacancies_count,
      expiry_date: formattedDate,
      contact_person: job.contact_person,
      contact_phone: job.contact_phone,
      status: job.status,
      is_urgent: !!job.is_urgent,
      salary_range: job.salary_range || '',
      is_token_based: !!job.is_token_based,
      token_count: job.token_count || 35,
      token_split: job.token_split || 10,
      token_slots: alignedSlots,
      applied_count: job.applied_count || 0,
      age_range: job.age_range || '',
      qualification: job.qualification || ''
    });
    setEditingJobId(job.id);
    setShowPostingForm(true);
  };

  const handleNewJobClick = () => {
    setEditingJobId(null);
    setMessage('');
    setFormData({
      title: '',
      description: '',
      location: '',
      job_type: 'Full-time',
      vacancies_count: 1,
      expiry_date: '',
      contact_person: '',
      contact_phone: '',
      status: 'active',
      is_urgent: false,
      salary_range: '',
      is_token_based: false,
      token_count: 35,
      token_split: 10,
      token_slots: [],
      applied_count: 0,
      age_range: '',
      qualification: ''
    });
    setShowPostingForm(true);
  };

  // Location Hierarchy Mapping
  const parentLoc = locations.find(l => l.name === formData.location);
  let parentName = '';
  let areaName = '';
  if (parentLoc) {
    if (!parentLoc.parent_id) {
      parentName = parentLoc.name;
    } else {
      const parentOfLoc = locations.find(l => l.id === parentLoc.parent_id);
      parentName = parentOfLoc ? parentOfLoc.name : '';
      areaName = parentLoc.name;
    }
  }
  const matchedParentObj = locations.find(l => l.name === parentName && !l.parent_id);
  const subPlaces = matchedParentObj ? locations.filter(l => l.parent_id === matchedParentObj.id) : [];

  const getMinTokenCount = () => {
    if (editingJobId) {
      const currentJob = jobs.find(j => j.id === editingJobId);
      if (currentJob && currentJob.is_token_based && (currentJob.applied_count || 0) > 0) {
        return (currentJob.applied_count || 0);
      }
    }
    return 1;
  };

  const resolveLocation = (locationName) => {
    if (!locationName) return '—';
    const loc = locations.find(l => l.name === locationName);
    if (loc && loc.parent_id) {
      const parent = locations.find(l => l.id === loc.parent_id);
      return parent ? `${loc.name}, ${parent.name}` : loc.name;
    }
    return locationName;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Card */}
      <div className="relative bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/50 blur-[100px] -ml-32 -mb-32" />
        
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-500/20">
              {profile?.company_name?.[0] || 'E'}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-slate-900">
                  {profile?.company_name || 'Your Business'}
                </h1>
                {isVerified && <CheckCircle2 className="text-blue-500" size={24} />}
              </div>
              <p className="text-slate-500 flex items-center gap-2 text-sm font-medium">
                <User size={14} className="text-blue-400" />
                {profile?.name || 'Contact Person'}
                {' • Employer Account'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3" />
        </div>
        
        {/* Profile Details Row */}
        <div className="relative mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4 text-slate-600">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <Phone size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Contact Phone</p>
              <p className="text-sm font-semibold text-slate-700">{profile?.phone || '---'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-slate-600">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <MapPin size={18} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Base Location</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate text-slate-700">{profile?.address || '---'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status & Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Status Card */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              Account Status
            </h3>
          </div>
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-2xl ${isApproved ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
              <span className={`text-[11px] uppercase tracking-wider ${isApproved ? 'text-green-700' : 'text-orange-700'} font-bold`}>
                Listing Approval
              </span>
              <span className={`flex items-center gap-1 ${isApproved ? 'text-green-600' : 'text-orange-600'} text-xs font-black`}>
                {isApproved ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {isApproved ? 'APPROVED' : 'PENDING'}
              </span>
            </div>
            
            <div className={`flex items-center justify-between p-3 rounded-2xl ${isGstVerified ? 'bg-blue-50 border border-blue-100' : isVerified ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}>
              <span className={`text-[11px] uppercase tracking-wider ${isGstVerified ? 'text-blue-700' : isVerified ? 'text-green-700' : 'text-slate-700'} font-bold`}>
                Verified Badge
              </span>
              <span className={`flex items-center gap-1 ${isGstVerified ? 'text-blue-600' : isVerified ? 'text-green-600' : 'text-slate-500'} text-xs font-black`}>
                {isVerified ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {isGstVerified ? 'GST VERIFIED' : isVerified ? 'VERIFIED BY ADMIN' : 'NOT VERIFIED'}
              </span>
            </div>
          </div>
          
          {!isApproved && (
            <div className="p-4 rounded-2xl bg-orange-50/50 text-[11px] text-orange-800 leading-relaxed flex gap-3">
              <AlertCircle size={16} className="shrink-0 text-orange-500" />
              <p>Your account is under review. Jobs will be visible once approved.</p>
            </div>
          )}
        </div>

        {/* Active Vacancies Card */}
        <div className="md:col-span-2 bg-blue-50 text-slate-900 p-8 rounded-[2rem] border border-blue-100 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 blur-3xl -mr-16 -mt-16" />
          <Briefcase className="absolute -right-8 -bottom-8 text-blue-200/20 w-48 h-48 rotate-12" />
          
          <div className="relative flex-1">
            <h3 className="font-bold text-blue-600 uppercase tracking-[0.2em] text-[10px] mb-6">Active Vacancies</h3>
            <div className="flex items-baseline gap-4">
              <div className="text-7xl font-black tracking-tighter text-blue-600">{jobs.length}</div>
              <div className="space-y-1">
                <p className="text-slate-600 text-sm font-medium">
                  {jobs.filter(j => j.status === 'active').length} currently live jobs
                </p>
                <div className="h-1.5 w-32 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-1000" 
                    style={{ width: `${jobs.length > 0 ? (jobs.filter(j => j.status === 'active').length / jobs.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {!loadingJobs && (
              <button 
                onClick={handleNewJobClick}
                className="group relative flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 h-16 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-95 overflow-hidden whitespace-nowrap"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <span>Post New Job</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Your Listings Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-4 sm:p-8 border-b border-slate-50 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">Your Recent Listings</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Manage and monitor your active job vacancies</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-black whitespace-nowrap">
            <Clock size={12} className="text-blue-400" />
            {' Just Now'}
          </div>
        </div>
        
        <div className="px-3 py-4 sm:p-8">
          {loadingJobs ? (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-bold uppercase tracking-widest text-xs">Syncing jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-slate-50 p-20 rounded-[2rem] border border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Briefcase size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">You haven't posted any jobs yet.</p>
              <button onClick={handleNewJobClick} className="mt-4 text-blue-600 font-bold text-sm hover:underline">
                Create your first listing
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {jobs.map(job => {
                const isExpired = job.expiry_date && getLocalDateString(job.expiry_date) < getTodayString();
                return (
                  <div key={job.id} className={`rounded-2xl border overflow-hidden transition-all duration-200 ${isExpired ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-white hover:border-blue-100 hover:shadow-md hover:shadow-blue-500/5'}`}>
                    
                    {/* Top strip: status + urgent */}
                    <div className={`flex items-center justify-between px-4 py-2 border-b ${isExpired ? 'border-red-100 bg-red-50/40' : 'border-slate-50 bg-slate-50/60'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${job.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          {job.status}
                        </span>
                        {!!job.is_urgent && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-red-200 animate-pulse">
                            Urgent
                          </span>
                        )}
                      </div>
                      {job.job_post_id && (
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider">#{job.job_post_id}</span>
                      )}
                    </div>

                    {/* Main body */}
                    <div className="px-4 pt-3 pb-4">

                      {/* Title + actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-base font-black tracking-tight leading-snug truncate ${isExpired ? 'text-slate-600' : 'text-slate-900'}`} title={job.title}>
                            {job.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs font-semibold flex-wrap">
                            <span className="flex items-center gap-0.5 shrink-0">
                              <MapPin size={10} className="text-blue-400 shrink-0" />
                              {job.location}
                            </span>
                            {job.qualification && (
                              <>
                                <span className="text-slate-200 font-light">•</span>
                                <span className="text-slate-500 font-bold shrink-0">Qualification: {job.qualification}</span>
                              </>
                            )}
                            {job.age_range && (
                              <>
                                <span className="text-slate-200 font-light">•</span>
                                <span className="text-slate-500 font-bold shrink-0">Age: {job.age_range}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!!job.is_token_based && (
                            <button 
                              onClick={async () => {
                                setSelectedJobForApplicants(job);
                                setApplicantsList([]);
                                setLoadingApplicants(true);
                                setShowApplicantsModal(true);
                                try {
                                  const res = await axios.get(`/api/jobs/${job.id}/applications`);
                                  setApplicantsList(res.data);
                                } catch (e) {
                                  console.error("Failed to load applicants", e);
                                } finally {
                                  setLoadingApplicants(false);
                                }
                              }}
                              className="px-3 h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                              title={`View Applicants (Total Slots: ${job.token_count || 0})`}
                            >
                              <Users size={12} />
                              <span>Applicants ({job.applied_count || 0} / {job.token_count || 0})</span>
                            </button>
                          )}
                          <Link to={`/jobs/${job.id}`}
                            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center"
                            title="View">
                            <Eye size={14} />
                          </Link>
                          <button onClick={() => handleEditClick(job)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors active:scale-95 cursor-pointer"
                            title="Edit">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Job type chips */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {job.job_type && job.job_type.split(',').map((type, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-widest rounded-full">
                            {type.trim()}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-3 italic">
                        {job.description}
                      </p>

                      {/* Stats row — mobile: salary full width top, vacancy+expires below; sm+: single row */}
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        {/* Mobile: Salary full width */}
                        <div className="sm:hidden border-b border-slate-100 px-3 py-2 text-center">
                          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold leading-none mb-1">Salary ({settings?.currency_code || 'INR'})</p>
                          <p className="text-xs font-black text-slate-700 leading-none" title={job.salary_range || 'Not set'}>
                            {formatSalary(job.salary_range)}
                          </p>
                        </div>
                        {/* Mobile: Vacancy + Expires row | sm+: all three in one row */}
                        <div className="flex items-center">
                          <div className="flex-1 px-3 py-2 text-center border-r border-slate-100">
                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold leading-none mb-1">Vacancy</p>
                            <p className="text-sm font-black text-slate-700 leading-none">{job.vacancies_count || 1}</p>
                          </div>
                          {/* Salary — hidden on mobile (shown above), visible sm+ */}
                          <div className="hidden sm:block flex-[2] px-3 py-2 text-center border-r border-slate-100">
                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold leading-none mb-1">Salary ({settings?.currency_code || 'INR'})</p>
                            <p className="text-xs font-black text-slate-700 truncate leading-none" title={job.salary_range || 'Not set'}>
                              {formatSalary(job.salary_range)}
                            </p>
                          </div>
                          {!!job.is_token_based && (
                            <div className="flex-1 px-3 py-2 text-center border-r border-slate-100 bg-indigo-50/10">
                              <p className="text-[9px] uppercase tracking-widest text-indigo-500 font-bold leading-none mb-1">Tokens</p>
                              <p className="text-xs font-black text-indigo-700 leading-none" title={`${job.applied_count || 0} applied of ${job.token_count || 0} total`}>
                                {job.token_count || 0}
                              </p>
                            </div>
                          )}
                          <div className={`flex-1 px-3 py-2 text-center ${isExpired ? 'bg-red-50' : ''}`}>
                            <p className={`text-[9px] uppercase tracking-widest font-bold leading-none mb-1 ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                              {isExpired ? 'Expired' : 'Expires'}
                            </p>
                            <p className={`text-xs font-black leading-none ${isExpired ? 'text-red-500' : 'text-slate-600'}`}>
                              {formatDateSafely(job.expiry_date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact footer */}
                    <div className={`px-4 py-2.5 flex items-center justify-between border-t ${isExpired ? 'border-red-100' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={12} className="text-blue-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-600 truncate">{job.contact_person || 'HR Dept'}</span>
                      </div>
                      {job.contact_phone && (
                        <span className="text-xs font-bold text-blue-500 shrink-0">{job.contact_phone}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Post/Edit Job Modal */}
      {showPostingForm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-[2rem] shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {editingJobId ? 'Update Job Listing' : 'Post New Job'}
              </h2>
            </div>

            <form onSubmit={handlePostJob} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Modal Body (Scrollable) */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Listing Status</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-semibold">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-semibold">Inactive</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delivery Executive"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Job requirements, timings, etc..."
                    className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vacancies <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                      value={formData.vacancies_count}
                      onChange={(e) => setFormData({...formData, vacancies_count: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Expiry Date {!formData.is_token_based && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      required={!formData.is_token_based}
                      disabled={formData.is_token_based}
                      min={getTodayString()}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={formData.is_token_based 
                        ? (formData.token_slots && formData.token_slots.length > 0 ? formData.token_slots[formData.token_slots.length - 1].date : '') 
                        : formData.expiry_date
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && val < getTodayString()) {
                          setMessage({ type: 'error', text: 'Expiry date cannot be in the past.' });
                          setFormData({ ...formData, expiry_date: '' });
                        } else {
                          setMessage('');
                          setFormData({ ...formData, expiry_date: val });
                        }
                      }}
                    />
                    {formData.is_token_based && (
                      <span className="block text-[10px] text-blue-600 font-medium mt-1">
                        Automatically set to the last interview date (Token Slot range).
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Age Range (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 18 - 35"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                      value={formData.age_range || ''}
                      onChange={(e) => setFormData({...formData, age_range: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Minimum Qualification</label>
                    <input
                      type="text"
                      placeholder="e.g. SSLC, Plus Two, Any Degree"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                      value={formData.qualification || ''}
                      onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Name"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Region / District <span className="text-red-500">*</span></label>
                    <select
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                      value={parentName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, location: val }));
                      }}
                    >
                      <option value="">Select Region / District</option>
                      {locations.filter(loc => !loc.parent_id).map(loc => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Area / Sub-place {parentName && subPlaces.length > 0 && <span className="text-red-500">*</span>}</label>
                    <select
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 disabled:bg-slate-50/50 disabled:cursor-not-allowed"
                      value={areaName}
                      disabled={!parentName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, location: val || parentName }));
                      }}
                    >
                      <option value="">{parentName ? 'Select Area / Sub-place' : 'Select Region First'}</option>
                      {subPlaces.map(loc => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Salary Range ({settings?.currency_code || 'INR'})</label>
                  <input
                    type="text"
                    placeholder={`e.g. ${settings?.currency_code || 'INR'} 15,000 - ${settings?.currency_code || 'INR'} 20,000`}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({...formData, salary_range: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Job Types (Select all that apply)</label>
                  <div className="flex flex-wrap gap-3">
                    {['Full-time', 'Part-time', 'Daily Wages', 'Contract'].map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer p-2 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.job_type && formData.job_type.split(',').map(t => t.trim()).includes(type)}
                          onChange={() => {
                            let selected = formData.job_type ? formData.job_type.split(',').map(t => t.trim()).filter(Boolean) : [];
                            if (selected.includes(type)) {
                              selected = selected.filter(t => t !== type);
                            } else {
                              selected.push(type);
                            }
                            setFormData({...formData, job_type: selected.join(', ')});
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-orange-100 bg-orange-50/30 cursor-pointer hover:bg-orange-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={formData.is_urgent}
                      onChange={(e) => setFormData({...formData, is_urgent: e.target.checked})}
                      className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-orange-700">Urgent Requirement</span>
                      <span className="block text-[10px] text-orange-600 font-medium">Highlight this job with an urgent badge.</span>
                    </div>
                  </label>
                </div>

                {/* Token Management Section */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/20 cursor-pointer hover:bg-blue-50/40 transition-colors">
                    <input 
                      type="checkbox"
                      checked={formData.is_token_based}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => {
                          const slots = checked && prev.token_slots.length === 0
                            ? regenerateSlots(prev.token_count, prev.token_split, [], prev.applied_count)
                            : prev.token_slots;
                          return { ...prev, is_token_based: checked, token_slots: slots };
                        });
                      }}
                      className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-blue-800">Manage with Token</span>
                      <span className="block text-[10px] text-blue-600 font-medium">Limit and split candidate visits across days to avoid rush.</span>
                    </div>
                  </label>
                </div>

                {formData.is_token_based && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Token Count (Total limit)</label>
                        <input
                          type="number"
                          min={getMinTokenCount()}
                          required
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 outline-none bg-white focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-800"
                          value={formData.token_count}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFormData(prev => {
                              const slots = regenerateSlots(val, prev.token_split, prev.token_slots, prev.applied_count);
                              return { ...prev, token_count: val, token_slots: slots };
                            });
                          }}
                        />
                        {editingJobId && (jobs.find(j => j.id === editingJobId)?.applied_count || 0) > 0 && (
                          <span className="block text-[10px] text-amber-600 font-bold mt-1">
                            * Min {getMinTokenCount()} (already {jobs.find(j => j.id === editingJobId)?.applied_count} applied)
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Daily Split (Candidates per day)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 outline-none bg-white focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-800"
                          value={formData.token_split}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFormData(prev => {
                              const slots = regenerateSlots(prev.token_count, val, prev.token_slots, prev.applied_count);
                              return { ...prev, token_split: val, token_slots: slots };
                            });
                          }}
                        />
                      </div>
                    </div>

                    {formData.token_slots && formData.token_slots.length > 0 && (
                      <div className="overflow-x-auto pt-2 border-t border-slate-200">
                        <table className="w-full text-left text-xs text-slate-700">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="pb-2">Token Range</th>
                              <th className="pb-2">Interview Date</th>
                              <th className="pb-2">Time Slot</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {formData.token_slots.map((slot, idx) => {
                              const isLocked = !!(formData.applied_count && formData.applied_count >= slot.startNumber);
                              return (
                                <tr key={idx} className="py-2">
                                  <td className="py-2 font-bold text-slate-700">
                                    <div className="flex items-center gap-1">
                                      {isLocked && <Lock size={11} className="text-amber-500" />}
                                      <span className={isLocked ? "text-slate-400" : ""}>{slot.rangeText}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input
                                      type="date"
                                      required
                                      disabled={isLocked}
                                      className={`h-8 px-2 rounded border outline-none w-full text-xs font-semibold transition-colors ${
                                        isLocked
                                          ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-white border-slate-200 text-slate-800 focus:ring-1 focus:ring-blue-100'
                                      }`}
                                      value={slot.date}
                                      onChange={(e) => {
                                        const updated = [...formData.token_slots];
                                        updated[idx].date = e.target.value;
                                        setFormData({ ...formData, token_slots: updated });
                                      }}
                                    />
                                  </td>
                                  <td className="py-2 flex items-center gap-1.5">
                                    <input
                                      type="time"
                                      required
                                      disabled={isLocked}
                                      className={`h-8 px-1 border rounded text-xs font-semibold transition-colors ${
                                        isLocked
                                          ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-white border-slate-200 text-slate-800 focus:ring-1 focus:ring-blue-100'
                                      }`}
                                      value={slot.startTime}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const updated = [...formData.token_slots];
                                        updated[idx].startTime = val;
                                        if (updated[idx].endTime && updated[idx].endTime <= val) {
                                          updated[idx].endTime = '';
                                          setMessage({ type: 'error', text: 'End time must be greater than start time.' });
                                        } else {
                                          setMessage('');
                                        }
                                        setFormData({ ...formData, token_slots: updated });
                                      }}
                                    />
                                    <span className="text-slate-400 font-medium">to</span>
                                    <input
                                      type="time"
                                      required
                                      disabled={isLocked}
                                      className={`h-8 px-1 border rounded text-xs font-semibold transition-colors ${
                                        isLocked
                                          ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-white border-slate-200 text-slate-800 focus:ring-1 focus:ring-blue-100'
                                      }`}
                                      value={slot.endTime}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const updated = [...formData.token_slots];
                                        if (val && slot.startTime && val <= slot.startTime) {
                                          setMessage({ type: 'error', text: 'End time must be greater than start time.' });
                                          updated[idx].endTime = '';
                                        } else {
                                          setMessage('');
                                          updated[idx].endTime = val;
                                        }
                                        setFormData({ ...formData, token_slots: updated });
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 sm:px-8 sm:py-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 space-y-4">
                {message && (
                  <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                    {message.text}
                  </div>
                )}
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => { setShowPostingForm(false); setEditingJobId(null); setMessage(''); }}
                    className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 h-12 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                    {editingJobId ? 'Update Listing' : 'Post Job'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicants List Modal */}
      {showApplicantsModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800">Token Interview Schedule</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  Applicants for: <span className="font-bold text-blue-600">{selectedJobForApplicants?.title}</span>
                  {selectedJobForApplicants?.job_post_id && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-black text-[10px] tracking-wider">
                      #{selectedJobForApplicants.job_post_id}
                    </span>
                  )}
                </p>
              </div>
              <button 
                onClick={() => { setShowApplicantsModal(false); setSelectedJobForApplicants(null); }}
                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Print Area */}
            <div id="print-schedule-area" className="p-8 overflow-y-auto flex-grow">

               {/* ── Job Info Strip ── */}
              {selectedJobForApplicants && (
                <div className={`mb-5 grid grid-cols-2 ${selectedJobForApplicants.is_token_based ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Business</p>
                    <p className="text-sm font-black text-slate-800 truncate">{profile?.company_name || '—'}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Location</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{resolveLocation(selectedJobForApplicants.location)}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Contact Person</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{selectedJobForApplicants.contact_person || '—'}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Contact Phone</p>
                    <p className="text-sm font-bold text-blue-600 truncate">{selectedJobForApplicants.contact_phone || '—'}</p>
                  </div>
                  {!!selectedJobForApplicants.is_token_based && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                      <p className="text-[9px] uppercase tracking-widest text-indigo-500 font-bold mb-0.5">Tokens (Used / Total)</p>
                      <p className="text-sm font-black text-indigo-700 truncate">
                        {selectedJobForApplicants.applied_count || 0} / {selectedJobForApplicants.token_count || 0}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Applicants Table ── */}
              {loadingApplicants ? (
                <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-bold uppercase tracking-widest text-xs">Loading schedules...</span>
                </div>
              ) : applicantsList.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-semibold text-slate-500">No candidates have applied/booked interview slots yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Token</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Candidate Name</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Phone</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Interview Date</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Time</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Registered As</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                      {applicantsList.map((app) => (
                        <tr key={app.application_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-sm">
                              #{app.token_number}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-800 font-bold">{app.candidate_name}</td>
                          <td className="px-5 py-3.5 text-slate-600">{app.candidate_phone}</td>
                          <td className="px-5 py-3.5 text-slate-700">
                            {app.token_slot_date ? new Date(app.token_slot_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 font-bold">{app.token_slot_time || 'N/A'}</td>
                          <td className="px-5 py-3.5 text-[10px] text-slate-400">
                            <div className="font-semibold text-slate-600">{app.registered_name}</div>
                            <div>{app.registered_phone}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 flex-shrink-0">
              <button 
                onClick={() => {
                  const content = document.getElementById('print-schedule-area');
                  if (!content) return;
                  const resolvedLoc = resolveLocation(selectedJobForApplicants?.location);
                  const win = window.open('', '_blank', 'width=900,height=700');
                  win.document.write(`
                    <html>
                      <head>
                        <title>Token Interview Schedule - ${selectedJobForApplicants?.title || ''}</title>
                        <style>
                          * { box-sizing: border-box; }
                          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1e293b; margin: 0; }
                          h2 { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; }
                          .subtitle { color: #64748b; font-size: 12px; margin: 0 0 12px 0; }
                          .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
                          .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; }
                          .info-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 900; margin: 0 0 2px 0; }
                          .info-value { font-size: 12px; font-weight: 700; color: #1e293b; margin: 0; }
                          .info-value.blue { color: #2563eb; }
                          table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                          thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                          th { padding: 10px 14px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 900; text-align: left; }
                          td { padding: 10px 14px; font-size: 12px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; }
                          tbody tr:last-child td { border-bottom: none; }
                          .token { background: #dbeafe; color: #1d4ed8; padding: 3px 10px; border-radius: 6px; font-weight: 900; font-size: 13px; display: inline-block; }
                          .reg-name { font-weight: 600; color: #475569; }
                          .reg-phone { color: #94a3b8; font-size: 10px; }
                          @page { size: A4 portrait; margin: 8mm; }
                        </style>
                      </head>
                      <body>
                        <h2>Token Interview Schedule</h2>
                        <p class="subtitle">Job: <strong>${selectedJobForApplicants?.title || ''}</strong>${selectedJobForApplicants?.job_post_id ? ` &nbsp;<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:900;letter-spacing:0.05em;">#${selectedJobForApplicants.job_post_id}</span>` : ''}</p>
                        <div class="info-grid">
                          <div class="info-card"><p class="info-label">Business</p><p class="info-value">${profile?.company_name || '—'}</p></div>
                          <div class="info-card"><p class="info-label">Location</p><p class="info-value">${resolvedLoc}</p></div>
                          <div class="info-card"><p class="info-label">Contact Person</p><p class="info-value">${selectedJobForApplicants?.contact_person || '—'}</p></div>
                          <div class="info-card"><p class="info-label">Contact Phone</p><p class="info-value blue">${selectedJobForApplicants?.contact_phone || '—'}</p></div>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>Token</th>
                              <th>Candidate Name</th>
                              <th>Phone</th>
                              <th>Interview Date</th>
                              <th>Time</th>
                              <th>Registered As</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${applicantsList.map(app => `
                              <tr>
                                <td><span class="token">#${app.token_number}</span></td>
                                <td>${app.candidate_name || ''}</td>
                                <td>${app.candidate_phone || ''}</td>
                                <td>${app.token_slot_date ? new Date(app.token_slot_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                                <td>${app.token_slot_time || 'N/A'}</td>
                                <td><span class="reg-name">${app.registered_name || ''}</span><br/><span class="reg-phone">${app.registered_phone || ''}</span></td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </body>
                    </html>
                  `);
                  win.document.close();
                  win.focus();
                  setTimeout(() => { win.print(); win.close(); }, 300);
                }}
                className="no-print px-5 py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-2"
              >
                <Printer size={14} />
                Print Schedule
              </button>
              <button 
                onClick={() => { setShowApplicantsModal(false); setSelectedJobForApplicants(null); }}
                className="no-print px-6 py-3 bg-slate-950 text-white rounded-xl font-bold hover:bg-black transition-all cursor-pointer text-xs"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;
