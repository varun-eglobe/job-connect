import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, 
  ChevronRight, 
  Briefcase, 
  Search, 
  CheckCircle2, 
  X, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Mail, 
  RotateCcw,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const CompanyList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFilter = searchParams.get('search') || '';
  
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchFilter);
  
  // Advanced filters state
  const [verificationFilter, setVerificationFilter] = useState('all'); // 'all', 'gst', 'admin', 'unverified'
  const [jobFilter, setJobFilter] = useState('all'); // 'all', 'has_jobs', 'no_jobs'
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc', 'name_desc', 'jobs_desc', 'jobs_asc'

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/employers', {
        params: { search: searchFilter }
      });
      setCompanies(response.data);
    } catch (err) {
      console.error("Error fetching companies", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ search: searchInput.trim() });
    } else {
      setSearchParams({});
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams({});
    setVerificationFilter('all');
    setJobFilter('all');
    setSortBy('name_asc');
  };

  // Perform in-memory filtering and sorting for instant reactivity
  const filteredAndSortedCompanies = companies
    .filter(company => {
      if (verificationFilter === 'verified') return company.is_verified === 1 || company.is_gst_verified === 1;
      if (verificationFilter === 'unverified') return company.is_verified !== 1 && company.is_gst_verified !== 1;
      return true;
    })
    .filter(company => {
      if (jobFilter === 'has_jobs') return company.job_count > 0;
      if (jobFilter === 'no_jobs') return company.job_count === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.company_name || '').localeCompare(b.company_name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.company_name || '').localeCompare(a.company_name || '');
      }
      if (sortBy === 'jobs_desc') {
        return b.job_count - a.job_count;
      }
      if (sortBy === 'jobs_asc') {
        return a.job_count - b.job_count;
      }
      return 0;
    });

  const hasActiveFilters = searchFilter || verificationFilter !== 'all' || jobFilter !== 'all' || sortBy !== 'name_asc';

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-slate-50/50">
      {/* Full Width Banner with Search */}
      <div className="bg-blue-50 border-b border-blue-100 py-16 mb-8 relative overflow-hidden">
        {/* Decorative background vectors */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-100/30 rounded-full blur-3xl -ml-40 -mb-40" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="flex items-center gap-3 text-blue-600 font-black text-xs uppercase tracking-widest mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Building2 size={16} />
            </div>
            Verified Employers
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Employer Directory</h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl mb-8 font-medium">
            Browse active organizations listing job openings, verifying credentials, and creating regional employment opportunities.
          </p>
          
          <form onSubmit={handleSearchSubmit} className="max-w-2xl flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative group flex-grow">
              <input 
                type="text" 
                placeholder="Search companies"
                className="w-full h-14 pl-12 pr-12 bg-white rounded-2xl border border-slate-200 outline-none text-slate-800 font-semibold placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              {searchInput && (
                <button 
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <button 
              type="submit" 
              className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search size={20} />
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 w-full">
        {/* Filters Controls Panel */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-wider">
              <SlidersHorizontal size={16} className="text-blue-600" />
              Filter & Sort Results
            </div>
            {hasActiveFilters && (
              <button 
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-red-500 transition-all cursor-pointer"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Filter by Verification */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Verification Status</label>
              <div className="relative">
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700 cursor-pointer appearance-none animate-none"
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Pending Verification</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <ArrowUpDown size={14} />
                </div>
              </div>
            </div>

            {/* Filter by Jobs availability */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Active Jobs</label>
              <div className="relative">
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700 cursor-pointer appearance-none animate-none"
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                >
                  <option value="all">All Vacancy Statuses</option>
                  <option value="has_jobs">Has Active Openings</option>
                  <option value="no_jobs">No Active Openings</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <ArrowUpDown size={14} />
                </div>
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sort Results</label>
              <div className="relative">
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700 cursor-pointer appearance-none animate-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name_asc">Company Name (A - Z)</option>
                  <option value="name_desc">Company Name (Z - A)</option>
                  <option value="jobs_desc">Most Active Jobs</option>
                  <option value="jobs_asc">Least Active Jobs</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <ArrowUpDown size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500 px-4">
          <div>
            Showing {filteredAndSortedCompanies.length} of {companies.length} employers
          </div>
          {searchFilter && (
            <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[10px]">
              Keyword: "{searchFilter}"
            </div>
          )}
        </div>

        {/* Main Table / List Card View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold uppercase tracking-wider text-xs">Syncing Directory...</span>
          </div>
        ) : filteredAndSortedCompanies.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 text-center py-24 shadow-sm px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
              <Building2 size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">No Employers Found</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              Adjust your search keywords or remove filters to find the organizations you are looking for.
            </p>
            {hasActiveFilters && (
              <button 
                onClick={resetFilters} 
                className="px-6 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} />
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-5 px-8">Company Name</th>
                    <th className="py-5 px-6">Verification</th>
                    <th className="py-5 px-6">Contact Email</th>
                    <th className="py-5 px-6 text-center">Active Openings</th>
                    <th className="py-5 px-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50/40 transition-colors group">
                      {/* Company Name */}
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all duration-300 shrink-0">
                            <Building2 size={18} />
                          </div>
                          <Link 
                            to={`/employers/${company.id}`}
                            className="font-black text-slate-800 hover:text-blue-600 transition-colors text-base truncate block max-w-[200px]"
                          >
                            {company.company_name}
                          </Link>
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="py-4 px-6">
                        {company.is_gst_verified === 1 || company.is_verified === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-wider rounded-full border border-green-100">
                            <CheckCircle2 size={12} className="fill-green-50" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-slate-100">
                            <HelpCircle size={12} />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Contact Email */}
                      <td className="py-4 px-6">
                        <span className="flex items-center gap-2 text-slate-500 text-sm font-semibold select-all">
                          <Mail size={14} className="text-slate-300 shrink-0" />
                          {company.email || '—'}
                        </span>
                      </td>

                      {/* Active Openings Count */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter ${
                          company.job_count > 0 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100'
                        }`}>
                          <Briefcase size={12} />
                          {company.job_count} Jobs
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-8 text-right">
                        <Link 
                          to={`/employers/${company.id}`}
                          className="inline-flex items-center justify-center gap-1 bg-slate-50 text-slate-700 hover:bg-blue-600 hover:text-white px-4 h-9 rounded-xl text-xs font-bold transition-all group-hover:shadow-sm"
                        >
                          Profile
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Instead of table to keep responsive) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredAndSortedCompanies.map((company) => (
                <div key={company.id} className="p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                        <Building2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <Link 
                          to={`/employers/${company.id}`}
                          className="font-black text-slate-800 hover:text-blue-600 transition-colors text-base truncate block"
                        >
                          {company.company_name}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-semibold select-all block mt-0.5">{company.email || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-2">
                    {/* Verification Status */}
                    <div>
                      {company.is_gst_verified === 1 || company.is_verified === 1 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-green-100">
                          <CheckCircle2 size={10} className="fill-green-50" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-wider rounded-full border border-slate-100">
                          <HelpCircle size={10} />
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Openings count */}
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        company.job_count > 0 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}>
                        <Briefcase size={10} />
                        {company.job_count} Jobs
                      </span>
                    </div>
                  </div>

                  {/* Profile action */}
                  <Link 
                    to={`/employers/${company.id}`}
                    className="w-full bg-slate-50 text-slate-700 hover:bg-blue-600 hover:text-white rounded-xl h-10 flex items-center justify-center font-bold text-sm transition-all border border-slate-100 mt-2"
                  >
                    View Employer Profile
                  </Link>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyList;
