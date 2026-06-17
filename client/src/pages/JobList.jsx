import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ApplyModal from '../components/ApplyModal';
import { MapPin, Filter, Briefcase, X, Search, AlertCircle, Map, User, Phone, CheckCircle2, Check, ShieldCheck, Shield, ChevronDown, Share2, Clock, SearchX, Copy, Download, FileText, Send, Mail } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDateSafely = (dateStr, options) => {
  if (!dateStr) return 'N/A';
  try {
    const safeStr = String(dateStr).replace(' ', 'T');
    const date = new Date(safeStr);
    if (isNaN(date.getTime())) return 'N/A';
    return options ? date.toLocaleDateString('en-GB', options) : date.toLocaleDateString('en-GB');
  } catch (e) {
    return 'N/A';
  }
};

const JobList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [settings, setSettings] = useState(null);

  const formatSalary = (range) => {
    if (!range) return 'Not Disclosed';
    const cleanRange = range.trim();
    if (/^\d/.test(cleanRange)) {
      const currency = settings?.currency_code || 'INR';
      return `${currency} ${cleanRange}`;
    }
    return cleanRange;
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

  const page = parseInt(searchParams.get('page') || '1');
  const regionFilter = searchParams.get('region') || '';
  const locationFilter = searchParams.get('location') || '';
  const typeFilter = searchParams.get('type') || '';
  const activeTypes = typeFilter ? typeFilter.split(',').map(t => t.trim()).filter(Boolean) : [];
  const companyFilter = searchParams.get('company') || '';
  const searchFilter = searchParams.get('search') || '';
  const urgentFilter = searchParams.get('urgent') === 'true';
  const verifiedFilter = searchParams.get('verified') === 'true';

  // Derive primary and sub-place selections dynamically from regionFilter and locationFilter
  let selectedPrimary = regionFilter;
  let selectedSubPlace = '';

  if (regionFilter) {
    selectedSubPlace = locationFilter;
  } else if (locationFilter) {
    // Legacy fallback: if only location is present, find if it's a sub-place or primary
    const activeLocation = Array.isArray(locations) ? locations.find(l => l && l.name === locationFilter) : null;
    if (activeLocation) {
      if (!activeLocation.parent_id) {
        selectedPrimary = activeLocation.name;
      } else {
        const parent = Array.isArray(locations) ? locations.find(l => l && l.id === activeLocation.parent_id) : null;
        selectedPrimary = parent ? parent.name : '';
        selectedSubPlace = activeLocation.name;
      }
    }
  }

  const parentLoc = Array.isArray(locations) ? locations.find(l => l && l.name === selectedPrimary && !l.parent_id) : null;
  const subPlaces = parentLoc && Array.isArray(locations) ? locations.filter(l => l && l.parent_id === parentLoc.id) : [];

  const [searchInput, setSearchInput] = useState(searchFilter || companyFilter);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ title: '', text: '', url: '' });
  
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleType = (type) => {
    let newTypes;
    if (activeTypes.includes(type)) {
      newTypes = activeTypes.filter(t => t !== type);
    } else {
      newTypes = [...activeTypes, type];
    }
    updateFilter('type', newTypes.join(','));
  };

  useEffect(() => {
    setSearchInput(searchFilter || companyFilter);
  }, [searchFilter, companyFilter]);

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const [locRes, setRes] = await Promise.all([
          axios.get('/api/locations'),
          axios.get('/api/settings')
        ]);
        setLocations(locRes.data);
        setSettings(setRes.data);
      } catch (err) { console.error(err); }
    };
    fetchDeps();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const role = localStorage.getItem('role');
        const userId = localStorage.getItem('user_id');
        const apiParams = Object.fromEntries(searchParams);
        if (role === 'candidate' && userId) {
          apiParams.candidate_id = userId;
        }
        const response = await axios.get('/api/jobs', { params: apiParams });
        setJobs(response.data.jobs || []);
        setTotalPages(response.data.totalPages || 1);
        setTotal(response.data.total || 0);
      } catch (err) {
        console.error("Error fetching jobs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [searchParams]);

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const updateLocationFilters = (primary, subPlace) => {
    const newParams = new URLSearchParams(searchParams);
    if (primary) newParams.set('region', primary);
    else newParams.delete('region');
    
    if (subPlace) newParams.set('location', subPlace);
    else newParams.delete('location');
    
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const setPage = (p) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', p.toString());
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams({ page: '1' }));
  };

  const hasAnyFilter = searchFilter || companyFilter || regionFilter || locationFilter || typeFilter || urgentFilter || verifiedFilter;

  const handleShare = () => {
    const url = window.location.href;
    const title = settings?.app_name || 'Job Connect';
    const text = `Check out these job opportunities on ${title}! 💼✨\n\nLink:`;
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

  const downloadPDF = async () => {
    setIsDownloading(true);
    try {
      const role = localStorage.getItem('role');
      const userId = localStorage.getItem('user_id');
      const params = { ...Object.fromEntries(searchParams), limit: 1000, page: 1 };
      if (role === 'candidate' && userId) {
        params.candidate_id = userId;
      }
      const res = await axios.get('/api/jobs', { params });
      const allJobs = res.data.jobs || [];

      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Load Logo to get aspect ratio
      const logoUrl = '/logo.png';
      const getLogoDimensions = () => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const ratio = img.width / img.height;
            resolve({ width: img.width, height: img.height, ratio });
          };
          img.onerror = () => resolve(null);
          img.src = logoUrl;
        });
      };

      const logoInfo = await getLogoDimensions();
      
      // Header - Compact & Clean
      // Left: Logo
      if (logoInfo) {
        const targetWidth = 20; // Reduced from 30
        const targetHeight = targetWidth / logoInfo.ratio;
        doc.addImage(logoUrl, 'PNG', 14, 8, targetWidth, targetHeight);
      }
      
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.setFontSize(8); // Reduced 50% from 14-16 range
      doc.setFont('helvetica', 'bold');
      doc.text('JOB VACANCY LIST', 196, 12, { align: 'right' });
      
      doc.setFontSize(6); // Further reduced
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 196, 16, { align: 'right' });
      doc.text(`Total Vacancies: ${allJobs.length}`, 196, 19, { align: 'right' });

      // Horizontal separator
      doc.setDrawColor(241, 245, 249); // Slate-100
      doc.line(14, 24, 196, 24);

      const tableColumn = ["#", "Job Title", "Employer", "Contact Details", "Location", "Address", "Expires", "Vacancies"];
      const tableRows = [];

      allJobs.forEach((job, index) => {
        const contactInfo = [
          job.contact_person || 'HR Dept',
          job.contact_phone || ''
        ].filter(Boolean).join('\n');

        const jobData = [
          index + 1,
          job.title,
          job.company_name || 'Login to view',
          contactInfo || 'N/A',
          job.location,
          job.address || '---',
          formatDateSafely(job.expiry_date, { day: '2-digit', month: 'short' }),
          `${job.vacancies_count || 1} Nos`
        ];
        tableRows.push(jobData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        styles: { 
          fontSize: 6.5,
          cellPadding: 1.2,
          valign: 'middle',
          overflow: 'linebreak',
          textColor: [51, 65, 85] // Slate-700
        },
        headStyles: {
          fillColor: [255, 255, 255], // White background
          textColor: [15, 23, 42], // Slate-900
          fontSize: 6.5,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [226, 232, 240] // Slate-200
        },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold', textColor: [37, 99, 235] }, // Blue-600 for title
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
          4: { cellWidth: 18 },
          5: { cellWidth: 'auto' }, // Let address take remaining space
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 14, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255] // Removed striped background
        },
        margin: { top: 28, left: 10, right: 10 },
        tableWidth: 'auto',
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.internal.getNumberOfPages();
          const pageCurrent = doc.internal.getCurrentPageInfo().pageNumber;
          
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184); // Slate-400
          
          // Use dynamic footer from settings or fallback
          const rawFooter = settings?.pdf_footer_text || "by Local Municipal Authority. Powered by eglobe IT Solutions.";
          const cleanFooter = rawFooter.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          
          const year = new Date().getFullYear();
          const appName = settings?.app_name || "JobConnect";
          const fullFooter = `© ${year} ${appName} • ${cleanFooter}`;
          const currentUrl = window.location.href;
          
          doc.text(fullFooter, 14, 287);
          doc.setFontSize(6);
          doc.setTextColor(100, 116, 139); // Slate-500
          doc.text(`Search Filters: ${currentUrl}`, 14, 291);
          
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184); // Slate-400
          doc.text(`Page ${pageCurrent} of ${pageCount}`, 196, 287, { align: 'right' });
        }
      });

      doc.save(`Job_Vacancies_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const isLoggedIn = !!localStorage.getItem('role');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('user_id');
  
  const [candidateApplications, setCandidateApplications] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicationResult, setApplicationResult] = useState(null);

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

  useEffect(() => {
    fetchCandidateApplications();
  }, [role, userId]);

  const handleOpenApplyModal = (job) => {
    setSelectedJobForApply(job);
    setShowApplyModal(true);
  };

  const handleApplySuccess = (data) => {
    if (data.success) {
      setApplicationResult({
        token_number: data.token_number,
        token_slot_date: data.token_slot_date,
        token_slot_time: data.token_slot_time,
        job_title: selectedJobForApply.title,
        company_name: selectedJobForApply.company_name,
        company_address: selectedJobForApply.address,
        job_location: selectedJobForApply.location,
        job_post_id: selectedJobForApply.job_post_id,
        candidate_name: data.candidate_name,
        candidate_phone: data.candidate_phone
      });
      setShowSuccessModal(true);
      setJobs(prevJobs => prevJobs.map(j => j.id === selectedJobForApply.id ? { ...j, applied_count: j.applied_count + 1 } : j));
      fetchCandidateApplications();
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] pb-20">
      <div className="bg-blue-50 border-b border-blue-100 py-10 mb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <Filter size={20} />
              </div>
              {companyFilter ? `Jobs at "${companyFilter}"` : searchFilter ? `Search: "${searchFilter}"` : 'Job Opportunities'} 
              <span className="text-blue-600 font-medium ml-1">({total})</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              
              {hasAnyFilter && (
                <button 
                  onClick={clearAllFilters}
                  className="h-10 px-4 flex items-center gap-2 bg-white text-orange-600 rounded-xl text-sm font-bold border border-orange-200 hover:bg-orange-50 transition-all shadow-sm"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative group flex-grow">
                <input 
                  type="text" 
                  placeholder="Search jobs or companies..."
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 font-semibold shadow-sm"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
              <button 
                type="submit" 
                className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
              >
                <Search size={20} />
                Search
              </button>
            </form>

            <div className="flex flex-col lg:flex-row flex-wrap lg:items-center gap-4">
              <div className="text-slate-500 font-bold text-sm uppercase tracking-wider shrink-0 lg:mb-0 mb-1 ml-1">Filter by</div>
              
              {/* Primary Region Filter */}
              <div className="relative flex-1 min-w-[200px]">
                <select 
                  className="w-full h-14 px-5 pr-12 rounded-2xl bg-white border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 font-semibold appearance-none cursor-pointer shadow-sm"
                  value={selectedPrimary}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateLocationFilters(val, '');
                  }}
                >
                  <option value="">All Regions / Districts</option>
                  {locations.filter(l => !l.parent_id).map(parent => (
                    <option key={parent.id} value={parent.name}>{parent.name}</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Sub-place / Area Filter */}
              <div className="relative flex-1 min-w-[200px]">
                <select 
                  className="w-full h-14 px-5 pr-12 rounded-2xl bg-white border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 font-semibold appearance-none cursor-pointer shadow-sm disabled:opacity-60 disabled:bg-slate-50/50 disabled:cursor-not-allowed"
                  value={selectedSubPlace}
                  disabled={!selectedPrimary}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateLocationFilters(selectedPrimary, val);
                  }}
                >
                  <option value="">{selectedPrimary ? "All Areas / Sub-places" : "Select Region First"}</option>
                  {subPlaces.map(child => (
                    <option key={child.id} value={child.name}>{child.name}</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative flex-1 min-w-[200px]" ref={typeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  className="w-full h-14 px-5 pr-12 rounded-2xl bg-white border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 font-semibold flex items-center justify-between shadow-sm text-left select-none relative"
                >
                  <span className="truncate">
                    {activeTypes.length === 0 ? "All Job Types" : activeTypes.join(', ')}
                  </span>
                  <ChevronDown size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    {['Full-time', 'Part-time', 'Contract', 'Daily Wages'].map(type => {
                      const isChecked = activeTypes.includes(type);
                      return (
                        <label 
                          key={type} 
                          className="flex items-center gap-3 cursor-pointer group hover:bg-slate-50 p-2 rounded-xl transition-colors select-none"
                        >
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-300 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer bg-white"
                              checked={isChecked}
                              onChange={() => handleToggleType(type)}
                            />
                            <Check size={12} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white scale-0 peer-checked:scale-100 transition-transform" />
                          </div>
                          <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                            {type}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6 px-2 lg:ml-2 shrink-0">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="peer appearance-none w-6 h-6 rounded-lg border-2 border-slate-300 checked:bg-red-600 checked:border-red-600 transition-all cursor-pointer bg-white"
                      checked={urgentFilter}
                      onChange={(e) => updateFilter('urgent', e.target.checked ? 'true' : '')}
                    />
                    <Check size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 group-hover:text-red-600 transition-colors">Only Urgent</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="peer appearance-none w-6 h-6 rounded-lg border-2 border-slate-300 checked:bg-green-600 checked:border-green-600 transition-all cursor-pointer bg-white"
                      checked={verifiedFilter}
                      onChange={(e) => updateFilter('verified', e.target.checked ? 'true' : '')}
                    />
                    <Check size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 group-hover:text-green-600 transition-colors">Verified Only</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row items-stretch md:items-center gap-4 relative z-10 pointer-events-auto">
            <div className="hidden sm:flex flex-grow min-w-0 h-9 border border-slate-200/80 rounded-xl flex-row items-center gap-2 overflow-hidden">
              <div className="hidden sm:flex items-center px-4 text-slate-400 shrink-0">
                <Share2 size={14} />
              </div>
              <div className="flex-grow min-w-0 truncate text-xs text-slate-500 font-mono px-2 select-all">
                {window.location.href}
              </div>
              <button 
                onClick={handleShare}
                className={`h-9 w-28 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shrink-0 cursor-pointer ${
                  copied 
                    ? 'text-green-600 bg-green-50/50' 
                    : 'text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                {copied ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} strokeWidth={2.5} />}
                <span className="w-12 text-left">{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>

            {/* Mobile Share Link Option */}
            <button 
              onClick={handleShare}
              className={`flex sm:hidden h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold border transition-all shrink-0 cursor-pointer ${
                copied 
                  ? 'text-green-600 bg-green-50 border-green-200' 
                  : 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'
              }`}
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              {copied ? 'Link Copied' : 'Share Link'}
            </button>

            <button 
              onClick={downloadPDF}
              disabled={isDownloading || jobs.length === 0}
              className="hidden md:flex h-9 px-4 items-center gap-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isDownloading ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {isDownloading ? 'Generating...' : 'Download'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 w-full">

      {/* List logic */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-slate-50/80 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
              <Briefcase size={36} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-2 shadow-lg border border-slate-100">
              <SearchX size={18} className="text-slate-400" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">No Jobs Found</h3>
          <p className="text-slate-500 font-medium text-sm max-w-sm text-center mb-6 leading-relaxed">
            We couldn't find any job opportunities matching your current search criteria.
          </p>
          {hasAnyFilter && (
            <button 
              onClick={clearAllFilters} 
              className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div key={job.id} className={`bg-white pt-8 px-5 pb-5 rounded-2xl border border-slate-100 shadow-sm transition-shadow relative ${
                job.is_token_based 
                  ? 'border-l-4 border-l-indigo-600 shadow-indigo-50/40 bg-gradient-to-br from-white to-indigo-50/10' 
                  : ''
              }`}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  {!!job.is_urgent && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-md z-10 animate-pulse">
                      Urgent
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h3>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <p className="text-blue-600 font-bold text-sm">
                        {isLoggedIn ? job.company_name : "Login to see the details"}
                      </p>
                      {isLoggedIn && (
                        job.is_gst_verified === 1 ? (
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border border-blue-100 shadow-sm whitespace-nowrap">
                            <ShieldCheck size={10} strokeWidth={3} />
                            GST Verified
                          </span>
                        ) : job.is_verified === 1 ? (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100 shadow-sm whitespace-nowrap">
                            <ShieldCheck size={10} strokeWidth={3} />
                            Verified by Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border border-amber-100 shadow-sm whitespace-nowrap">
                            <Clock size={10} strokeWidth={3} />
                            Not Verified
                          </span>
                        )
                      )}
                      {!!job.is_token_based && (
                        <span className="flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap">
                          🎫 Token Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 font-semibold mb-3">
                      {job.job_post_id && <span>ID: {job.job_post_id}</span>}
                      {(job.job_post_id && job.qualification) && <span className="text-slate-200 font-light">|</span>}
                      {job.qualification && <span>Qualification: <span className="text-slate-700 font-bold">{job.qualification}</span></span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap md:justify-end gap-2 text-xs md:text-sm text-slate-500 md:mt-1">
                    {isLoggedIn && (
                      <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                        <MapPin size={16} className="text-slate-400" />
                        {resolveLocation(job.location)}
                      </span>
                    )}
                    {job.job_type && job.job_type.split(',').map((type, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 font-semibold text-slate-600">
                        {type.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-4">
                  {/* Requirements Grid */}
                  <div className={`grid grid-cols-2 ${
                    job.is_token_based && job.age_range ? 'sm:grid-cols-5' : 
                    job.is_token_based || job.age_range ? 'sm:grid-cols-4' : 
                    'sm:grid-cols-3'
                  } gap-4`}>
                    <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 transition-colors duration-200">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Vacancies</span>
                      </div>
                      <p className="text-sm font-black text-slate-800">{job.vacancies_count || 1} <span className="text-xs font-bold text-slate-400">Nos</span></p>
                    </div>
                    <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 transition-colors duration-200">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Salary ({settings?.currency_code || 'INR'})</span>
                      </div>
                      <p className="text-sm font-black text-emerald-600 truncate" title={job.salary_range || 'Not Disclosed'}>{formatSalary(job.salary_range)}</p>
                    </div>
                    {job.age_range && (
                      <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 transition-colors duration-200">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Age Limit</span>
                        </div>
                        <p className="text-sm font-black text-slate-800">{job.age_range}</p>
                      </div>
                    )}
                    <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 transition-colors duration-200">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Apply Before</span>
                      </div>
                      <p className="text-sm font-black text-rose-500">{formatDateSafely(job.expiry_date)}</p>
                    </div>
                    {!!job.is_token_based && (
                      <div className="border rounded-xl p-3 transition-colors duration-200 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 shadow-sm shadow-indigo-50/50">
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            ((job.token_count || 0) - (job.applied_count || 0) > 0) ? 'bg-indigo-600 animate-pulse' : 'bg-rose-500'
                          }`}></span>
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-700">
                            Token Limit
                          </span>
                        </div>
                        <p className={`text-sm font-black ${
                          ((job.token_count || 0) - (job.applied_count || 0) > 0) ? 'text-indigo-700' : 'text-rose-500'
                        }`}>
                          {`${Math.max(0, (job.token_count || 0) - (job.applied_count || 0))} Left of ${job.token_count || 0}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Contact Details on Left, Action Buttons on Right */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Contact details */}
                    {isLoggedIn ? (
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <User size={15} />
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold leading-none mb-1">Contact Person</p>
                            <p className="text-xs font-bold text-slate-800 leading-none">{job.contact_person || 'HR Dept'}</p>
                          </div>
                        </div>

                        {job.contact_phone && (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50/50 border border-blue-100/30 flex items-center justify-center text-blue-500 shrink-0">
                              <Phone size={14} />
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold leading-none mb-1">Phone Number</p>
                              <a href={`tel:${job.contact_phone}`} className="text-xs font-black text-blue-600 hover:text-blue-700 transition-colors leading-none font-mono">
                                {job.contact_phone}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <AlertCircle size={14} className="shrink-0 text-slate-300" />
                        Login to see contact details
                      </div>
                    )}

                    {/* Right: Action Buttons */}
                    <div className="flex gap-3 shrink-0">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="w-32 sm:w-36 h-10 flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-blue-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 bg-white shadow-sm"
                      >
                        View Details
                      </Link>

                      {isLoggedIn && role === 'candidate' && !!job.is_token_based && (
                        <div className="w-32 sm:w-36">
                          {Array.isArray(candidateApplications) && candidateApplications.some(app => app.job_id === job.id) ? (
                            <div className="w-full h-10 bg-emerald-50 border border-emerald-200 text-emerald-700 text-center text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
                              <Check size={14} strokeWidth={3} className="text-emerald-600" />
                              Applied
                            </div>
                          ) : ((job.token_count || 0) - (job.applied_count || 0) > 0) ? (
                            <button
                              onClick={() => handleOpenApplyModal(job)}
                              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-center text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                            >
                              Interested
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full h-10 bg-slate-100 text-slate-400 text-center text-xs font-black uppercase tracking-widest rounded-xl cursor-not-allowed border border-slate-200"
                            >
                              Filled
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 md:px-4 py-2 border border-slate-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all text-sm md:text-base font-medium"
              >
                Previous
              </button>
              
              <div className="flex flex-wrap justify-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-bold text-sm md:text-base transition-all ${
                      page === i + 1 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 md:px-4 py-2 border border-slate-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all text-sm md:text-base font-medium"
              >
                Next
              </button>
            </div>
          )}
        </>
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
        job={selectedJobForApply}
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
  </div>
  );
};

export default JobList;
