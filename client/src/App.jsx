import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Briefcase, Info, User, LayoutDashboard, Search, LogIn, LogOut, Menu, X as CloseIcon, Settings, Building2 } from 'lucide-react';
import Landing from './pages/Landing';
import JobList from './pages/JobList';
import JobDetail from './pages/JobDetail';
import Register from './pages/Register';
import Support from './pages/Support';
import EmployerDashboard from './pages/EmployerDashboard';
import EmployerSettings from './pages/EmployerSettings';
import CandidateSettings from './pages/CandidateSettings';
import CandidateDashboard from './pages/CandidateDashboard';

import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import ForgotPassword from './pages/ForgotPassword';
import CompanyList from './pages/CompanyList';
import EmployerDetail from './pages/EmployerDetail';
import StaticPage from './pages/StaticPage';
import CSRPartners from './pages/CSRPartners';
import axios from 'axios';
import InstallPrompt from './components/InstallPrompt';
import NetworkStatus from './components/NetworkStatus';
import DbErrorOverlay from './components/DbErrorOverlay';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

const navLinks = [
  { name: 'Search', path: '/', icon: <Search size={20} /> },
  { name: 'Jobs', path: '/jobs', icon: <Briefcase size={20} /> },
  { name: 'Employers', path: '/employers', icon: <Building2 size={20} /> },
];

