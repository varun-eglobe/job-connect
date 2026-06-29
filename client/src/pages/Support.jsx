import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Phone, HelpCircle, Map as MapIcon, Search, ChevronDown, X } from 'lucide-react';

const Support = () => {
  const [helpdesks, setHelpdesks] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  useEffect(() => {
    document.title = 'Help & Support Center - Job Connect';
    const fetchData = async () => {
      try {
        const [helpRes, locRes] = await Promise.all([
          axios.get('/api/helpdesks'),
          axios.get('/api/locations')
        ]);
        setHelpdesks(helpRes.data || []);
        setLocations(locRes.data || []);
      } catch (err) {
        console.error("Error fetching support data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-20">
      <div className="bg-blue-50 rounded-3xl p-8 text-blue-950 mb-10 overflow-hidden relative border border-blue-100">
        <HelpCircle className="absolute -right-6 -top-6 w-48 h-48 opacity-10 text-blue-600" />
        <h1 className="text-3xl font-bold mb-2 text-blue-900">Offline Helpdesk for Candidates</h1>
        <p className="text-blue-700 max-w-md font-medium">
          Need help registering or finding a job? Visit our physical helpdesks located across your region.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search helpdesks by name, address, or phone..." 
            className="w-full h-12 pl-12 pr-10 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold text-slate-700"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <select 
            className="w-full h-12 pl-5 pr-10 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
            value={selectedLocationId}
            onChange={e => setSelectedLocationId(e.target.value)}
          >
            <option value="">All Primary Places</option>
            {locations.filter(l => !l.parent_id).map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <MapIcon size={22} className="text-blue-600" />
            Support Locations Near You
          </h2>

          {loading ? (
            <div className="text-slate-400 italic">Finding locations...</div>
          ) : (
            (() => {
              const allPrimaryLocations = locations.filter(l => !l.parent_id);
              
              // Filter helpdesks by searchQuery and selectedLocationId
              const filteredHelpdesks = helpdesks.filter(hd => {
                if (selectedLocationId && String(hd.location_id) !== String(selectedLocationId)) {
                  return false;
                }
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  const nameMatch = hd.name?.toLowerCase().includes(q);
                  const addrMatch = hd.address?.toLowerCase().includes(q);
                  const phoneMatch = hd.contact_info?.toLowerCase().includes(q);
                  const locMatch = hd.location_name?.toLowerCase().includes(q);
                  return nameMatch || addrMatch || phoneMatch || locMatch;
                }
                return true;
              });

              const primaryLocations = allPrimaryLocations.filter(loc => {
                if (selectedLocationId && String(loc.id) !== String(selectedLocationId)) {
                  return false;
                }
                return filteredHelpdesks.some(hd => hd.location_id === loc.id);
              });
              
              const unassignedHelpdesks = filteredHelpdesks.filter(hd => {
                if (selectedLocationId) {
                  return false;
                }
                return !hd.location_id || !allPrimaryLocations.some(l => l.id === hd.location_id);
              });
              
              if (primaryLocations.length === 0 && unassignedHelpdesks.length === 0) {
                return (
                  <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl animate-in fade-in duration-300">
                    <HelpCircle className="mx-auto w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-base font-bold text-slate-700 mb-1">No matching locations found</h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">
                      We couldn't find any helpdesks matching your search or location filter.
                    </p>
                    {(searchQuery || selectedLocationId) && (
                      <button 
                        onClick={() => { setSearchQuery(''); setSelectedLocationId(''); }}
                        className="mt-4 px-5 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-8">
                  {primaryLocations.map(loc => {
                    const items = filteredHelpdesks.filter(hd => hd.location_id === loc.id);
                    return (
                      <div key={loc.id} className="space-y-4">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                          <MapPin size={16} className="text-blue-500 shrink-0" />
                          {loc.name}
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full normal-case">
                            {items.length} {items.length === 1 ? 'helpdesk' : 'helpdesks'}
                          </span>
                        </h3>
                        <div className="grid gap-4">
                          {items.map((center) => (
                            <div key={center.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-200 group">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900">{center.name}</h3>
                                <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
                                  <MapPin size={14} className="shrink-0" />
                                  {center.address}
                                </div>
                              </div>
                              
                              <a 
                                href={`tel:${center.contact_info ? (center.contact_info.startsWith('+') ? center.contact_info : '+' + center.contact_info) : ''}`} 
                                className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-black transition-all shrink-0"
                              >
                                <Phone size={16} />
                                {center.contact_info ? (center.contact_info.startsWith('+') ? center.contact_info : '+' + center.contact_info) : ''}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {unassignedHelpdesks.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                        <HelpCircle size={16} className="text-slate-400 shrink-0" />
                        Other Locations
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full normal-case">
                          {unassignedHelpdesks.length} {unassignedHelpdesks.length === 1 ? 'helpdesk' : 'helpdesks'}
                        </span>
                      </h3>
                      <div className="grid gap-4">
                        {unassignedHelpdesks.map((center) => (
                          <div key={center.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-200 group">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">{center.name}</h3>
                              <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
                                <MapPin size={14} className="shrink-0" />
                                {center.address}
                              </div>
                            </div>
                            
                            <a 
                              href={`tel:${center.contact_info ? (center.contact_info.startsWith('+') ? center.contact_info : '+' + center.contact_info) : ''}`} 
                              className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-black transition-all shrink-0"
                            >
                              <Phone size={16} />
                              {center.contact_info ? (center.contact_info.startsWith('+') ? center.contact_info : '+' + center.contact_info) : ''}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </section>

        <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">How it works?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
              <p className="text-slate-600 leading-relaxed font-medium">Visit any Ward Councilor or Panchayat office.</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
              <p className="text-slate-600 leading-relaxed font-medium">Ask for the 'Job Connect' helpdesk volunteer.</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
              <p className="text-slate-600 leading-relaxed font-medium">They will help you register and search for jobs on-site.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Support;
