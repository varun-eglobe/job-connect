import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Building2 } from 'lucide-react';
import axios from 'axios';

const TypewriterInput = ({ search, setSearch, handleSearch }) => {
  const [placeholder, setPlaceholder] = useState('');
  const keywords = ['Plumber', 'Clerk', 'Nurse', 'Driver', 'Security Guard', 'Delivery Boy', 'Cook'];
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typeSpeed, setTypeSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const current = wordIndex % keywords.length;
      const fullText = keywords[current];

      if (isDeleting) {
        setPlaceholder(fullText.substring(0, placeholder.length - 1));
        setTypeSpeed(50);
      } else {
        setPlaceholder(fullText.substring(0, placeholder.length + 1));
        setTypeSpeed(50);
      }

      if (!isDeleting && placeholder === fullText) {
        setTimeout(() => setIsDeleting(true), 1000);
      } else if (isDeleting && placeholder === '') {
        setIsDeleting(false);
        setWordIndex(wordIndex + 1);
        setTypeSpeed(500);
      }
    };

    const timer = setTimeout(handleType, typeSpeed);
    return () => clearTimeout(timer);
  }, [placeholder, isDeleting, wordIndex, typeSpeed]);

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl flex flex-col md:flex-row gap-4 z-10">
      <div className="relative group flex-grow">
        <input
          type="text"
          placeholder={`Search for ${placeholder}`}
          className="w-full h-16 pl-14 pr-4 rounded-2xl border-2 border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-lg shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
      </div>
      <button
        type="submit"
        className="w-full md:w-auto px-8 md:px-12 h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-[0.98] text-lg flex items-center justify-center gap-3 shrink-0"
      >
        <Search size={24} />
        Search
      </button>
    </form>
  );
};

const Landing = () => {
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [csrPartners, setCsrPartners] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, testimonialRes, csrRes] = await Promise.all([
          axios.get('/api/settings'),
          axios.get('/api/testimonials'),
          axios.get('/api/csr-partners')
        ]);
        setSettings(settingsRes.data || {});
        setTestimonials(testimonialRes.data);
        


        // Shuffle CSR Partners
        const shuffled = [...csrRes.data].sort(() => Math.random() - 0.5);
        setCsrPartners(shuffled);
      } catch (err) {
        console.error("Data fetch failed", err);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/jobs?search=${search}`);
  };

  return (
    <div className="flex flex-col items-center text-center relative min-h-screen">
      <div className="home-banner w-full flex flex-col items-center z-10">
        {settings ? (
          <div
            className="w-full max-w-4xl mb-6 md:mb-8 text-center banner-content transition-all duration-500 ease-out"
            dangerouslySetInnerHTML={{
              __html: settings.banner_title || ''
            }}
          />
        ) : (
          <div className="w-full max-w-4xl mb-6 md:mb-8 h-[240px] md:h-[180px] flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center space-y-4 w-full">
              <div className="h-6 bg-slate-200/60 rounded-full w-1/4"></div>
              <div className="h-12 bg-slate-200/60 rounded-full w-2/3"></div>
              <div className="h-4 bg-slate-200/60 rounded-full w-1/2"></div>
            </div>
          </div>
        )}

        <TypewriterInput search={search} setSearch={setSearch} handleSearch={handleSearch} />

      </div>

      <div className="w-full bg-blue-50 py-16 md:py-24 border-y border-blue-100/50 flex justify-center mb-16 md:mb-24 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
          <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-xl hover:translate-y-[-4px]">
            <div className="text-blue-600 mb-2 font-black text-3xl tracking-tight">{settings?.box1_title || '1,200+'}</div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">{settings?.box1_text || 'Active Openings'}</div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-xl hover:translate-y-[-4px]">
            <div className="text-blue-600 mb-2 font-black text-3xl tracking-tight">{settings?.box2_title || 'Verified'}</div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">{settings?.box2_text || 'Local Businesses'}</div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-xl hover:translate-y-[-4px]">
            <div className="text-blue-600 mb-2 font-black text-3xl tracking-tight">{settings?.box3_title || 'Free'}</div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">{settings?.box3_text || 'Candidate Registration'}</div>
          </div>
        </div>
      </div>


      {testimonials.length > 0 && (
        <div className="w-full max-w-5xl mb-5 z-10 px-4">
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="h-0.5 w-12 bg-blue-600"></div>
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Voices of Leadership</h2>
            <div className="h-0.5 w-12 bg-blue-600"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, idx) => (
              <div
                key={t.id}
                className={`bg-white p-8 md:p-10 rounded-[3rem] border border-blue-50 shadow-xl shadow-blue-50/20 relative group text-left transition-all hover:translate-y-[-4px] flex flex-col ${testimonials.length === 3 && idx === 0 ? 'md:col-span-2' : ''}`}
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse">
                  <span className="text-3xl font-serif">“</span>
                </div>
                <p className="text-slate-600 text-base italic leading-relaxed mb-8 relative z-10 flex-1">
                  {t.message}
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xl overflow-hidden border-2 border-white shadow-sm">
                    {t.image_url ? (
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      t.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 leading-tight">{t.name}</h4>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{t.designation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSR Funding & Partners Section */}
      {csrPartners.length > 0 && (
        <div className="w-full max-w-5xl px-4 mt-16 md:mt-24 mb-16 md:mb-24 z-10">
          <div className="bg-white p-10 md:p-16 rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:bg-blue-100 transition-colors duration-700"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col items-center mb-12">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900">{settings?.csr_home_title || 'Partners & Support'}</h2>
                <p className="text-slate-500 text-sm mt-3 max-w-xl mx-auto italic leading-relaxed">
                  {settings?.csr_home_subtitle || 'Empowering the local workforce through strategic corporate partnerships and community development initiatives.'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-16 items-center justify-items-center transition-all duration-1000">
                {csrPartners.slice(0, 8).map(partner => (
                  <div key={partner.id} className="w-full h-24 md:h-auto flex flex-col items-center justify-center p-4 md:p-0 bg-white md:bg-transparent rounded-2xl border border-slate-100 md:border-transparent shadow-sm md:shadow-none group/logo transition-all">
                    <img 
                      src={partner.logo_url} 
                      alt={partner.name} 
                      className="h-8 md:h-12 w-auto max-w-[80%] object-contain transition-transform group-hover/logo:scale-110"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <Link 
                  to="/csr-partners" 
                  className="inline-flex items-center gap-2 text-sm font-black text-blue-600 hover:text-blue-700 transition-all uppercase tracking-widest group"
                >
                  View All Partners 
                  <span className="w-8 h-px bg-blue-200 group-hover:w-12 group-hover:bg-blue-600 transition-all"></span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Landing;
