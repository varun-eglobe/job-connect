import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, ChevronRight, Briefcase, Search, CheckCircle2, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const CompanyList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFilter = searchParams.get('search') || '';
  
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchFilter);
  const isLoggedIn = !!localStorage.getItem('role');

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

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Full Width Banner with Search */}
      <div className="bg-blue-50 border-b border-blue-100 py-16 mb-10 relative">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-4 text-blue-600 font-black text-xs uppercase tracking-widest mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Building2 size={16} />
            </div>
            Verified Employers
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Featured Employers</h1>
          
          <form onSubmit={handleSearchSubmit} className="max-w-2xl flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative group flex-grow">
              <input 
                type="text" 
                placeholder="Search companies by name..."
                className="w-full h-14 pl-12 pr-4 bg-white rounded-2xl border-2 border-slate-200 outline-none text-slate-800 font-bold placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 transition-all shadow-sm"
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
              className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              <Search size={20} />
              Search
            </button>
          </form>
          
          <p className="text-slate-500 text-sm mt-4 italic font-medium">
            Find active organizations creating impact in your region.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 w-full">
        {searchFilter && (
           <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
             <div className="text-sm font-bold text-slate-600">
               Showing results for <span className="text-blue-600">"{searchFilter}"</span> ({companies.length})
             </div>
             <button onClick={clearSearch} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">Clear</button>
           </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="font-bold">Fetching verified partners...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[32px] border-2 border-dashed border-slate-100 italic">
            <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500">
              {searchFilter ? `No companies found matching "${searchFilter}"` : "No organizations currently list active vacancies."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {companies.map((company) => (
              <div key={company.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group relative overflow-hidden">

                
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      <Building2 size={32} />
                    </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      {company.company_name}
                      {company.is_gst_verified === 1 ? (
                        <CheckCircle2 size={18} className="text-blue-600 fill-blue-50" title="GST Verified Employer" />
                      ) : company.is_verified === 1 ? (
                        <CheckCircle2 size={18} className="text-green-600 fill-green-50" title="Verified by Admin" />
                      ) : null}
                    </h3>
                  </div>
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full">
                    <Briefcase size={14} />
                    {company.job_count} Active Jobs
                  </div>
                  <Link 
                    to={`/employers/${company.id}`} 
                    className="text-sm font-bold text-slate-900 flex items-center gap-1 group-hover:gap-2 transition-all hover:text-blue-600"
                  >
                    View Profile
                    <ChevronRight size={16} />
                  </Link>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyList;
