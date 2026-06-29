import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Building2, MapPin, Phone, Mail, Globe, Briefcase, ChevronRight, CheckCircle2, User, ExternalLink, ArrowLeft, ShieldCheck, Clock, Lock } from 'lucide-react';

const EmployerDetail = () => {
  const { id } = useParams();
  const [employer, setEmployer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);
  
  const isLoggedIn = !!localStorage.getItem('role');

  useEffect(() => {
    const fetchEmployerDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const role = localStorage.getItem('role');
        const userId = localStorage.getItem('user_id');
        const url = (role === 'candidate' && userId) ? `/api/employers/${id}?candidate_id=${userId}` : `/api/employers/${id}`;
        const response = await axios.get(url);
        const fetchedEmp = response.data.employer;
        setEmployer(fetchedEmp);
        if (fetchedEmp) {
          document.title = `${fetchedEmp.company_name} Profile - Job Connect`;
        }
        setJobs(response.data.jobs || []);
      } catch (err) {
        console.error("Error fetching employer details", err);
        setError("This organization profile is not available or has been removed.");
        document.title = 'Employer Not Found - Job Connect';
      } finally {
        setLoading(false);
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
    
    fetchEmployerDetails();
    fetchSettings();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="font-bold animate-pulse">Loading profile details...</p>
      </div>
    );
  }

  if (error || !employer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
          <Building2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-4">{error || "Employer not found"}</h2>
        <Link to="/employers" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">
          <ArrowLeft size={18} /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Banner - Light Blue */}
      <div className="bg-blue-50 border-b border-blue-100 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
           <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />
        </div>
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <Link to="/employers" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold mb-8 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <ArrowLeft size={16} /> All Organizations
          </Link>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl flex items-center justify-center text-slate-700 shadow-md border border-slate-200 shrink-0">
               <Building2 size={48} className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            
            <div className="text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3.5">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                  {employer.company_name}
                </h1>
                
                {employer.is_gst_verified === 1 ? (
                  <span className="flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-blue-200 shadow-sm whitespace-nowrap">
                    <ShieldCheck size={14} strokeWidth={3} />
                    GST Verified
                  </span>
                ) : employer.is_verified === 1 ? (
                  <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-200 shadow-sm whitespace-nowrap">
                    <ShieldCheck size={14} strokeWidth={3} />
                    Verified by Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-amber-200 shadow-sm whitespace-nowrap">
                    <Clock size={14} strokeWidth={3} />
                    Not Verified
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium text-lg mb-6">
                Active partner since {new Date().getFullYear() - 1} • {jobs.length} Active Vacancies
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                {employer.address && (
                  <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                    <MapPin size={18} className="text-blue-500" />
                    {employer.address}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-10">
              <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                About the Organization
              </h2>
              
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-base">
                <p>
                  {employer.company_name} is a verified employer on the Job Connect platform, dedicated to providing quality employment opportunities. 
                  They are committed to inclusive hiring practices and professional growth for their employees.
                </p>
                <p className="mt-4">
                  Currently, they are looking for talented individuals to join their expanding team across various roles.
                </p>
              </div>
              

            </div>

            {/* Active Jobs Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                  Current Openings ({jobs.length})
                </h2>
              </div>

              {jobs.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 italic">
                  <p className="text-slate-400">No active job listings at the moment.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {jobs.map(job => (
                    <Link 
                      key={job.id} 
                      to={`/jobs/${job.id}`}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Briefcase size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                            {job.job_post_id && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold border border-slate-200 shadow-sm whitespace-nowrap">
                                ID: {job.job_post_id}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              <MapPin size={12} /> {job.location}
                            </span>
                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{job.job_type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Contact Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              <div className="bg-slate-50 border-b border-slate-100 p-6">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Contact Information</h3>
              </div>
              
              <div className="p-8 space-y-8">
                {!isLoggedIn ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Lock size={32} />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
                      Please log in to your account to view the employer's contact details.
                    </p>
                    <Link to="/login" className="inline-block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 text-center text-sm">
                      Login to View
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                        <User size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Admin Head</div>
                        <div className="font-bold text-slate-800 text-base">{employer.name}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {employer.phone && (
                        <a href={`tel:${employer.phone.startsWith('+') ? employer.phone : '+' + (settings?.country_phone_code || '91') + employer.phone}`} className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold hover:bg-emerald-100 transition-colors border border-emerald-100">
                          <Phone size={20} />
                          {employer.phone.startsWith('+') ? employer.phone : `+${settings?.country_phone_code || '91'} ${employer.phone}`}
                        </a>
                      )}

                    </div>
                  </>
                )}
                
                <div className="pt-6 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Partner Since {employer.created_at ? new Date(employer.created_at).getFullYear() : '2024'}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmployerDetail;
