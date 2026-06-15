import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ApplyModal from '../components/ApplyModal';
import { 
  MapPin, 
  Briefcase, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Map, 
  ShieldCheck, 
  AlertCircle, 
  Calendar,
  Users,
  Coins,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  CheckCircle2,
  Search,
  Send,
  Copy,
  X,
  GraduationCap
} from 'lucide-react';

const formatDateSafely = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ title: '', text: '', url: '' });
  
  const isLoggedIn = !!localStorage.getItem('role');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('user_id');
  const isPostOwner = job && role === 'employer' && String(job.employer_id) === String(userId);

  const [settings, setSettings] = useState(null);
  const [candidateApplications, setCandidateApplications] = useState([]);
  const [locations, setLocations] = useState([]);

  const resolveLocation = (locationName) => {
    if (!locationName) return '—';
    if (!Array.isArray(locations)) return locationName;
    const loc = locations.find(l => l && l.name === locationName);
    if (loc && loc.parent_id) {
      const parent = locations.find(l => l && l.id === loc.parent_id);
      return parent ? `${loc.name}, ${parent.name}` : loc.name;
    }
    return locationName;
  };


  const [showApplyModal, setShowApplyModal] = useState(false);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicationResult, setApplicationResult] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        setSettings(res.data);
      } catch (err) {
        console.error("Error fetching settings", err);
      }
    };
    const fetchLocations = async () => {
      try {
        const res = await axios.get('/api/locations');
        setLocations(res.data);
      } catch (err) {
        console.error("Error fetching locations", err);
      }
    };
    fetchSettings();
    fetchLocations();
  }, []);

  useEffect(() => {
    const fetchCandidateApplications = async () => {
      if (role === 'candidate' && userId) {
        try {
          const res = await axios.get(`/api/candidates/${userId}/applications`);
          setCandidateApplications(res.data);
        } catch (err) {
          console.error("Error fetching candidate applications", err);
        }
      }
    };
    fetchCandidateApplications();
  }, [role, userId]);



  const handleOpenApplyModal = () => {
    setShowApplyModal(true);
  };

  const handleApplySuccess = async (data) => {
    if (data.success) {
      setApplicationResult({
        token_number: data.token_number,
        token_slot_date: data.token_slot_date,
        token_slot_time: data.token_slot_time,
        job_title: job.title,
        company_name: job.company_name
      });
      setShowSuccessModal(true);
      setJob(prevJob => ({ ...prevJob, applied_count: (prevJob.applied_count || 0) + 1 }));
      
      if (role === 'candidate' && userId) {
        try {
          const res = await axios.get(`/api/candidates/${userId}/applications`);
          setCandidateApplications(res.data);
        } catch (err) {
          console.error("Error fetching updated candidate applications", err);
        }
      }
    }
  };

  useEffect(() => {
    const fetchJobDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/jobs/${id}`);
        setJob(response.data.job);
        setSimilarJobs(response.data.similarJobs || []);
      } catch (err) {
        console.error("Error fetching job details", err);
        setError("This job listing is no longer active or has been removed by the employer.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobDetails();
    window.scrollTo(0, 0);
  }, [id]);

  const handleShare = () => {
    const url = window.location.href;
    const title = job?.title || 'Job Opportunity';
    const text = `Check out this job opportunity:\n*${job?.title || ''}*\nat *${job?.company_name || ''}*\n\nApply here:`;
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `${text} ${url}`
      }).catch((err) => console.log('Error sharing:', err));
    } else {
      setShareData({ title, text, url });
      setShowShareModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-400 font-bold flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Loading Job Details...
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-2xl mx-auto px-4 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-8">
          <Search size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Job Not Found</h2>
        <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium italic">
          {error || "The job opportunity you are looking for might have been closed, filled, or removed by the employer."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link to="/jobs" className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 hover:-translate-y-1">
            Browse All Jobs
          </Link>
          <Link to="/" className="px-8 py-4 bg-white text-slate-600 rounded-2xl font-black uppercase tracking-widest text-sm border border-slate-200 hover:bg-slate-50 transition-all hover:-translate-y-1">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-6 md:pt-10 flex flex-col">
      <div className="max-w-5xl mx-auto px-4 pb-20 flex-grow">
        
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/jobs" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <ChevronLeft size={16} />
            Back to Jobs
          </Link>
          <button 
            onClick={handleShare}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${
              copied 
                ? 'bg-green-50 text-green-600 border-green-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:text-blue-600 hover:border-blue-200'
            }`}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'Copied Link' : 'Share Job'}
          </button>
        </div>

        {/* Hero Card */}
        <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 mb-8 relative overflow-hidden ${
          job.is_token_based ? 'border-l-4 border-l-indigo-600 shadow-indigo-50/20' : ''
        }`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                {job.job_post_id && (
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg border border-slate-200 shadow-sm">
                    ID: {job.job_post_id}
                  </span>
                )}
                {!!job.is_urgent && (
                  <span className="bg-red-100 text-red-600 px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg">
                    Urgent Hiring
                  </span>
                )}
                {isLoggedIn && (
                  job.is_gst_verified === 1 ? (
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                      <ShieldCheck size={14} /> GST Verified
                    </span>
                  ) : job.is_verified === 1 ? (
                    <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-100">
                      <ShieldCheck size={14} /> Verified by Admin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border border-amber-100">
                      <AlertCircle size={14} /> Not Verified
                    </span>
                  )
                )}
                {!!job.is_token_based && (
                  <span className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                    🎫 Token Active
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
                {job.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
                {isLoggedIn ? (
                  <Link to={`/jobs?company=${encodeURIComponent(job.company_name)}`} className="flex items-center gap-2 text-slate-800 hover:text-blue-600 transition-colors">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                      <Building2 size={16} />
                    </div>
                    {job.company_name}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 text-slate-400 italic">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300">
                      <Building2 size={16} />
                    </div>
                    Login to view employer
                  </span>
                )}
                
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <MapPin size={14} className="text-slate-400" /> {resolveLocation(job.location)}
                </span>
                
                {job.job_type && job.job_type.split(',').map((type, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 font-semibold text-slate-600">
                    {type.trim()}
                  </span>
                ))}
                
                {job.qualification && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 font-semibold text-slate-600">
                    Qualification: {job.qualification}
                  </span>
                )}

                {job.age_range && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 font-semibold text-slate-600">
                    Age: {job.age_range}
                  </span>
                )}
                
                <span className="flex items-center gap-1.5 text-slate-500 font-medium text-xs px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  Posted: {formatDateSafely(job.created_at)}
                </span>
              </div>
            </div>


          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Description */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10">
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase size={18} />
                </div>
                Job Description
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed text-base">
                {job.description}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10">
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <AlertCircle size={18} />
                </div>
                Key Requirements
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open Vacancies</div>
                    <div className="font-bold text-slate-800 text-lg">{job.vacancies_count || 1} Positions</div>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apply Before</div>
                    <div className="font-bold text-slate-800 text-lg">
                      {job.expiry_date ? formatDateSafely(job.expiry_date) : 'No strict deadline'}
                    </div>
                  </div>
                </div>

                {job.salary_range && (
                  <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl flex items-center gap-4 sm:col-span-2">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                      <Coins size={24} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Offered Salary Range</div>
                      <div className="font-extrabold text-emerald-700 text-xl">{job.salary_range} / month</div>
                    </div>
                  </div>
                )}
                {!!job.is_token_based ? (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 sm:col-span-2 shadow-sm shadow-indigo-50/50">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-lg">
                      🎫
                    </div>
                    <div className="flex-grow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pr-2 w-full">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interview Slots</div>
                        <div className="font-extrabold text-indigo-700 text-lg">
                          Token: {Math.max(0, job.token_count - (job.applied_count || 0))} Remaining
                        </div>
                      </div>
                      
                      {isLoggedIn && role === 'candidate' ? (
                        <div>
                          {candidateApplications.some(app => app.job_id === job.id) ? (
                            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-sm">
                              <Check size={14} strokeWidth={3} />
                              Token #{candidateApplications.find(app => app.job_id === job.id)?.token_number} Applied
                            </div>
                          ) : (job.token_count - (job.applied_count || 0) > 0) ? (
                            <button 
                              onClick={handleOpenApplyModal}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
                            >
                              Interested
                            </button>
                          ) : (
                            <button 
                              disabled
                              className="px-5 py-2.5 bg-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 cursor-not-allowed"
                            >
                              Filled
                            </button>
                          )}
                        </div>
                      ) : !isLoggedIn ? (
                        <Link 
                          to="/login"
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 block text-center"
                        >
                          Login to Book Slot
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4 sm:col-span-2 opacity-75">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 font-black text-lg">
                      📄
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interview Slots</div>
                      <div className="font-extrabold text-slate-500 text-lg">
                        Direct Walk-in / Contact Employer
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>


          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 p-6">
                <h3 className="text-lg font-black text-slate-900">Employer Details</h3>
              </div>
              
              <div className="p-6">
                {!isLoggedIn ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <User size={32} />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-4 leading-relaxed">
                      Please log in to your account to view the employer's contact information and exact location.
                    </p>
                    <Link to="/login" className="inline-block px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors">
                      Login to View
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Company Name</div>
                        <Link 
                          to={`/employers/${job.employer_id}`}
                          className="font-bold text-slate-800 text-base hover:text-blue-600 transition-colors flex items-center gap-1 group/link"
                        >
                          {job.company_name}
                          <ChevronRight size={16} className="text-slate-300 group-hover/link:text-blue-500 transition-all group-hover/link:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                        <User size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Person</div>
                        <div className="font-semibold text-slate-700">{job.contact_person || 'HR Department'}</div>
                      </div>
                    </div>

                    {job.contact_phone && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-500">
                          <Phone size={18} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone Number</div>
                          <a href={`tel:${job.contact_phone}`} className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
                            {job.contact_phone}
                          </a>
                        </div>
                      </div>
                    )}



                    {job.address && (
                      <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                            <MapPin size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location Address</div>
                            <div className="font-medium text-slate-600 text-sm leading-relaxed">
                              {job.address}
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Similar Jobs Section */}
      </div>
        {similarJobs.length > 0 && (
          <div className="w-full bg-blue-50 py-16 border-t border-blue-200 mt-auto">
            <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                Similar Opportunities
              </h2>
              <Link to={`/jobs?type=${encodeURIComponent(job.job_type.split(',')[0].trim())}`} className="text-blue-600 font-bold hover:underline text-sm hidden sm:block">
                View all {job.job_type.split(',')[0].trim()} jobs
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarJobs.map(simJob => (
                <div key={simJob.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all block">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-black text-lg text-slate-900 line-clamp-1">{simJob.title}</h3>
                    {!!simJob.is_urgent && (
                      <span className="bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg">Urgent</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-500 mb-4 line-clamp-1 flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400" />
                    {isLoggedIn ? simJob.company_name : "Login to view employer"}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 mb-6">
                    <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <MapPin size={14} className="text-slate-400" /> {resolveLocation(simJob.location)}
                    </span>
                    {simJob.job_type && simJob.job_type.split(',').map((type, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 font-semibold text-slate-600">
                        {type.trim()}
                      </span>
                    ))}
                  </div>
                  
                  <Link 
                    to={`/jobs/${simJob.id}`}
                    className="block w-full py-2.5 bg-blue-600 text-white text-center text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
      {/* Custom Share Modal (Bottom Sheet on Mobile, Centered Card on Desktop) */}
      {showShareModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 animate-in slide-in-from-bottom duration-300">
            {/* Drag Handle for Mobile */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Share2 size={20} className="text-blue-600" />
                Share Link
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* WhatsApp */}
              <a 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 2.17.7 4.19 1.94 5.86L2.6 22.1l4.42-1.31C8.61 21.49 10.23 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.85 14.15c-.23.65-1.16 1.18-1.85 1.25-.46.05-.98.08-2.92-.71-2.48-1.01-4.08-3.52-4.21-3.69-.12-.17-1.02-1.36-1.02-2.58s.64-1.83.87-2.07c.23-.23.51-.29.69-.29.17 0 .35.01.5.02.16.01.38-.06.59.44.22.52.75 1.83.82 1.97.07.15.12.32.02.51-.1.2-.15.32-.3.49-.15.17-.32.39-.46.52-.16.15-.33.31-.14.64.19.33.85 1.39 1.81 2.25.96.86 1.77 1.12 2.1 1.29.33.17.52.14.71-.08.19-.22.82-.96 1.04-1.29.22-.33.44-.28.74-.17.3.11 1.91.9 2.21 1.05.3.15.5.22.57.35.07.13.07.75-.16 1.4z"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-600">WhatsApp</span>
              </a>

              {/* Telegram */}
              <a 
                href={`https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
                  <Send size={20} className="ml-0.5" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Telegram</span>
              </a>

              {/* Email */}
              <a 
                href={`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + '\n' + shareData.url)}`}
                onClick={() => setShowShareModal(false)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
                  <Mail size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-600">Email</span>
              </a>

              {/* Copy Link */}
              <button 
                onClick={() => {
                  if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(shareData.url);
                  } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = shareData.url;
                    textArea.style.position = "fixed";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try { document.execCommand('copy'); } catch (err) {}
                    document.body.removeChild(textArea);
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  setShowShareModal(false);
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
                  <Copy size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-600">Copy Link</span>
              </button>
            </div>

            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      <ApplyModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        job={job}
        userId={userId}
        settings={settings}
        onSuccess={handleApplySuccess}
      />

      {/* Success Modal */}
      {showSuccessModal && applicationResult && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowSuccessModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 animate-in slide-in-from-bottom duration-300 text-center">
            {/* Drag Handle for Mobile */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
            
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2">Slot Applied!</h3>
            <p className="text-xs text-slate-500 mb-6">Your interview token has been successfully generated.</p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left mb-6 space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job</span>
                <span className="text-sm font-black text-slate-800 max-w-[200px] truncate">{applicationResult.job_title}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company</span>
                <span className="text-sm font-bold text-blue-600 max-w-[200px] truncate">{applicationResult.company_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Token Number</span>
                <span className="text-base font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">#{applicationResult.token_number}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span>
                <span className="text-sm font-bold text-slate-800">{formatDateSafely(applicationResult.token_slot_date)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Slot</span>
                <span className="text-sm font-bold text-slate-800">{applicationResult.token_slot_time || 'Not Scheduled'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 text-amber-800 text-[10px] font-semibold rounded-xl text-left border border-amber-100 mb-6 leading-relaxed flex gap-2">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <span>Please show this screen or your Dashboard details when visiting the employer's office for the interview.</span>
            </div>

            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl text-sm transition-colors text-center shadow-lg shadow-slate-900/10"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
