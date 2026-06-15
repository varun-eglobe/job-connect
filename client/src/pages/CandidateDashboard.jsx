import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone, 
  Map, 
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Hash
} from 'lucide-react';

const formatDateSafely = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(String(dateStr).replace(' ', 'T'));
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return 'N/A';
  }
};

const CandidateDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    const fetchApplications = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`/api/candidates/${userId}/applications`);
        setApplications(response.data);
      } catch (err) {
        console.error("Error fetching applications", err);
        setError("Failed to fetch applications. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-slate-400 font-bold text-lg">Loading your interview applications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-20">
      {/* Top Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 md:p-8 text-blue-900 shadow-sm shadow-blue-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600/70 font-bold text-xs uppercase tracking-widest mb-1">
            <Hash size={14} className="text-blue-600" />
            Interview Pass Dashboard
          </div>
          <h1 className="text-3xl font-extrabold text-blue-900">My Applications</h1>
          <p className="text-blue-700/80 mt-2 text-sm leading-relaxed">
            View details of your interview token allocations, scheduled dates, and interview instructions.
          </p>
        </div>
        <div className="bg-white/80 border border-blue-100 rounded-2xl p-4 text-center shrink-0 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Applied</div>
          <div className="text-3xl font-black text-blue-600">{applications.length}</div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
          {error}
        </div>
      )}

      {/* Main List */}
      {applications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Briefcase size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">No Applications Found</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            You have not applied for any interview slots yet. Explore active jobs and apply to secure a slot.
          </p>
          <Link 
            to="/jobs" 
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-100"
          >
            Explore Jobs
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {applications.map((app) => (
            <div 
              key={app.application_id} 
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header block of booking */}
              <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      {app.job_post_id ? `ID: ${app.job_post_id}` : 'Job Connection'}
                    </span>
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      Applied {new Date(app.applied_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 transition-colors">
                    {app.is_deleted_by_admin === 1 ? (
                      <span>{app.job_title}</span>
                    ) : (
                      <Link to={`/jobs/${app.job_id}`} className="hover:text-blue-600">{app.job_title}</Link>
                    )}
                  </h3>
                  <div className="text-sm font-bold text-slate-500 mt-0.5">{app.company_name}</div>
                </div>

                <div className="bg-blue-50/60 border border-blue-100/60 p-3 px-5 rounded-2xl shrink-0 text-center">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Token No</div>
                  <div className="text-xl font-black text-blue-600 mt-1">#{app.token_number || 'N/A'}</div>
                </div>
              </div>

              {app.is_deleted_by_admin === 1 && (
                <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-start gap-3 text-sm text-red-800 font-bold leading-normal">
                  <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <span>Sorry, this {app.company_name || 'Employer'} has been removed by admin.</span>
                </div>
              )}

              {/* Body details */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Interview details block */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Interview Details
                  </h4>
                  
                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-400">Scheduled Date</div>
                      <div className="text-sm font-bold text-slate-700">
                        {app.token_slot_date ? formatDateSafely(app.token_slot_date) : 'Pending Schedule'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-400">Time Slot</div>
                      <div className="text-sm font-bold text-slate-700">
                        {app.token_slot_time || 'Not Scheduled'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-400">Applicant Registered As</div>
                      <div className="text-sm font-semibold text-slate-700">
                        {app.candidate_name} ({app.candidate_phone})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company address and action buttons */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Location & Contact
                  </h4>

                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-400">Office/Store Location</div>
                      <div className="text-sm font-medium text-slate-600 leading-relaxed">
                        {app.company_address || app.job_location || 'Address not listed'}
                      </div>
                    </div>
                  </div>

                  <div className="flex pt-2">
                    {app.is_deleted_by_admin === 1 ? (
                      <button 
                        disabled
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-slate-200"
                      >
                        Job Unavailable
                      </button>
                    ) : (
                      <Link 
                        to={`/jobs/${app.job_id}`}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors"
                      >
                        <ExternalLink size={14} /> View Job
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning strip */}
              {app.is_deleted_by_admin !== 1 && (
                <div className="bg-amber-50/50 border-t border-slate-100 px-6 py-3.5 flex items-start gap-2 text-[10px] text-amber-800 font-semibold leading-relaxed">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Show this application page or quote Token #{app.token_number} at the counter upon arrival for your interview.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}


    </div>
  );
};

export default CandidateDashboard;