function Navigation({ appName, logoUrl }) {
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [userName, setUserName] = useState(localStorage.getItem('name'));
  const [companyName, setCompanyName] = useState(localStorage.getItem('company_name'));
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      setRole(localStorage.getItem('role'));
      setUserName(localStorage.getItem('name'));
      setCompanyName(localStorage.getItem('company_name'));
    };
    window.addEventListener('storage', checkAuth);
    const interval = setInterval(checkAuth, 1000);
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    const currentRole = localStorage.getItem('role');
    const secret = localStorage.getItem('admin_login_secret');
    localStorage.clear();
    setRole(null);
    setUserName(null);
    setCompanyName(null);
    if (currentRole === 'admin') {
      window.location.href = secret ? `/admin-login?secret=${secret}` : '/admin-login';
    } else {
      window.location.href = '/login';
    }
  };




  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600 flex items-center gap-2 group" onClick={() => setIsOpen(false)}>
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-8 md:h-8 w-auto object-contain transition-transform group-hover:scale-105" />
          ) : (
            <>
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                <Briefcase size={22} />
              </div>
              <span className="tracking-tight">{appName}</span>
            </>
          )}
        </Link>

        {/* Desktop Nav */}
        <div className="hidden xl:flex gap-1 h-16">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 h-16 flex items-center gap-2 text-sm font-semibold transition-all relative ${isActive
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{link.icon}</span>
                {link.name}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </Link>
            );
          })}

          <div className="flex items-center h-16 px-2">
            <div className="h-6 w-px bg-slate-200" />
          </div>

          {role ? (
            <>
              <div className="flex items-center h-16">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    {role === 'employer' && companyName 
                      ? companyName.charAt(0).toUpperCase() 
                      : (userName ? userName.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <span className="text-sm font-bold truncate max-w-[140px]" title={role === 'employer' && companyName ? companyName : (userName || 'User')}>
                    {role === 'employer' && companyName ? companyName : (userName || 'User')}
                  </span>
                </div>
              </div>
              {role && (
                <Link
                  to={role === 'admin' ? '/admin' : role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard'}
                  className={`px-4 h-16 flex items-center text-sm font-bold transition-all relative ${
                    location.pathname === (role === 'admin' ? '/admin' : role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard')
                      ? 'text-blue-600'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Dashboard
                  {location.pathname === (role === 'admin' ? '/admin' : role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard') && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </Link>
              )}
              <Link
                to={role === 'admin' ? "/admin/settings" : role === 'employer' ? "/employer/settings" : "/candidate/settings"}
                className={`px-3 h-16 flex items-center transition-all relative ${location.pathname.includes('/settings')
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                title="Settings"
              >
                <Settings size={20} />
                {location.pathname.includes('/settings') && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </Link>
              <div className="flex items-center h-16">
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center h-16 gap-3">
              <Link
                to="/login"
                className={`px-4 h-16 flex items-center text-sm font-bold transition-all relative ${location.pathname === '/login' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                Login
                {location.pathname === '/login' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </Link>
              <div className="flex items-center px-1">
                <Link
                  to="/register"
                  className="px-6 h-10 flex items-center text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-100"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="xl:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {isOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <div className={`xl:hidden fixed top-0 right-0 h-full w-[85%] max-w-xs bg-white z-[120] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600 flex items-center gap-2" onClick={() => setIsOpen(false)}>
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 w-auto object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <Briefcase size={18} />
                </div>
                <span className="tracking-tight">{appName}</span>
              </>
            )}
          </Link>
          <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
            <CloseIcon size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-2">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Main Menu</div>
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 text-base font-bold rounded-2xl transition-all ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{link.icon}</span>
                {link.name}
              </Link>
            );
          })}

          <div className="pt-6">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Account</div>
            {role ? (
              <div className="space-y-2">
                 <div className="flex items-center gap-3 px-4 py-4 mb-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-100 shrink-0">
                    {role === 'employer' && companyName 
                      ? companyName.charAt(0).toUpperCase() 
                      : (userName ? userName.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 truncate" title={role === 'employer' && companyName ? companyName : (userName || 'User')}>{role === 'employer' && companyName ? companyName : (userName || 'User')}</div>
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{role}</div>
                  </div>
                </div>
                {role && (
                  <Link
                    to={role === 'admin' ? '/admin' : role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard'}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 text-base font-bold text-blue-600 bg-blue-50 rounded-2xl transition-all"
                  >
                    <LayoutDashboard size={20} />
                    Dashboard
                  </Link>
                )}
                <Link
                  to={role === 'admin' ? "/admin/settings" : role === 'employer' ? "/employer/settings" : "/candidate/settings"}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-base font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-all"
                >
                  <Settings size={20} className="text-slate-400" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3.5 text-base font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all w-full text-left"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-base font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-all"
                >
                  <User size={20} className="text-slate-400" />
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 h-14 text-base font-bold text-white bg-blue-600 rounded-2xl transition-all shadow-lg shadow-blue-200"
                >
                  <LogIn size={20} />
                  Register Now
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-50 text-[10px] text-slate-400 font-medium italic text-center">
          <span>Local Government Authority</span> • {new Date().getFullYear()}
        </div>
      </div>
    </nav>
  );
}

function Footer({ appName, customFooter, initiativeLogo, poweredLogo }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await axios.get('/api/pages');
        setPages(res.data);
      } catch (err) {
        console.error("Footer pages fetch failed", err);
      }
    };
    fetchPages();
  }, []);

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-12 mt-auto">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
          {pages.map(page => (
            <Link
              key={page.id}
              to={`/page/${page.slug}`}
              className="text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
            >
              {page.title}
            </Link>
          ))}
          <Link to="/support" className="text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Support</Link>
        </div>
        <div className="text-slate-500 text-sm mb-6">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-400">
              <span>&copy; {new Date().getFullYear()}</span>
              <span className="text-blue-600">{appName}</span>
              {customFooter && <span className="mx-1 opacity-40">•</span>}
            </div>
            {customFooter ? (
              <div 
                className="footer-dynamic-content"
                dangerouslySetInnerHTML={{ __html: customFooter }} 
              />
            ) : (
              <p>
                by Local Government Authority.
                Powered by <a href="https://eglobeits.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">eglobe IT Solutions</a>.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 pt-6 border-t border-slate-100 mt-6 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
          {initiativeLogo && (
            <>
              <div className="flex flex-col items-center gap-1.5">
                <img src={initiativeLogo} alt="Initiative By" className="h-16 w-auto object-contain" />
              </div>
              <div className="w-px h-8 bg-slate-200" />
            </>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <a href="https://eglobeits.com" target="_blank" rel="noopener noreferrer">
              {poweredLogo ? (
                <img src={poweredLogo} alt="Powered By" className="h-10 w-auto object-contain" />
              ) : (
                <img src="/logos/eglobe_logo.png" alt="eglobe IT Solutions" className="h-10 w-auto" />
              )}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const SplashScreen = ({ isFading, progress }) => (
  <div className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
    <div className="relative flex flex-col items-center">
      <img 
        src="/logos/app_icon.png" 
        alt="App Icon" 
        className="w-28 h-28 mb-10 object-cover bg-white rounded-[1.75rem] shadow-[0_20px_50px_-12px_rgba(37,99,235,0.4)] border border-slate-100" 
      />
      <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  </div>
);

const injectCustomScripts = (settings) => {
  const containers = [
    { code: settings.custom_head_code, id: 'custom-head-container', parent: document.head, insertBefore: null },
    { code: settings.custom_body_open_code, id: 'custom-body-open-container', parent: document.body, insertBefore: document.body.firstChild },
    { code: settings.custom_body_close_code, id: 'custom-body-close-container', parent: document.body, insertBefore: null }
  ];

  containers.forEach(({ code, id, parent, insertBefore }) => {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    if (code && code.trim() !== '') {
      const container = document.createElement('div');
      container.id = id;
      container.style.display = 'none';
      container.innerHTML = code;

      const fragment = document.createDocumentFragment();
      while (container.firstChild) {
        const child = container.firstChild;
        if (child.tagName === 'SCRIPT') {
          const script = document.createElement('script');
          for (let i = 0; i < child.attributes.length; i++) {
            script.setAttribute(child.attributes[i].name, child.attributes[i].value);
          }
          script.text = child.text;
          fragment.appendChild(script);
          container.removeChild(child);
        } else {
          fragment.appendChild(child);
        }
      }

      const wrap = document.createElement('div');
      wrap.id = id;
      wrap.style.display = 'none';
      wrap.appendChild(fragment);

      if (insertBefore) {
        parent.insertBefore(wrap, insertBefore);
      } else {
        parent.appendChild(wrap);
      }
    }
  });
};

function App() {
  const [appName, setAppName] = useState(() => localStorage.getItem('app_name') || 'JobConnect');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('logo_url') || '');
  const [customFooter, setCustomFooter] = useState(() => localStorage.getItem('custom_footer') || '');
  const [initiativeLogo, setInitiativeLogo] = useState('');
  const [poweredLogo, setPoweredLogo] = useState('');
  const [serverError, setServerError] = useState(false);
  const [dbErrorDetails, setDbErrorDetails] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Axios Request Interceptor: attach admin identity headers
    const reqInterceptor = axios.interceptors.request.use(config => {
      const role = localStorage.getItem('role');
      if (role === 'admin') {
        config.headers['x-admin-id']    = localStorage.getItem('user_id') || '';
        config.headers['x-admin-name']  = localStorage.getItem('name') || '';
        config.headers['x-admin-email'] = localStorage.getItem('email') || '';
      }
      return config;
    });

    // Axios Global Interceptor for Server Errors
    const interceptor = axios.interceptors.response.use(
      response => {
        setServerError(false);
        return response;
      },
      error => {
        if (!error.response || error.code === 'ERR_NETWORK') {
          setServerError(true);
        } else if (error.response?.status === 503 && error.response?.data?.code === 'DB_CONNECTION_ERROR') {
          setDbErrorDetails(error.response.data.details || {});
        }
        return Promise.reject(error);
      }
    );

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) return 85; 
        return p + Math.random() * 15;
      });
    }, 100);

    const fetchBranding = async () => {
      try {
        const res = await axios.get('/api/settings');
        if (res.data && res.data.app_name) {
          const newName = res.data.app_name;
          const newLogo = res.data.header_logo_url && res.data.header_logo_url.trim() !== ''
            ? `${res.data.header_logo_url}${res.data.header_logo_url.includes('?') ? '&' : '?'}v=${Date.now()}`
            : '';

          setAppName(newName);
          setLogoUrl(newLogo);
          setCustomFooter(res.data.pdf_footer_text || '');
          setInitiativeLogo(res.data.initiative_logo_url || '');
          setPoweredLogo(res.data.powered_logo_url || '');
          injectCustomScripts(res.data);

          localStorage.setItem('app_name', newName);
          localStorage.setItem('logo_url', newLogo);
          localStorage.setItem('custom_footer', res.data.pdf_footer_text || '');
          if (res.data.admin_login_secret) {
            localStorage.setItem('admin_login_secret', res.data.admin_login_secret);
          } else {
            localStorage.removeItem('admin_login_secret');
          }

          document.title = `${newName} | Job Portal`;

          let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
          if (meta) {
            meta.setAttribute('content', res.data.app_name);
          }

          if (res.data.app_icon_url) {
            let favicon = document.querySelector('link[rel="icon"]');
            if (favicon) {
              favicon.setAttribute('href', res.data.app_icon_url);
            }
            let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
            if (appleIcon) {
              appleIcon.setAttribute('href', res.data.app_icon_url);
            }
          }
        }
      } catch (err) {
        console.error("Branding sync failed", err);
      } finally {
        setProgress(100);
        clearInterval(progressInterval);
        
        setTimeout(() => {
          setFadeSplash(true);
          setTimeout(() => setShowSplash(false), 700); 
        }, 500);
      }
    };

    fetchBranding();

    // Listen for manual updates from Admin Panel
    const handleManualUpdate = () => {
      fetchBranding();
    };
    window.addEventListener('brandingUpdate', handleManualUpdate);

    // Frontend health poller – checks every 5s independent of component requests
    const healthPoller = setInterval(async () => {
      try {
        const res = await axios.get('/api/health', { _skipDbCheck: true });
        if (res.data?.database === 'connected') {
          setDbErrorDetails(null);
        } else {
          setDbErrorDetails(res.data?.details || {});
        }
      } catch (err) {
        const data = err.response?.data;
        if (err.response?.status === 503) {
          setDbErrorDetails(data?.details || { message: data?.error || 'Database offline' });
        }
        // If server is fully down (ERR_NETWORK), serverError handles it
      }
    }, 5000);

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(interceptor);
      clearInterval(progressInterval);
      clearInterval(healthPoller);
      window.removeEventListener('brandingUpdate', handleManualUpdate);
    };
  }, []);

  const handleDbRetry = () => {
    setDbErrorDetails(null);
    window.location.reload();
  };

  return (
    <Router>
      <ScrollToTop />
      {dbErrorDetails ? (
        <DbErrorOverlay details={dbErrorDetails} onRetry={handleDbRetry} />
      ) : (
        <>
          {showSplash && <SplashScreen isFading={fadeSplash} progress={progress} />}
          <div className="min-h-screen bg-slate-50 flex flex-col pb-20 xl:pb-0">
            <Navigation appName={appName} logoUrl={logoUrl} />
            <InstallPrompt />
            <NetworkStatus forceShow={serverError} />

            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/jobs" element={<JobList />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/employers" element={<CompanyList />} />
                <Route path="/employers/:id" element={<EmployerDetail />} />
                <Route path="/companies" element={<Navigate to="/employers" replace />} />
                <Route path="/register" element={<Register />} />
                <Route path="/support" element={<Support />} />
                <Route path="/employer/dashboard" element={<EmployerDashboard />} />
                <Route path="/employer/settings" element={<EmployerSettings />} />
                <Route path="/candidate/settings" element={<CandidateSettings />} />
                <Route path="/candidate/dashboard" element={<CandidateDashboard />} />

                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/settings/:tabId" element={<AdminSettings />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/admin-forgot-password" element={<ForgotPassword isAdmin={true} />} />
                <Route path="/csr-partners" element={<CSRPartners />} />
                <Route path="/page/:slug" element={<StaticPage />} />
              </Routes>
            </main>

            <Footer 
              appName={appName} 
              customFooter={customFooter} 
              initiativeLogo={initiativeLogo}
              poweredLogo={poweredLogo}
            />

            {/* Mobile Bottom Tab Bar */}
            <MobileTabBar />
          </div>
        </>
      )}
    </Router>
  );
}

const MobileTabBar = () => {
  const location = useLocation();
  const role = localStorage.getItem('role');

  const dashboardPath = role === 'admin' ? '/admin' : role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
  const links = [...navLinks];
  if (role) {
    links.push({
      name: 'Dashboard',
      path: dashboardPath,
      icon: <LayoutDashboard size={20} />
    });
  }

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-[100] flex items-center justify-around animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
      {links.map(link => {
        const isActive = location.pathname === link.path;
        return (
          <Link
            key={link.path}
            to={link.path}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all relative ${isActive
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-blue-600'
              }`}
          >
            {isActive && (
              <div className="absolute inset-x-0 inset-y-0 bg-blue-50/50 border-t-2 border-blue-600 animate-in fade-in duration-300 pointer-events-none" />
            )}
            <div className={`transition-all duration-300 z-10 ${isActive ? 'scale-110' : 'opacity-60'}`}>
              {link.icon}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.1em] transition-all z-10 ${isActive ? 'opacity-100 mt-1' : 'opacity-40'}`}>
              {link.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default App;
