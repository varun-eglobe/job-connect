import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Settings, MapPin, Plus, X, ArrowLeft, Layout, FileText, Save, Trash2, Edit3, Globe, Lock, ChevronRight, HelpCircle, Users, ShieldCheck, Mail, Key, GripVertical, ChevronDown, MessageSquare, Building2, Eye, EyeOff, Search, Send, Clock, Activity, Check } from 'lucide-react';

// Custom Wrapper for Quill to handle React 19 stability via CDN
const WYSIWYG = ({ value, onChange, placeholder }) => {
    const editorRef = useRef(null);
    const quillInstance = useRef(null);
    const lastValueRef = useRef(value || '');
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const initQuill = () => {
            if (window.Quill && editorRef.current && !quillInstance.current) {
                quillInstance.current = new window.Quill(editorRef.current, {
                    theme: 'snow',
                    placeholder: placeholder || 'Write something...',
                    modules: {
                        toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link', 'clean']
                        ]
                    }
                });
                const initialValue = value || '';
                quillInstance.current.root.innerHTML = initialValue;
                lastValueRef.current = initialValue;

                quillInstance.current.on('text-change', () => {
                    const html = quillInstance.current.root.innerHTML;
                    const normalizedHtml = html === '<p><br></p>' ? '' : html;
                    lastValueRef.current = normalizedHtml;
                    if (onChangeRef.current) {
                        onChangeRef.current(normalizedHtml);
                    }
                });
            }
        };

        if (window.Quill) initQuill();
        else {
            const timer = setInterval(() => {
                if (window.Quill) { initQuill(); clearInterval(timer); }
            }, 100);
            return () => clearInterval(timer);
        }
    }, []);

    useEffect(() => {
        if (!quillInstance.current) return;
        const incomingValue = value || '';
        if (incomingValue !== lastValueRef.current) {
            quillInstance.current.root.innerHTML = incomingValue;
            lastValueRef.current = incomingValue;
        }
    }, [value]);

    return (
        <div className="bg-white overflow-hidden border border-slate-100">
            <div ref={editorRef} style={{ minHeight: '350px' }} />
        </div>
    );
};

const AdminSettings = () => {
    const { tabId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('locations');
    const [locations, setLocations] = useState([]);
    const [helpdesks, setHelpdesks] = useState([]);
    const [newLocation, setNewLocation] = useState('');
    const [newSubPlaces, setNewSubPlaces] = useState({});
    const [activeParentForModal, setActiveParentForModal] = useState(null);
    const [subPlaceSearchQuery, setSubPlaceSearchQuery] = useState('');
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [newHelpdesk, setNewHelpdesk] = useState({ name: '', address: '', contact_info: '', location_id: '' });
    const [editingHelpdeskId, setEditingHelpdeskId] = useState(null);
    const [showHelpdeskModal, setShowHelpdeskModal] = useState(false);
    const [settings, setSettings] = useState({
        banner_title: '',
        banner_subtitle: '',
        box1_title: '', box1_text: '',
        box2_title: '', box2_text: '',
        box3_title: '', box3_text: '',
        app_name: '', app_icon_url: '', header_logo_url: '',
        csr_partners_content: '',
        csr_home_title: '',
        csr_home_subtitle: '',
        csr_page_title: '',
        csr_page_subtitle: '',
        pdf_footer_text: '',
        initiative_logo_url: '',
        powered_logo_url: '',
        gst_domains: '',
        trade_license_domains: '',
        interview_rules: '',
        twilio_sid: '',
        twilio_auth_token: '',
        twilio_phone_number: '',
        twilio_enabled: 0,
        currency_code: 'INR',
        country_phone_code: '91',
        smtp_host: '',
        smtp_port: '',
        smtp_user: '',
        smtp_pass: '',
        smtp_sender: '',
        smtp_secure: 0,
        smtp_enabled: 0,
        admin_login_secret: ''
    });
    const [pages, setPages] = useState([]);
    const [editingPage, setEditingPage] = useState(null);
    const [loading, setLoading] = useState(true);

    // User Manager States
    const [adminUsers, setAdminUsers] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'admin', permissions: {} });

    // Activity Log States
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityPage, setActivityPage] = useState(1);
    const [activityTotalPages, setActivityTotalPages] = useState(1);
    const [activityLoading, setActivityLoading] = useState(false);
    const userPermissionsRaw = localStorage.getItem('permissions');
    const userEmail = localStorage.getItem('email');
    const userName = localStorage.getItem('name');
    const userPermissions = JSON.parse(userPermissionsRaw || '{}');
    const isSuperAdmin = userPermissions.super_admin === true || userEmail === 'admin@jobconnect.gov.in' || userName === 'Super Admin';

    const can = (permission) => isSuperAdmin || userPermissions[permission] === true;

    const filteredAdminUsers = adminUsers.filter(user => {
        const term = userSearchTerm.trim().toLowerCase();
        if (!term) return true;
        const permString = user.permissions?.super_admin 
            ? 'super admin super_admin' 
            : Object.keys(user.permissions || {})
                .filter(k => user.permissions[k])
                .map(k => k.replace('manage_', '').replace('_', ' '))
                .join(' ');
        return (user.name || '').toLowerCase().includes(term) ||
               (user.email || '').toLowerCase().includes(term) ||
               (user.role || '').toLowerCase().includes(term) ||
               permString.toLowerCase().includes(term);
    });

    const filteredParentLocations = locations.filter(loc => !loc.parent_id).filter(parent => {
        const query = locationSearchQuery.trim().toLowerCase();
        if (!query) return true;
        
        const matchParent = (parent.name || '').toLowerCase().includes(query);
        const children = locations.filter(child => child.parent_id === parent.id);
        const matchChild = children.some(child => (child.name || '').toLowerCase().includes(query));
        
        return matchParent || matchChild;
    });

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passMsg, setPassMsg] = useState(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewUserPassword, setShowNewUserPassword] = useState(false);
    const [showTwilioToken, setShowTwilioToken] = useState(false);
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [testEmailRecipient, setTestEmailRecipient] = useState('');
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);
    const [testimonials, setTestimonials] = useState([]);
    const [newTestimonial, setNewTestimonial] = useState({ name: '', designation: '', message: '', image_url: '' });
    const [showTestimonialModal, setShowTestimonialModal] = useState(false);
    const [editingTestimonialId, setEditingTestimonialId] = useState(null);
    const [csrPartners, setCsrPartners] = useState([]);
    const [newCsrPartner, setNewCsrPartner] = useState({ name: '', logo_url: '', status: 'active' });
    const [showCsrModal, setShowCsrModal] = useState(false);
    const [editingCsrId, setEditingCsrId] = useState(null);

    const API_BASE = '/api';

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'admin') navigate('/login');
        fetchAllData();
    }, [navigate]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [locRes, setRes, pageRes, helpRes, csrRes, usersRes] = await Promise.all([
                axios.get(`${API_BASE}/locations`).catch(e => ({ data: [] })),
                axios.get(`${API_BASE}/settings`).catch(e => ({ data: {} })),
                axios.get(`${API_BASE}/admin/pages`).catch(e => ({ data: [] })),
                axios.get(`${API_BASE}/helpdesks`).catch(e => ({ data: [] })),
                axios.get(`${API_BASE}/csr-partners?all=true`).catch(e => ({ data: [] })),
                can('manage_users') ? axios.get(`${API_BASE}/admin/users`).catch(e => ({ data: [] })) : { data: [] }
            ]);
            setLocations(locRes.data || []);
            const settingsData = setRes.data || {};
            setSettings(prev => ({
                ...prev,
                ...settingsData
            }));
            setPages(pageRes.data || []);
            setHelpdesks(helpRes.data || []);
            setCsrPartners(csrRes.data || []);
            setAdminUsers(usersRes.data || []);
        } catch (err) {
            console.error("Critical error fetching data", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem('user_id');
        if (!userId) return setPassMsg({ type: 'error', text: 'User ID not found' });
        if (passwords.new !== passwords.confirm) return setPassMsg({ type: 'error', text: 'Passwords do not match' });
        try {
            await axios.put(`${API_BASE}/users/${userId}/password`, {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            setPassMsg({ type: 'success', text: 'Password updated!' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPassMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update' });
        }
    };

    const handleAddLocation = async (e) => {
        e.preventDefault();
        const locName = newLocation.trim();
        if (!locName) return;
        try {
            await axios.post(`${API_BASE}/admin/locations`, { name: locName, parent_id: null });
            setNewLocation('');
            const res = await axios.get(`${API_BASE}/locations`);
            setLocations(res.data);
            alert(`${locName} added Successfully.`);
        } catch (err) { 
            alert(err.response?.data?.error || "Action failed"); 
        }
    };

    const handleAddSubPlaces = async (e, parentId) => {
        e.preventDefault();
        const value = newSubPlaces[parentId] || '';
        if (!value.trim()) return;
        try {
            await axios.post(`${API_BASE}/admin/locations`, { name: value, parent_id: parentId });
            setNewSubPlaces(prev => ({ ...prev, [parentId]: '' }));
            const res = await axios.get(`${API_BASE}/locations`);
            setLocations(res.data);
        } catch (err) { 
            alert(err.response?.data?.error || "Action failed"); 
        }
    };

    const handleDeleteLocation = async (id) => {
        const location = locations.find(loc => loc.id === id);
        const locationName = location ? location.name : 'this location';
        if (!confirm(`Are you sure wanted to delete ${locationName}?`)) return;
        try {
            await axios.delete(`${API_BASE}/admin/locations/${id}`);
            const res = await axios.get(`${API_BASE}/locations`);
            setLocations(res.data);
        } catch (err) { 
            alert(err.response?.data?.error || "Action failed"); 
        }
    };

    const handleClearAllSubPlaces = async (parentId) => {
        if (!confirm('Are you sure you want to clear all sub-places under this location? This cannot be undone.')) return;
        try {
            await axios.delete(`${API_BASE}/admin/locations/clear-subplaces/${parentId}`);
            const res = await axios.get(`${API_BASE}/locations`);
            setLocations(res.data);
        } catch (err) { 
            alert(err.response?.data?.error || "Action failed"); 
        }
    };

    const handleAddHelpdesk = async (e) => {
        e.preventDefault();
        try {
            if (editingHelpdeskId) {
                await axios.put(`${API_BASE}/admin/helpdesks/${editingHelpdeskId}`, newHelpdesk);
                setEditingHelpdeskId(null);
            } else {
                await axios.post(`${API_BASE}/admin/helpdesks`, newHelpdesk);
            }
            setNewHelpdesk({ name: '', address: '', contact_info: '', location_id: '' });
            setShowHelpdeskModal(false);
            const res = await axios.get(`${API_BASE}/helpdesks`);
            setHelpdesks(res.data);
        } catch (err) { 
            console.error("Action Error:", err);
            alert(`Action failed: ${err.response?.data?.error || err.message}`); 
        }
    };

    const handleDeleteHelpdesk = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/helpdesks/${id}`);
            const res = await axios.get(`${API_BASE}/helpdesks`);
            setHelpdesks(res.data);
        } catch (err) { alert("Action failed"); }
    };

    const handleSaveSettings = async () => {
        try {
            await axios.post(`${API_BASE}/branding-config`, settings);
            
            // Update local storage for immediate effect in other components
            localStorage.setItem('app_name', settings.app_name || 'JobConnect');
            localStorage.setItem('logo_url', settings.header_logo_url || '');
            localStorage.setItem('custom_footer', settings.pdf_footer_text || '');
            
            // Dispatch custom event to notify App.jsx
            window.dispatchEvent(new Event('brandingUpdate'));
            
            // Re-fetch settings from server to confirm saved values
            const freshRes = await axios.get(`${API_BASE}/settings`);
            if (freshRes.data) {
                setSettings(prev => ({ ...prev, ...freshRes.data }));
            }
            
            alert("Settings saved successfully!");
        } catch (err) { 
            console.error("Save failed:", err);
            alert("Save failed: " + (err.response?.data?.error || err.message)); 
        }
    };

    const handleTestSmtp = async () => {
        if (!testEmailRecipient) {
            alert("Please enter a recipient email address.");
            return;
        }
        setIsTestingSmtp(true);
        try {
            const payload = {
                smtp_host: settings.smtp_host,
                smtp_port: settings.smtp_port,
                smtp_user: settings.smtp_user,
                smtp_pass: settings.smtp_pass,
                smtp_sender: settings.smtp_sender,
                smtp_secure: settings.smtp_secure,
                test_email: testEmailRecipient
            };
            const res = await axios.post('/api/admin/test-smtp', payload);
            alert(res.data.message || "Test email sent successfully!");
        } catch (err) {
            console.error("SMTP Test Failed:", err);
            alert(err.response?.data?.error || err.message || "Failed to send test email.");
        } finally {
            setIsTestingSmtp(false);
        }
    };


    const handleSavePage = async () => {
        const trimmedTitle = editingPage.title ? editingPage.title.trim() : '';
        const trimmedSlug = editingPage.slug ? editingPage.slug.trim() : '';
        const trimmedContent = editingPage.content ? editingPage.content.trim() : '';

        if (!trimmedTitle) {
            alert("Page Title is required and cannot be empty.");
            return;
        }
        if (!trimmedSlug) {
            alert("Friendly URL (Slug) is required and cannot be empty.");
            return;
        }
        if (!trimmedContent) {
            alert("Page Content cannot be empty.");
            return;
        }

        try {
            const payload = {
                ...editingPage,
                title: trimmedTitle,
                slug: trimmedSlug,
                content: trimmedContent
            };
            if (editingPage.id) await axios.put(`${API_BASE}/admin/pages/${editingPage.id}`, payload);
            else await axios.post(`${API_BASE}/admin/pages`, payload);
            setEditingPage(null);
            const res = await axios.get(`${API_BASE}/admin/pages`);
            setPages(res.data);
            alert("Success!");
        } catch (err) { 
            console.error("Save Page Error:", err);
            alert("Failed. " + (err.response?.data?.error || "Slug must be unique.")); 
        }
    };

    const handleDeletePage = async (id) => {
        if (!confirm('Delete this page?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/pages/${id}`);
            const res = await axios.get(`${API_BASE}/admin/pages`);
            setPages(res.data);
        } catch (err) { alert("Delete failed"); }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        const trimmedName = newUser.name ? newUser.name.trim() : '';
        if (!trimmedName) {
            alert("Please enter a valid name.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!newUser.email || !emailRegex.test(newUser.email)) {
            alert("Please enter a valid email address with a domain name (e.g., name@example.com).");
            return;
        }
        try {
            const isEdit = !!editingUserId;
            const userData = { ...newUser, name: trimmedName };
            if (isEdit) await axios.put(`${API_BASE}/admin/users/${editingUserId}`, userData);
            else await axios.post(`${API_BASE}/admin/users`, userData);
            setShowUserModal(false);
            setNewUser({ name: '', email: '', password: '', role: 'admin', permissions: {} });
            setEditingUserId(null);
            const res = await axios.get(`${API_BASE}/admin/users`);
            setAdminUsers(res.data);
            alert(isEdit ? "User saved successfully!" : "User Created successfully!");
        } catch (err) { alert(err.response?.data?.error || "Save failed"); }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Delete this admin user?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/users/${id}`);
            const res = await axios.get(`${API_BASE}/admin/users`);
            setAdminUsers(res.data);
        } catch (err) { alert(err.response?.data?.error || "Delete failed"); }
    };

    const fetchTestimonials = async () => {
        try {
            const res = await axios.get('/api/testimonials');
            setTestimonials(res.data);
        } catch (err) { console.error("Testimonials fetch failed", err); }
    };

    const handleAddTestimonial = async () => {
        if (!newTestimonial.name || !newTestimonial.message) {
            alert("Name and Message are required!");
            return;
        }
        if (newTestimonial.message.length > 250) {
            alert("Message cannot exceed 250 characters!");
            return;
        }
        try {
            if (editingTestimonialId) {
                await axios.put(`/api/admin/testimonials/${editingTestimonialId}`, newTestimonial);
                alert("Testimonial updated successfully!");
            } else {
                await axios.post('/api/admin/testimonials', newTestimonial);
                alert("Testimonial added successfully!");
            }
            setNewTestimonial({ name: '', designation: '', message: '', image_url: '' });
            setEditingTestimonialId(null);
            setShowTestimonialModal(false);
            fetchTestimonials();
        } catch (err) { alert("Failed to save testimonial"); }
    };

    const handleTestimonialReorder = async (draggedId, targetId) => {
        if (draggedId === targetId) return;
        const items = [...testimonials];
        const draggedIndex = items.findIndex(t => t.id === draggedId);
        const targetIndex = items.findIndex(t => t.id === targetId);
        
        const [movedItem] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, movedItem);
        
        // Update priorities locally
        const updated = items.map((t, i) => ({ ...t, priority: i }));
        setTestimonials(updated);
        
        try {
            await axios.post('/api/admin/testimonials/reorder', {
                orders: updated.map(t => ({ id: t.id, priority: t.priority }))
            });
        } catch (err) { alert("Failed to save order"); }
    };

    const handleDeleteTestimonial = async (id) => {
        if (!window.confirm("Delete this testimonial?")) return;
        try {
            await axios.delete(`/api/admin/testimonials/${id}`);
            fetchTestimonials();
        } catch (err) { alert("Delete failed"); }
    };

    const fetchCsrPartners = async () => {
        try {
            const res = await axios.get('/api/csr-partners?all=true');
            setCsrPartners(res.data);
        } catch (err) { console.error("CSR fetch failed", err); }
    };

    const handleSaveCsrPartner = async (e) => {
        e.preventDefault();
        try {
            if (editingCsrId) await axios.put(`${API_BASE}/admin/csr-partners/${editingCsrId}`, newCsrPartner);
            else await axios.post(`${API_BASE}/admin/csr-partners`, newCsrPartner);
            setShowCsrModal(false);
            setEditingCsrId(null);
            setNewCsrPartner({ name: '', logo_url: '', status: 'active' });
            fetchCsrPartners();
            alert("Partner saved!");
        } catch (err) { 
            console.error("Save error:", err);
            alert(`Save failed: ${err.response?.data?.error || err.message}`); 
        }
    };

    const handleDeleteCsrPartner = async (id) => {
        if (!confirm('Delete this partner?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/csr-partners/${id}`);
            fetchCsrPartners();
        } catch (err) { alert("Delete failed"); }
    };

    useEffect(() => {
        if (activeTab === 'testimonials') fetchTestimonials();
        if (activeTab === 'csr') fetchCsrPartners();
        if (activeTab === 'activity_log') fetchActivityLog(1);
    }, [activeTab]);

    const fetchActivityLog = async (page = 1) => {
        setActivityLoading(true);
        try {
            const res = await axios.get(`/api/admin/activity-log?page=${page}&limit=25`);
            setActivityLogs(res.data.logs || []);
            setActivityTotalPages(res.data.totalPages || 1);
            setActivityPage(page);
        } catch (err) {
            console.error('Activity log fetch failed', err);
        } finally {
            setActivityLoading(false);
        }
    };

    const togglePermission = (key) => {
        setNewUser(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }));
    };

    const visibleGroupedTabs = useMemo(() => {
        const groups = [
            {
                title: 'Access & Security',
                items: [
                    { id: 'users', label: 'User Manager', icon: Users, permission: 'manage_users' },
                    { id: 'security', label: 'Security & Account', icon: Lock, permission: null },
                    ...(isSuperAdmin ? [{ id: 'activity_log', label: 'Activity Log', icon: Clock, permission: null }] : []),
                ]
            },
            {
                title: 'System Configuration',
                items: [
                    { id: 'branding', label: 'App Branding', icon: Layout, permission: 'manage_branding' },
                    { id: 'sms', label: 'SMS Configuration', icon: Mail, permission: 'manage_sms' },
                    { id: 'smtp', label: 'SMTP Configuration', icon: Send, permission: 'manage_smtp' },
                    { id: 'domains', label: 'Domain Rules', icon: ShieldCheck, permission: 'manage_domains' },
                ]
            },
            {
                title: 'System Masters',
                items: [
                    { id: 'locations', label: 'Locations Master', icon: MapPin, permission: 'manage_locations' },
                    { id: 'support', label: 'Support Directory', icon: HelpCircle, permission: 'manage_support' },
                    { id: 'interview_rules', label: 'Interview Rules', icon: FileText, permission: 'manage_rules' },
                ]
            },
            {
                title: 'CMS & Content',
                items: [
                    { id: 'homepage', label: 'Home Page CMS', icon: Globe, permission: 'manage_homepage' },
                    { id: 'pages', label: 'Footer Pages', icon: FileText, permission: 'manage_pages' },
                    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare, permission: 'manage_testimonials' },
                    { id: 'csr', label: 'Partners', icon: Building2, permission: 'manage_csr' },
                ]
            }
        ];

        return groups.map(group => ({
            ...group,
            items: group.items.filter(item => !item.permission || can(item.permission))
        })).filter(group => group.items.length > 0);
    }, [userPermissionsRaw]);

    const tabs = useMemo(() => {
        return visibleGroupedTabs.flatMap(g => g.items);
    }, [visibleGroupedTabs]);

    // Deep Linking: Sync Tab with URL or Default
    useEffect(() => {
        if (tabId && tabs.find(t => t.id === tabId)) {
            if (activeTab !== tabId) setActiveTab(tabId);
        } else if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [tabId, tabs, activeTab]);

    if (loading && locations.length === 0 && !settings.banner_title) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm font-bold">Synchronizing content...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
            <div className="bg-slate-900 rounded-3xl p-8 text-white flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin')} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"><ArrowLeft size={20} /></button>
                    <div>
                        <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1"><Settings size={14} />Administrator Control</div>
                        <h1 className="text-3xl font-extrabold">Settings & Platform Master</h1>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-72 shrink-0">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sticky top-24">
                        <div className="space-y-4">
                            {visibleGroupedTabs.map((group, groupIdx) => (
                                <div key={group.title} className={groupIdx > 0 ? "pt-2" : ""}>
                                    <div className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {group.title}
                                    </div>
                                    <div className="space-y-1">
                                        {group.items.map(tab => (
                                            <button 
                                                key={tab.id} 
                                                onClick={() => { 
                                                    navigate(`/admin/settings/${tab.id}`);
                                                    setEditingPage(null); 
                                                }} 
                                                className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-3"><tab.icon size={18} />{tab.label}</div>
                                                <ChevronRight size={16} className={activeTab === tab.id ? 'opacity-100' : 'opacity-0'} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                        {activeTab === 'users' && can('manage_users') && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div><h2 className="text-xl font-black text-slate-800">User Manager</h2><p className="text-sm text-slate-500">Add staff and manage granular permissions.</p></div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:flex-initial sm:w-64">
                                            <input
                                                type="text"
                                                placeholder="Search user..."
                                                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm text-slate-800 placeholder:text-slate-400 transition-all font-bold"
                                                value={userSearchTerm}
                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                            />
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        </div>
                                        <button 
                                            onClick={() => { setEditingUserId(null); setNewUser({ name: '', email: '', password: '', role: 'admin', permissions: {} }); setShowUserModal(true); }}
                                            className="h-10 px-6 bg-blue-600 text-white rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 whitespace-nowrap"
                                        >
                                            <Plus size={18} /> Add New Admin
                                        </button>
                                    </div>
                                </div>
                                <div className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50/80 border-y border-slate-100">
                                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">User Info</th>
                                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</th>
                                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Role & Permissions</th>
                                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredAdminUsers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="px-8 py-10 text-center text-slate-400 italic">No users found matching "{userSearchTerm}".</td>
                                                    </tr>
                                                ) : (
                                                    filteredAdminUsers.map(user => (
                                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-black text-slate-800">{user.name}</div>
                                                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">ID: #{user.id}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 max-w-[260px]">
                                                                <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                                                    <Mail size={14} className="text-slate-300 flex-shrink-0" />
                                                                    <span className="break-all">{user.email}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-wrap gap-2">
                                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase">
                                                                        {user.role}
                                                                    </span>
                                                                    {user.permissions?.super_admin ? (
                                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-black uppercase">Super Admin</span>
                                                                    ) : (
                                                                        Object.keys(user.permissions || {}).filter(k => user.permissions[k]).slice(0, 2).map(k => (
                                                                            <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase">
                                                                                {k.replace('manage_', '').replace('_', ' ')}
                                                                            </span>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {/* Only Super Admins can edit other Super Admins */}
                                                                    {(!user.permissions?.super_admin || isSuperAdmin) && (
                                                                        <button onClick={() => { 
                                                                            setEditingUserId(user.id); 
                                                                            setNewUser({ name: user.name, email: user.email, password: '', role: user.role, permissions: user.permissions || {} }); 
                                                                            setShowUserModal(true); 
                                                                        }} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all">
                                                                            <Edit3 size={16} />
                                                                        </button>
                                                                    )}
                                                                    {/* Super Admins cannot be deleted by anyone (or at least not by non-supers) */}
                                                                    {user.email !== 'admin@jobconnect.gov.in' && !user.permissions?.super_admin && (
                                                                        <button onClick={() => handleDeleteUser(user.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {showUserModal && (
                                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                                        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-800">{editingUserId ? 'Edit User' : 'Add New User'}</h3>
                                                    <p className="text-xs text-slate-500">Configure roles and specific area access.</p>
                                                </div>
                                                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
                                            </div>
                                            <form onSubmit={handleSaveUser} className="p-8 max-h-[70vh] overflow-y-auto">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                    <div className="space-y-1">
                                                         <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Display Name</label>
                                                        <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                                                    </div>
                                                    <div className="space-y-1">
                                                         <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Address</label>
                                                         <input 
                                                             type="email" 
                                                             pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                                                             title="Please enter a valid email address with a domain name (e.g. name@example.com)"
                                                             className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm" 
                                                             value={newUser.email} 
                                                             onChange={e => setNewUser({...newUser, email: e.target.value})} 
                                                             required 
                                                         />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{editingUserId ? 'New Password (Optional)' : 'Password'}</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showNewUserPassword ? "text" : "password"}
                                                                placeholder="••••••••"
                                                                className="w-full h-12 pl-5 pr-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
                                                                value={newUser.password}
                                                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                                                required={!editingUserId}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                            >
                                                                {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Primary Role</label>
                                                        <div className="relative">
                                                            <select className="w-full h-12 px-5 pr-10 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold appearance-none cursor-pointer" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                                                <option value="admin">Admin</option>
                                                                <option value="staff">Staff</option>
                                                            </select>
                                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <div 
                                                        onClick={() => togglePermission('super_admin')}
                                                        className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${newUser.permissions.super_admin ? 'border-orange-500 bg-orange-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-3">
                                                                <ShieldCheck size={20} className={newUser.permissions.super_admin ? 'text-orange-500' : 'text-slate-400'} />
                                                                <span className="text-sm font-black text-slate-800">Super Admin (Full Access)</span>
                                                            </div>
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${newUser.permissions.super_admin ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300'}`}>
                                                                {newUser.permissions.super_admin && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 ml-8">Complete control over all system settings, CMS, and data lists.</p>
                                                    </div>
                                                </div>

                                                {!newUser.permissions.super_admin && (
                                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="h-0.5 flex-1 bg-slate-100"></div>
                                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Granular Module Access</h4>
                                                            <div className="h-0.5 flex-1 bg-slate-100"></div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                                                            {[
                                                                 { key: 'manage_employers', label: 'Employer Management', desc: 'Verify/Reject employers and manage portal' },
                                                                 { key: 'manage_users', label: 'User Manager', desc: 'Create and manage other staff accounts' },
                                                                 { key: 'manage_locations', label: 'Locations Master', desc: 'Manage Wards and Panchayat names' },
                                                                 { key: 'manage_homepage', label: 'Home Page CMS', desc: 'Change banner text and statistics' },
                                                                 { key: 'manage_branding', label: 'App Branding', desc: 'Change logo, icons, and app name' },
                                                                 { key: 'manage_sms', label: 'SMS Configuration', desc: 'Configure Twilio API and toggle OTP delivery' },
                                                                 { key: 'manage_smtp', label: 'SMTP Configuration', desc: 'Configure SMTP details for sending email notifications' },
                                                                 { key: 'manage_rules', label: 'Interview Rules', desc: 'Define guidelines shown to candidates' },
                                                                 { key: 'manage_domains', label: 'Domain Rules', desc: 'Restrict verification features by domains' },
                                                                 { key: 'manage_support', label: 'Support Directory', desc: 'Add/Edit Ward offices and helpdesks' },
                                                                 { key: 'manage_pages', label: 'Footer Pages', desc: 'Manage Terms, Privacy, and custom footer pages' },
                                                                 { key: 'manage_testimonials', label: 'Testimonials', desc: 'Manage official quotes on the home page' },
                                                                 { key: 'manage_csr', label: 'Partners', desc: 'Manage partners list and partners description' },
                                                            ].map(p => (
                                                                <div 
                                                                    key={p.key} 
                                                                    onClick={() => togglePermission(p.key)}
                                                                    className={`p-4 rounded-[1.5rem] border-2 cursor-pointer transition-all ${newUser.permissions[p.key] ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                                                                >
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-[11px] font-black text-slate-800">{p.label}</span>
                                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${newUser.permissions[p.key] ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'}`}>
                                                                            {newUser.permissions[p.key] && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-500 leading-tight">{p.desc}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                                                    <button type="submit" className="flex-[2] h-12 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                                        <Save size={18} /> {editingUserId ? 'Update User' : 'Create User Account'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'locations' && can('manage_locations') && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-xl font-black text-slate-800">Locations & Places Master</h2>
                                    <p className="text-sm text-slate-500">Configure regions (states, emirates, districts) and their nested sub-places (suburbs, areas, wards).</p>
                                </div>
                                <div className="p-8">
                                    {/* Add Parent Location Form Card */}
                                    <div className="bg-slate-50/50 border border-slate-200/60 rounded-3xl p-6 mb-8 max-w-3xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <MapPin size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Create Primary Location</h3>
                                                <p className="text-[11px] text-slate-500 font-normal">Add districts, states, emirates, or major cities to setup local regions.</p>
                                            </div>
                                        </div>
                                        <form onSubmit={handleAddLocation} className="flex flex-col sm:flex-row gap-3">
                                            <input 
                                                type="text" 
                                                required 
                                                className="flex-1 h-12 px-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-sm font-bold transition-all shadow-sm" 
                                                value={newLocation} 
                                                onChange={(e) => setNewLocation(e.target.value)} 
                                            />
                                            <button type="submit" className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-200 cursor-pointer whitespace-nowrap">
                                                <Plus size={18} /> Add Location
                                            </button>
                                        </form>
                                    </div>
                                    {/* Search Bar for Locations & Places */}
                                    <div className="relative w-full sm:w-80 mb-6">
                                        <input
                                            type="text"
                                            placeholder="Search location or sub-place..."
                                            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-xs text-slate-800 placeholder:text-slate-400 transition-all font-bold"
                                            value={locationSearchQuery}
                                            onChange={(e) => setLocationSearchQuery(e.target.value)}
                                        />
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    </div>

                                    {/* Simplified Locations Hierarchy Table */}
                                    <div className="overflow-x-auto rounded-3xl border border-slate-200/70 shadow-sm bg-white">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200/80">
                                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500 w-2/5">
                                                        Primary Location ({locations.filter(loc => !loc.parent_id).length})
                                                    </th>
                                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500 w-1/5">
                                                        Places Count ({locations.filter(loc => loc.parent_id).length})
                                                    </th>
                                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500 w-2/5 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredParentLocations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="3" className="px-6 py-10 text-center text-slate-400 italic">No locations found matching "{locationSearchQuery}".</td>
                                                    </tr>
                                                ) : (
                                                    filteredParentLocations.map(parent => {
                                                        const subPlaces = locations.filter(child => child.parent_id === parent.id);
                                                        return (
                                                            <tr key={parent.id} className="hover:bg-slate-50/30 transition-colors">
                                                                {/* Column 1: Parent Location Info */}
                                                                <td className="px-6 py-4 align-middle">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                                                            <MapPin size={18} />
                                                                        </div>
                                                                        <div className="font-extrabold text-slate-800 text-sm">{parent.name}</div>
                                                                    </div>
                                                                </td>

                                                                {/* Column 2: Places Count */}
                                                                <td className="px-6 py-4 align-middle">
                                                                    <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-black uppercase tracking-wide">
                                                                        {subPlaces.length} {subPlaces.length === 1 ? 'place' : 'places'}
                                                                    </span>
                                                                </td>

                                                                {/* Column 3: Action Buttons */}
                                                                <td className="px-6 py-4 align-middle">
                                                                    <div className="flex items-center justify-end gap-3">
                                                                        <button 
                                                                            onClick={() => { setActiveParentForModal(parent); setSubPlaceSearchQuery(''); }}
                                                                            className="h-10 px-4 bg-slate-50 border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-100 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                                                                        >
                                                                            <Eye size={14} /> Manage Places
                                                                        </button>

                                                                        <button 
                                                                            onClick={() => handleDeleteLocation(parent.id)} 
                                                                            title="Delete location and all sub-places" 
                                                                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0 active:scale-95"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Dedicated Modal for Sub-places Management */}
                                    {activeParentForModal && (() => {
                                        const parent = activeParentForModal;
                                        const subPlaces = locations.filter(child => child.parent_id === parent.id);
                                        const filteredSubPlaces = subPlaces.filter(child => 
                                            child.name.toLowerCase().includes(subPlaceSearchQuery.toLowerCase())
                                        );
                                        return (
                                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                                                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                                                    {/* Header */}
                                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                                <MapPin className="text-blue-500 shrink-0" size={20} />
                                                                {parent.name}
                                                            </h3>
                                                            <p className="text-xs text-slate-500 mt-0.5">Configure areas, sub-places, and wards</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => { setActiveParentForModal(null); setSubPlaceSearchQuery(''); }}
                                                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Body */}
                                                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                                        {/* Add Sub Places Form */}
                                                        <form 
                                                            onSubmit={async (e) => {
                                                                e.preventDefault();
                                                                await handleAddSubPlaces(e, parent.id);
                                                            }}
                                                            className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4"
                                                        >
                                                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Add Sub-places / Areas</label>
                                                            <div className="relative flex gap-2">
                                                                <input 
                                                                    type="text"
                                                                    required
                                                                    placeholder="Add sub-places (comma separated)..."
                                                                    className="flex-grow h-10 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 text-xs placeholder:text-slate-300 font-bold shadow-sm"
                                                                    value={newSubPlaces[parent.id] || ''}
                                                                    onChange={(e) => setNewSubPlaces({
                                                                        ...newSubPlaces,
                                                                        [parent.id]: e.target.value
                                                                    })}
                                                                />
                                                                <button 
                                                                    type="submit" 
                                                                    className="px-4 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer font-bold text-xs shadow-md shadow-blue-100 shrink-0"
                                                                >
                                                                    <Plus size={16} /> Add Places
                                                                </button>
                                                            </div>
                                                            <span className="block text-[9px] text-slate-400 mt-2 font-bold">Use commas to add multiple areas at once (e.g. "Attingal, Neyyattinkara").</span>
                                                        </form>

                                                        {/* Current places list with Realtime Search */}
                                                        <div>
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                                        {subPlaceSearchQuery ? `Matching Places (${filteredSubPlaces.length} / ${subPlaces.length})` : `Current Sub-places (${subPlaces.length})`}
                                                                    </h4>
                                                                    {subPlaces.length > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleClearAllSubPlaces(parent.id)}
                                                                            className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1 transition-all"
                                                                        >
                                                                            <Trash2 size={10} /> Clear All
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {subPlaces.length > 0 && (
                                                                    <div className="relative w-full sm:w-48">
                                                                        <input 
                                                                            type="text"
                                                                            placeholder="Search sub-places..."
                                                                            className="w-full h-8 pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white text-xs placeholder:text-slate-400 font-bold transition-all"
                                                                            value={subPlaceSearchQuery}
                                                                            onChange={(e) => setSubPlaceSearchQuery(e.target.value)}
                                                                        />
                                                                        <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                                        {subPlaceSearchQuery && (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={() => setSubPlaceSearchQuery('')}
                                                                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {filteredSubPlaces.length > 0 ? (
                                                                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-3 border border-slate-200/50 rounded-2xl bg-slate-50/30">
                                                                    {filteredSubPlaces.map(child => (
                                                                        <div 
                                                                            key={child.id} 
                                                                            className="group flex items-center gap-1.5 pl-3 pr-2 py-1 bg-white border border-slate-200/80 rounded-full text-xs font-bold text-slate-600 hover:border-red-200 hover:text-red-600 transition-all select-none"
                                                                        >
                                                                            <span>{child.name}</span>
                                                                            <button 
                                                                                onClick={() => handleDeleteLocation(child.id)} 
                                                                                title="Delete place"
                                                                                className="text-slate-300 group-hover:text-red-500 transition-colors cursor-pointer"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-8 border-2 border-dashed border-slate-200/60 rounded-2xl bg-slate-50/20">
                                                                    <span className="text-xs text-slate-400 italic">
                                                                        {subPlaces.length > 0 ? "No matching sub-places found." : "No sub-places added yet."}
                                                                    </span>
                                                                    {subPlaceSearchQuery && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => setSubPlaceSearchQuery('')}
                                                                            className="block mx-auto mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                                                        >
                                                                            Clear search
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                                                        <button 
                                                            onClick={() => { setActiveParentForModal(null); setSubPlaceSearchQuery(''); }}
                                                            className="h-10 px-5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all cursor-pointer"
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {activeTab === 'support' && can('manage_support') && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-xl font-black text-slate-800">Support Locations (Helpdesks)</h2>
                                    <p className="text-sm text-slate-500">Add offline helpdesk locations for candidates.</p>
                                </div>
                                <div className="p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Locations List</h3>
                                        <button 
                                            onClick={() => { setEditingHelpdeskId(null); setNewHelpdesk({ name: '', address: '', contact_info: '', location_id: '' }); setShowHelpdeskModal(true); }}
                                            className="h-10 px-6 bg-blue-600 text-white rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer"
                                        >
                                            <Plus size={18} /> Add Helpdesk
                                        </button>
                                    </div>

                                    {/* Modal for Add/Edit */}
                                    {showHelpdeskModal && (
                                        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                                            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                                                {/* Sticky Header */}
                                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-800">{editingHelpdeskId ? 'Edit Location' : 'Add New Location'}</h3>
                                                        <p className="text-xs text-slate-500">Provide the offline support details.</p>
                                                    </div>
                                                    <button onClick={() => setShowHelpdeskModal(false)} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"><X size={20} /></button>
                                                </div>
                                                {/* Scrollable Body */}
                                                <div className="overflow-y-auto flex-1">
                                                    <form onSubmit={handleAddHelpdesk} className="p-8 space-y-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Location Name</label>
                                                            <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold" placeholder="e.g. Ward Office 5" value={newHelpdesk.name} onChange={e => setNewHelpdesk({...newHelpdesk, name: e.target.value})} required />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Primary Location</label>
                                                            <div className="relative">
                                                                <select 
                                                                    className="w-full h-12 px-5 pr-10 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold appearance-none cursor-pointer" 
                                                                    value={newHelpdesk.location_id || ''} 
                                                                    onChange={e => setNewHelpdesk({...newHelpdesk, location_id: e.target.value})}
                                                                    required
                                                                >
                                                                    <option value="">Select Primary Location</option>
                                                                    {locations.filter(loc => !loc.parent_id).map(loc => (
                                                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact Phone</label>
                                                            <div className="relative flex items-center">
                                                                <span className="absolute left-5 text-sm font-bold text-slate-400 select-none">+</span>
                                                                <input 
                                                                    className="w-full h-12 pl-9 pr-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold text-slate-800" 
                                                                    placeholder="919876543210" 
                                                                    value={newHelpdesk.contact_info ? newHelpdesk.contact_info.replace(/^\+/, '') : ''} 
                                                                    onChange={e => {
                                                                        const val = e.target.value.replace(/[^\d]/g, '');
                                                                        setNewHelpdesk({...newHelpdesk, contact_info: val ? '+' + val : ''});
                                                                    }} 
                                                                    required 
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Address</label>
                                                            <textarea className="w-full min-h-[100px] p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm resize-none" placeholder="Enter complete address details..." value={newHelpdesk.address} onChange={e => setNewHelpdesk({...newHelpdesk, address: e.target.value})} required />
                                                        </div>
                                                        
                                                        <div className="pt-4 flex gap-3">
                                                            <button type="button" onClick={() => setShowHelpdeskModal(false)} className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all cursor-pointer">Cancel</button>
                                                            <button type="submit" className="flex-[2] h-12 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-blue-100">
                                                                {editingHelpdeskId ? <><Edit3 size={18} /> Update Details</> : <><Plus size={20} /> Save Location</>}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-8">
                                        {(() => {
                                            const primaryLocations = locations.filter(loc => !loc.parent_id);
                                            const unassignedHelpdesks = helpdesks.filter(hd => !hd.location_id || !primaryLocations.some(l => l.id === hd.location_id));
                                            
                                            return (
                                                <>
                                                    {primaryLocations.map(loc => {
                                                        const items = helpdesks.filter(hd => hd.location_id === loc.id);
                                                        if (items.length === 0) return null;
                                                        return (
                                                            <div key={loc.id} className="space-y-3">
                                                                <div className="flex items-center gap-2 px-1">
                                                                    <MapPin className="text-blue-500 shrink-0" size={16} />
                                                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">{loc.name}</h4>
                                                                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                                                                        {items.length} {items.length === 1 ? 'helpdesk' : 'helpdesks'}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {items.map(hd => (
                                                                        <div key={hd.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group hover:border-blue-100 transition-all">
                                                                            <div>
                                                                                <div className="font-bold text-slate-800">{hd.name}</div>
                                                                                <div className="text-xs text-slate-400 mt-0.5">{hd.address} • {hd.contact_info ? (hd.contact_info.startsWith('+') ? hd.contact_info : '+' + hd.contact_info) : ''}</div>
                                                                            </div>
                                                                            <div className="flex gap-1 shrink-0">
                                                                                <button onClick={() => { setEditingHelpdeskId(hd.id); setNewHelpdesk({ name: hd.name, address: hd.address, contact_info: hd.contact_info, location_id: hd.location_id || '' }); setShowHelpdeskModal(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-all cursor-pointer"><Edit3 size={18} /></button>
                                                                                <button onClick={() => handleDeleteHelpdesk(hd.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all cursor-pointer"><Trash2 size={18} /></button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {unassignedHelpdesks.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 px-1">
                                                                <HelpCircle className="text-slate-400 shrink-0" size={16} />
                                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Other / Unassigned</h4>
                                                                <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full">
                                                                    {unassignedHelpdesks.length}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {unassignedHelpdesks.map(hd => (
                                                                    <div key={hd.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group hover:border-blue-100 transition-all">
                                                                        <div>
                                                                            <div className="font-bold text-slate-800">{hd.name}</div>
                                                                            <div className="text-xs text-slate-400 mt-0.5">{hd.address} • {hd.contact_info ? (hd.contact_info.startsWith('+') ? hd.contact_info : '+' + hd.contact_info) : ''}</div>
                                                                        </div>
                                                                        <div className="flex gap-1 shrink-0">
                                                                            <button onClick={() => { setEditingHelpdeskId(hd.id); setNewHelpdesk({ name: hd.name, address: hd.address, contact_info: hd.contact_info, location_id: hd.location_id || '' }); setShowHelpdeskModal(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-all cursor-pointer"><Edit3 size={18} /></button>
                                                                            <button onClick={() => handleDeleteHelpdesk(hd.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all cursor-pointer"><Trash2 size={18} /></button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {helpdesks.length === 0 && (
                                                        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 italic">
                                                            No helpdesks added yet. Click "Add Helpdesk" to register one.
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'homepage' && can('manage_homepage') && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div><h2 className="text-xl font-black text-slate-800">Home Page Content</h2><p className="text-sm text-slate-500">Manage banner text and stats display.</p></div>
                                    <button onClick={handleSaveSettings} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"><Save size={18} /> Update Content</button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="grid gap-2">
                                        <div className="flex justify-between items-center px-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Main Banner Content (Headline & Subtext)</label><span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">WYSIWYG Mode</span></div>
                                        <WYSIWYG value={settings.banner_title || ''} onChange={(val) => setSettings({...settings, banner_title: val})} placeholder="Example: <h1>Welcome</h1> <p>Join us today...</p>" />
                                        <p className="text-[10px] text-slate-400 italic px-1">Tip: Use the editor to add Headings (H1) for the title and normal text for the subtitle.</p>
                                    </div>
                                    <div className="pt-8 border-t border-slate-50">
                                        <div className="flex items-center gap-2 mb-6"><Layout size={18} className="text-blue-600" /><h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Stats Column Configuration</h3></div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                                    <div className="text-[10px] font-black text-blue-500 uppercase">Column {i}</div>
                                                    <input className="w-full font-black text-slate-800 p-0 bg-transparent border-b border-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-300" placeholder="Title..." value={settings[`box${i}_title`] || ''} onChange={(e) => setSettings({...settings, [`box${i}_title`]: e.target.value})} />
                                                    <input className="w-full text-xs text-slate-500 p-0 bg-transparent border-b border-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-300 italic" placeholder="Description..." value={settings[`box${i}_text`] || ''} onChange={(e) => setSettings({...settings, [`box${i}_text`]: e.target.value})} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'branding' && can('manage_branding') && (
                            <div className="animate-in fade-in duration-500 font-sans">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div><h2 className="text-xl font-black text-slate-800">App Branding & Icon</h2><p className="text-sm text-slate-500">Configure how the app looks on mobile home screens.</p></div>
                                    <button onClick={handleSaveSettings} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"><Save size={18} /> Save Branding</button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">App Display Name (iOS/Android Label)</label>
                                                <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" value={settings.app_name || 'JobConnect'} onChange={(e) => setSettings({...settings, app_name: e.target.value})} placeholder="e.g. JobConnect" />
                                            </div>
                                            <div className="space-y-2">
                                                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Job Post ID Prefix</label>
                                                 <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" value={settings.job_id_prefix || 'JC'} onChange={(e) => setSettings({...settings, job_id_prefix: e.target.value})} placeholder="e.g. JC" />
                                                 <p className="text-[10px] text-slate-400 italic px-1">Used to generate unique Job Post IDs (e.g. PREFIX-MMYY-1234567).</p>
                                             </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Upload New Icon</label>
                                                <div className="relative group">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            const formData = new FormData();
                                                            formData.append('icon', file);
                                                            try {
                                                                const res = await axios.post(`${API_BASE}/branding-upload`, formData);
                                                                setSettings({...settings, app_icon_url: res.data.url + '?t=' + Date.now()});
                                                                alert("Icon uploaded!");
                                                            } catch (err) { alert("Upload failed"); }
                                                        }} 
                                                    />
                                                    <div className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-2 group-hover:border-blue-200 transition-all">
                                                        <Plus size={18} className="text-blue-500" />
                                                        <span className="text-xs font-bold text-slate-500">Pick replacement image...</span>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 italic px-1">Recommended: 512x512 square PNG.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Current Icon URL (Read-only)</label>
                                                <input className="w-full h-12 px-5 bg-slate-100 border border-slate-100 rounded-2xl font-mono text-[10px] outline-none text-slate-400" value={settings.app_icon_url || '/logos/app_icon.png'} readOnly />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-3xl p-8 flex flex-col items-center justify-center border border-dashed border-slate-200">
                                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Preview on Phone</div>
                                            <div className="w-24 h-24 bg-white rounded-[22px] shadow-2xl p-2 flex items-center justify-center relative overflow-hidden group">
                                                <img src={settings.app_icon_url || '/logos/app_icon.png'} alt="App Icon" className="w-full h-full object-cover rounded-[18px]" />
                                            </div>
                                            <div className="mt-4 font-bold text-slate-800 text-sm">{settings.app_name || 'JobConnect'}</div>
                                            <div className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Home Screen</div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-6">
                                            <Globe size={18} className="text-blue-600" />
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Country & Currency Settings</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Country Phone Code (Prefix)</label>
                                                <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" value={settings.country_phone_code || '91'} onChange={(e) => setSettings({...settings, country_phone_code: e.target.value.replace(/\D/g, '')})} placeholder="e.g. 91, 971" />
                                                <p className="text-[10px] text-slate-400 italic px-1">Configure the country code for mobile registration and OTP messages (e.g., 91 for India, 971 for UAE).</p>
                                            </div>
                                            <div className="space-y-2">
                                                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Local Currency Code</label>
                                                 <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" value={settings.currency_code || 'INR'} onChange={(e) => setSettings({...settings, currency_code: e.target.value.toUpperCase()})} placeholder="e.g. INR, AED, USD" />
                                                 <p className="text-[10px] text-slate-400 italic px-1">Determines the currency symbols shown across registration checkout and job posts.</p>
                                             </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-6"><FileText size={18} className="text-blue-600" /><h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">PDF Report Footer Text</h3></div>
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <div className="flex justify-between items-center px-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Footer Content</label><span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">Dynamic PDF Footer</span></div>
                                                <WYSIWYG 
                                                    value={settings.pdf_footer_text || ''} 
                                                    onChange={(val) => setSettings({...settings, pdf_footer_text: val})} 
                                                    placeholder="e.g., JobConnect by Local Authority. Powered by eglobe IT Solutions."
                                                />
                                                <p className="text-[10px] text-slate-400 italic px-1">This text will appear at the bottom of every page in the Vacancy List PDF report.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-6"><Layout size={18} className="text-blue-600" /><h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Site Header Logo</h3></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Upload Navigation Logo</label>
                                                    <div className="relative group">
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('logo', file);
                                                                try {
                                                                    const res = await axios.post(`${API_BASE}/header-logo-upload`, formData);
                                                                    setSettings({...settings, header_logo_url: res.data.url + '?t=' + Date.now()});
                                                                    alert("Header logo uploaded!");
                                                                } catch (err) { alert("Upload failed"); }
                                                            }} 
                                                        />
                                                        <div className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-2 group-hover:border-blue-200 transition-all">
                                                            <Plus size={18} className="text-blue-500" />
                                                            <span className="text-xs font-bold text-slate-500">Choose Header Logo...</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 italic px-1">Recommended: Transparent PNG (height max 80px).</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setSettings({...settings, header_logo_url: ''})}
                                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-all"
                                                    >
                                                        Remove Logo
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center border border-dashed border-slate-200">
                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Header Preview</div>
                                                <div className="w-full h-16 bg-white border border-slate-100 rounded-xl flex items-center px-4">
                                                    {settings.header_logo_url ? (
                                                        <img src={settings.header_logo_url} alt="Logo Preview" className="h-8 w-auto object-contain" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-300 italic">No logo selected (showing text only)</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-6"><Layout size={18} className="text-blue-600" /><h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Footer Logos</h3></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                            {/* Initiative By Logo */}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Initiative By Logo</label>
                                                    <div className="relative group">
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('initiative_logo', file);
                                                                try {
                                                                    const res = await axios.post(`${API_BASE}/initiative-logo-upload`, formData);
                                                                    setSettings({...settings, initiative_logo_url: res.data.url + '?t=' + Date.now()});
                                                                    alert("Initiative logo uploaded!");
                                                                } catch (err) { alert("Upload failed"); }
                                                            }} 
                                                        />
                                                        <div className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-2 group-hover:border-blue-200 transition-all">
                                                            <Plus size={18} className="text-blue-500" />
                                                            <span className="text-xs font-bold text-slate-500">Upload Initiative Logo...</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-center border border-slate-100 h-24">
                                                    {settings.initiative_logo_url ? (
                                                        <img src={settings.initiative_logo_url} className="h-12 object-contain" alt="Initiative logo preview" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">No logo uploaded</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Powered By Logo */}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Powered By Logo</label>
                                                    <div className="relative group">
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('powered_logo', file);
                                                                try {
                                                                    const res = await axios.post(`${API_BASE}/powered-logo-upload`, formData);
                                                                    setSettings({...settings, powered_logo_url: res.data.url + '?t=' + Date.now()});
                                                                    alert("Powered By logo uploaded!");
                                                                } catch (err) { alert("Upload failed"); }
                                                            }} 
                                                        />
                                                        <div className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-2 group-hover:border-blue-200 transition-all">
                                                            <Plus size={18} className="text-blue-500" />
                                                            <span className="text-xs font-bold text-slate-500">Upload Powered By Logo...</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-center border border-slate-100 h-24">
                                                    {settings.powered_logo_url ? (
                                                        <img src={settings.powered_logo_url} className="h-12 object-contain" alt="Powered by logo preview" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">No logo uploaded</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                        <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2 mb-2"><HelpCircle size={16} /> How to add to home screen?</h4>
                                        <p className="text-xs text-blue-600 leading-relaxed">On iPhone (Safari), tap the <strong>'Share'</strong> icon and choose <strong>'Add to Home Screen'</strong>. On Android (Chrome), tap the three dots and select <strong>'Add to Home Screen'</strong> or <strong>'Install App'</strong>.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sms' && can('manage_sms') && (
                            <div className="animate-in fade-in duration-500 font-sans">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">SMS Gateway Configuration</h2>
                                        <p className="text-sm text-slate-500">Configure Twilio credentials and toggle live SMS OTP delivery.</p>
                                    </div>
                                    <button onClick={handleSaveSettings} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
                                        <Save size={18} /> Save Config
                                    </button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <Mail size={18} className="text-blue-600" />
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Twilio Settings</h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={!!settings.twilio_enabled}
                                                    onChange={(e) => setSettings({...settings, twilio_enabled: e.target.checked ? 1 : 0})}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className="ml-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                    {settings.twilio_enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Twilio Account SID</label>
                                                <input 
                                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                    value={settings.twilio_sid || ''} 
                                                    onChange={(e) => setSettings({...settings, twilio_sid: e.target.value})} 
                                                    placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Twilio Sender Phone Number</label>
                                                <input 
                                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                    value={settings.twilio_phone_number || ''} 
                                                    onChange={(e) => setSettings({...settings, twilio_phone_number: e.target.value})} 
                                                    placeholder="e.g. +1234567890" 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Twilio Auth Token</label>
                                                <div className="relative">
                                                    <input 
                                                        type={showTwilioToken ? 'text' : 'password'}
                                                        className="w-full h-12 pl-5 pr-12 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                        value={settings.twilio_auth_token || ''} 
                                                        onChange={(e) => setSettings({...settings, twilio_auth_token: e.target.value})} 
                                                        placeholder="Enter Auth Token" 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowTwilioToken(!showTwilioToken)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                                    >
                                                        {showTwilioToken ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                                                <HelpCircle size={20} className="text-slate-400 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                                    Once configured and toggled to <strong>Enabled</strong>, all verification codes generated for candidate registration, login, phone changes, and resets will be delivered as real SMS messages to the user's mobile. If disabled, the portal will fall back to using <strong>9999</strong> for local/dev verification.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'smtp' && can('manage_smtp') && (
                            <div className="animate-in fade-in duration-500 font-sans">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">SMTP Email Configuration</h2>
                                        <p className="text-sm text-slate-500">Configure SMTP credentials and toggle email OTP delivery for administrators.</p>
                                    </div>
                                    <button onClick={handleSaveSettings} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all cursor-pointer">
                                        <Save size={18} /> Save Config
                                    </button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <Send size={18} className="text-blue-600" />
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">SMTP Gateway Settings</h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={!!settings.smtp_enabled}
                                                    onChange={(e) => setSettings({...settings, smtp_enabled: e.target.checked ? 1 : 0})}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className="ml-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                    {settings.smtp_enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Host</label>
                                                <input 
                                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                    value={settings.smtp_host || ''} 
                                                    onChange={(e) => setSettings({...settings, smtp_host: e.target.value})} 
                                                    placeholder="smtp.example.com" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Username</label>
                                                <input 
                                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                    value={settings.smtp_user || ''} 
                                                    onChange={(e) => setSettings({...settings, smtp_user: e.target.value})} 
                                                    placeholder="user@example.com" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sender Email Address</label>
                                                <input 
                                                    type="email"
                                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                    value={settings.smtp_sender || ''} 
                                                    onChange={(e) => setSettings({...settings, smtp_sender: e.target.value})} 
                                                    placeholder="noreply@example.com" 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Port</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                        value={settings.smtp_port || ''} 
                                                        onChange={(e) => setSettings({...settings, smtp_port: e.target.value})} 
                                                        placeholder="587" 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Use SSL/TLS (Secure)</label>
                                                    <div className="h-12 flex items-center pl-2">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only peer" 
                                                                checked={!!settings.smtp_secure}
                                                                onChange={(e) => setSettings({...settings, smtp_secure: e.target.checked ? 1 : 0})}
                                                            />
                                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                            <span className="ml-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                                {settings.smtp_secure ? 'Yes' : 'No'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Password</label>
                                                <div className="relative">
                                                    <input 
                                                        type={showSmtpPassword ? 'text' : 'password'}
                                                        className="w-full h-12 pl-5 pr-12 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                        value={settings.smtp_pass || ''} 
                                                        onChange={(e) => setSettings({...settings, smtp_pass: e.target.value})} 
                                                        placeholder="Enter SMTP Password" 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                                    >
                                                        {showSmtpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                                                <HelpCircle size={20} className="text-slate-400 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                                    Once configured and toggled to <strong>Enabled</strong>, verification codes generated for administrators during forgot password reset flows and gateway logins will be delivered to their registered email addresses via SMTP. If disabled or fails, the portal falls back to Twilio SMS or the default mock OTP.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Send size={18} className="text-blue-600" />
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Test SMTP Connection</h3>
                                        </div>
                                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col sm:flex-row gap-4 items-end">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Email Address</label>
                                                <input 
                                                    type="email"
                                                    className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                                    value={testEmailRecipient} 
                                                    onChange={(e) => setTestEmailRecipient(e.target.value)} 
                                                    placeholder="recipient@example.com" 
                                                />
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={handleTestSmtp}
                                                disabled={isTestingSmtp || !testEmailRecipient}
                                                className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                            >
                                                {isTestingSmtp ? 'Sending Test...' : 'Send Test Email'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'interview_rules' && can('manage_rules') && (
                            <div className="animate-in fade-in duration-500 font-sans">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">Interview Rules & Regulations</h2>
                                        <p className="text-sm text-slate-500">Define the guidelines shown to candidates before booking a token.</p>
                                    </div>
                                    <button onClick={handleSaveSettings} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
                                        <Save size={18} /> Save Rules
                                    </button>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="grid gap-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rules Content</label>
                                        <WYSIWYG 
                                            value={settings.interview_rules || ''} 
                                            onChange={(val) => setSettings({...settings, interview_rules: val})} 
                                            placeholder="Write interview rules, document requirements, code of conduct..." 
                                        />
                                        <p className="text-[10px] text-slate-400 italic px-1">This content will be shown inside the 'I am Interested' confirmation modal when candidates apply for token-based jobs.</p>
                                    </div>
                                </div>
                            </div>
                        )}



                        {activeTab === 'pages' && can('manage_pages') && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div><h2 className="text-xl font-black text-slate-800">Platform Custom Pages</h2><p className="text-sm text-slate-500">Create policies, terms, and informational content.</p></div>
                                    {!editingPage && <button onClick={() => setEditingPage({ title: '', slug: '', content: '', target_role: 'public', is_active: true })} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all"><Plus size={20} /> Create Page</button>}
                                </div>
                                <div className="p-8">
                                    {editingPage ? (
                                        <div className="space-y-6">
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-2"><label className="text-xs font-black text-slate-400 uppercase ml-1">Page Title</label><input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none placeholder:text-slate-300 placeholder:font-normal" value={editingPage.title} onChange={(e) => setEditingPage({...editingPage, title: e.target.value})} placeholder="e.g. User Agreement" /></div>
                                                <div className="flex-1 space-y-2"><label className="text-xs font-black text-slate-400 uppercase ml-1">Friendly URL (Slug)</label><div className="flex items-center gap-2"><span className="text-slate-300 text-sm font-mono italic">/page/</span><input className="flex-1 h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-sm outline-none placeholder:text-slate-300 placeholder:font-normal" value={editingPage.slug} onChange={(e) => setEditingPage({...editingPage, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} placeholder="user-agreement" /></div></div>
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Visibility</label>
                                                    <div className="relative">
                                                        <select 
                                                            className="w-full h-12 px-5 pr-10 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold appearance-none cursor-pointer"
                                                            value={editingPage.target_role || 'public'}
                                                            onChange={(e) => setEditingPage({...editingPage, target_role: e.target.value})}
                                                        >
                                                            <option value="public">Public (All)</option>
                                                            <option value="employer">Employer Only</option>
                                                        </select>
                                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase ml-1">Page Content (Visual Editor)</label><WYSIWYG value={editingPage.content} onChange={(content) => setEditingPage({...editingPage, content})} placeholder="Focus on the details..." /></div>
                                            <div className="flex justify-between items-center pt-8 border-t border-slate-50">
                                                <label className="flex items-center gap-3 cursor-pointer group"><div className={`w-12 h-6 rounded-full transition-all relative ${editingPage.is_active ? 'bg-green-500' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editingPage.is_active ? 'left-7' : 'left-1'}`} /></div><input type="checkbox" className="hidden" checked={editingPage.is_active} onChange={(e) => setEditingPage({...editingPage, is_active: e.target.checked})} /><span className="text-sm font-black text-slate-600 uppercase tracking-wider">Publish Page</span></label>
                                                <div className="flex gap-3"><button onClick={() => setEditingPage(null)} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600">Cancel</button><button onClick={handleSavePage} className="px-10 py-3 bg-blue-600 font-bold text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Save Changes</button></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            {pages.length === 0 ? (
                                                <div className="text-center py-16 text-slate-400">
                                                    <div className="text-4xl mb-3">📄</div>
                                                    <p className="font-bold text-slate-500">No pages yet</p>
                                                    <p className="text-sm mt-1">Click <span className="font-bold">Create Page</span> to add your first custom page.</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="border-b border-slate-100">
                                                                 <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3 pl-1">Page Title</th>
                                                                 <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3">URL Slug</th>
                                                                 <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3">Visibility</th>
                                                                 <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3">Status</th>
                                                                 <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3 pr-1">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {pages.map(page => (
                                                                <tr key={page.id} className="group hover:bg-slate-50/70 transition-colors">
                                                                    <td className="py-4 pl-1">
                                                                        <span className="font-bold text-slate-800 text-sm">{page.title}</span>
                                                                    </td>
                                                                    <td className="py-4">
                                                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">/page/{page.slug}</span>
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${page.target_role === 'employer' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                            {page.target_role === 'employer' ? 'Employer Only' : 'Public'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${page.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                            {page.is_active ? 'Live' : 'Draft'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 pr-1">
                                                                        <div className="flex gap-1 justify-end">
                                                                            <button onClick={() => setEditingPage(page)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors" title="Edit">
                                                                                <Edit3 size={15} />
                                                                            </button>
                                                                            <button onClick={() => handleDeletePage(page.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors" title="Delete">
                                                                                <Trash2 size={15} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'testimonials' && can('manage_testimonials') && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div><h2 className="text-xl font-black text-slate-800">Testimonials Management</h2><p className="text-sm text-slate-500">Add official quotes from authorities for the home page.</p></div>
                                    <button onClick={() => { setEditingTestimonialId(null); setNewTestimonial({ name: '', designation: '', message: '', image_url: '' }); setShowTestimonialModal(true); }} className="h-10 px-6 bg-blue-600 text-white rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"><Plus size={18} /> Add Testimonial</button>
                                </div>
                                <div className="p-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-4 px-2">
                                            <div className="h-0.5 w-8 bg-blue-500"></div>
                                            <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Active Testimonials ({testimonials.length})</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {testimonials.map((t, index) => (
                                                <div 
                                                    key={t.id} 
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('text/plain', t.id);
                                                        e.currentTarget.style.opacity = '0.4';
                                                    }}
                                                    onDragEnd={(e) => e.currentTarget.style.opacity = '1'}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                                                        handleTestimonialReorder(draggedId, t.id);
                                                    }}
                                                    className="p-8 border border-slate-100 rounded-[2.5rem] bg-white flex justify-between items-start group hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100 transition-all cursor-move"
                                                >
                                                    <div className="flex gap-6">
                                                        <div className="pt-2 text-slate-300 group-hover:text-blue-400 transition-colors">
                                                            <GripVertical size={24} />
                                                        </div>
                                                        <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 font-black text-2xl uppercase overflow-hidden border border-slate-100">
                                                            {t.image_url ? (
                                                                <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span>{t.name.charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-black text-slate-800 text-lg leading-tight">{t.name}</h4>
                                                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                                <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest">{t.designation}</p>
                                                            </div>
                                                            <p className="text-slate-500 italic leading-relaxed text-sm">"{t.message}"</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingTestimonialId(t.id);
                                                                setNewTestimonial({ name: t.name, designation: t.designation, message: t.message, image_url: t.image_url });
                                                                setShowTestimonialModal(true);
                                                            }}
                                                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all"
                                                        >
                                                            <Edit3 size={20} />
                                                        </button>
                                                        <button onClick={() => handleDeleteTestimonial(t.id)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 size={20} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'csr' && can('manage_csr') && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div><h2 className="text-xl font-black text-slate-800">Partners Content</h2><p className="text-sm text-slate-500">Manage description and partners list.</p></div>
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveSettings} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-slate-100"><Save size={18} /> Update Content</button>
                                    </div>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-slate-100">
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Page Section</h3>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Section Title</label>
                                                <input 
                                                    type="text" 
                                                    value={settings.csr_home_title || ''} 
                                                    onChange={(e) => setSettings({...settings, csr_home_title: e.target.value})}
                                                    placeholder="e.g., Partners & Support"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Section Subtitle</label>
                                                <textarea 
                                                    value={settings.csr_home_subtitle || ''} 
                                                    onChange={(e) => setSettings({...settings, csr_home_subtitle: e.target.value})}
                                                    placeholder="Enter a brief description..."
                                                    rows={2}
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partners Page Banner</h3>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Banner Title</label>
                                                <input 
                                                    type="text" 
                                                    value={settings.csr_page_title || ''} 
                                                    onChange={(e) => setSettings({...settings, csr_page_title: e.target.value})}
                                                    placeholder="e.g., Our Partners"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Banner Subtitle</label>
                                                <textarea 
                                                    value={settings.csr_page_subtitle || ''} 
                                                    onChange={(e) => setSettings({...settings, csr_page_subtitle: e.target.value})}
                                                    placeholder="Enter a brief description..."
                                                    rows={2}
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Partners Page Intro/Content</label>
                                        <WYSIWYG value={settings.csr_partners_content || ''} onChange={(val) => setSettings({...settings, csr_partners_content: val})} placeholder="Add some introductory text for the partners page..." />
                                    </div>
                                    <div className="pt-8 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Partner Logos ({csrPartners.length})</h3>
                                            <button 
                                                onClick={() => { setEditingCsrId(null); setNewCsrPartner({ name: '', logo_url: '', status: 'active' }); setShowCsrModal(true); }} 
                                                className="h-10 px-6 bg-blue-600 text-white rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                            >
                                                <Plus size={18} /> Add New Partner
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {csrPartners.map(partner => (
                                                <div key={partner.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-blue-200 transition-all text-center relative overflow-hidden">
                                                    <div className="absolute top-4 right-4">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${partner.status === 'inactive' ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-600'}`}>
                                                            {partner.status || 'active'}
                                                        </span>
                                                    </div>
                                                    <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center p-2 border border-slate-100 shadow-sm">
                                                        {partner.logo_url ? (
                                                            <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <span className="text-xs font-black text-slate-200 uppercase">No Logo</span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-black text-slate-800 mb-1">{partner.name}</h3>
                                                    <div className="flex gap-2 justify-center mt-4">
                                                        <button 
                                                            onClick={async () => {
                                                                try {
                                                                    const newStatus = partner.status === 'inactive' ? 'active' : 'inactive';
                                                                    await axios.put(`${API_BASE}/admin/csr-partners/${partner.id}`, {
                                                                        name: partner.name,
                                                                        logo_url: partner.logo_url,
                                                                        status: newStatus
                                                                    });
                                                                    fetchCsrPartners();
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert("Failed to toggle status");
                                                                }
                                                            }} 
                                                            className={`p-2 rounded-xl transition-colors ${partner.status === 'inactive' ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-200'}`}
                                                            title={partner.status === 'inactive' ? 'Activate Partner' : 'Deactivate Partner'}
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button onClick={() => { setEditingCsrId(partner.id); setNewCsrPartner({ name: partner.name, logo_url: partner.logo_url, status: partner.status || 'active' }); setShowCsrModal(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"><Edit3 size={16} /></button>
                                                        <button onClick={() => handleDeleteCsrPartner(partner.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {csrPartners.length === 0 && (
                                            <div className="py-20 text-center text-slate-400 italic">No partners added yet.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity_log' && isSuperAdmin && (() => {
                            const actionMeta = {
                                APPROVED_EMPLOYER:   { label: 'Approved Employer',    color: 'bg-green-100 text-green-700' },
                                REJECTED_EMPLOYER:   { label: 'Rejected Employer',    color: 'bg-red-100 text-red-700' },
                                VERIFIED_EMPLOYER:   { label: 'Verified Employer',    color: 'bg-blue-100 text-blue-700' },
                                UNVERIFIED_EMPLOYER: { label: 'Unverified Employer',  color: 'bg-amber-100 text-amber-700' },
                                DELETED_EMPLOYER:    { label: 'Deleted Employer',     color: 'bg-red-100 text-red-700' },
                                CREATED_ADMIN_USER:  { label: 'Created Admin User',   color: 'bg-indigo-100 text-indigo-700' },
                                UPDATED_ADMIN_USER:  { label: 'Updated Admin User',   color: 'bg-slate-100 text-slate-700' },
                                DELETED_ADMIN_USER:  { label: 'Deleted Admin User',   color: 'bg-red-100 text-red-700' },
                            };
                            return (
                                <div className="animate-in fade-in duration-500">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800">Activity Log</h2>
                                            <p className="text-sm text-slate-500">All actions performed by admin and staff users.</p>
                                        </div>
                                        <button onClick={() => fetchActivityLog(activityPage)} className="h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-sm flex items-center gap-2 transition-all">
                                            <Clock size={14} /> Refresh
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        {activityLoading ? (
                                            <div className="py-20 text-center text-slate-400"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
                                        ) : activityLogs.length === 0 ? (
                                            <div className="py-20 text-center text-slate-400 italic">No activity recorded yet.</div>
                                        ) : (
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50/80 border-y border-slate-100">
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date & Time</th>
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Admin</th>
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Action</th>
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Target</th>
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">IP Address</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {activityLogs.map(log => {
                                                        const meta = actionMeta[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-600' };
                                                        return (
                                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                                                                <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                                                    {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-slate-800 text-sm">{log.admin_name || '—'}</div>
                                                                    <div className="text-[11px] text-slate-400">{log.admin_email || ''}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${meta.color}`}>{meta.label}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">{log.target_label || `#${log.target_id}`}</td>
                                                                <td className="px-6 py-4 text-xs text-slate-400 font-mono">{log.ip_address || '—'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    {activityTotalPages > 1 && (
                                        <div className="flex justify-center items-center gap-3 p-6 border-t border-slate-100">
                                            <button onClick={() => fetchActivityLog(activityPage - 1)} disabled={activityPage === 1} className="h-9 px-4 rounded-full bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-40 hover:bg-slate-200 transition-all">← Prev</button>
                                            <span className="text-sm font-bold text-slate-500">Page {activityPage} of {activityTotalPages}</span>
                                            <button onClick={() => fetchActivityLog(activityPage + 1)} disabled={activityPage === activityTotalPages} className="h-9 px-4 rounded-full bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-40 hover:bg-slate-200 transition-all">Next →</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {activeTab === 'domains' && can('manage_domains') && (
                            <div className="animate-in fade-in duration-500 font-sans">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div><h2 className="text-xl font-black text-slate-800">Domain Restriction Rules</h2><p className="text-sm text-slate-500">Show or hide verification features on specific URLs/domains.</p></div>
                                    <button onClick={handleSaveSettings} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"><Save size={18} /> Save Rules</button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                            <ShieldCheck className="text-blue-600" size={20} />
                                            Active Domain Verification Filtering
                                        </h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            You can specify which domains/URLs are allowed to display specific manual and automatic verification options. Enter comma-separated URLs or domains (e.g. <code>example.com, domain.com</code>). If left empty, that section will be visible everywhere.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">GST Verification Domains</label>
                                            <input 
                                                className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-semibold outline-none focus:ring-2 focus:ring-blue-100" 
                                                value={settings.gst_domains || ''} 
                                                onChange={(e) => setSettings({...settings, gst_domains: e.target.value})} 
                                                placeholder="e.g. example.com, domain.com" 
                                            />
                                            <p className="text-[10px] text-slate-400 italic px-1">GST verification section will only be shown on these comma-separated domains.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Business License Domains</label>
                                            <input 
                                                className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-semibold outline-none focus:ring-2 focus:ring-blue-100" 
                                                value={settings.trade_license_domains || ''} 
                                                onChange={(e) => setSettings({...settings, trade_license_domains: e.target.value})} 
                                                placeholder="e.g. example.com, domain.com" 
                                            />
                                            <p className="text-[10px] text-slate-400 italic px-1">Business License upload/verification section will only be shown on these comma-separated domains.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}



                        {activeTab === 'security' && (
                            <div className="animate-in fade-in duration-500">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h2 className="text-xl font-black text-slate-800">Account Security</h2><p className="text-sm text-slate-500">Management credentials and security protocols.</p></div>
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Change Password</h3>
                                        <form onSubmit={handlePasswordReset} className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        required
                                                        className="w-full h-12 pl-5 pr-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100"
                                                        value={passwords.current}
                                                        onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        required
                                                        className="w-full h-12 pl-5 pr-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100"
                                                        value={passwords.new}
                                                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        required
                                                        className="w-full h-12 pl-5 pr-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100"
                                                        value={passwords.confirm}
                                                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            {passMsg && <div className={`text-xs font-bold p-4 rounded-2xl ${passMsg.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{passMsg.text}</div>}
                                            <button type="submit" className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all mt-4">Update Administrator Credentials</button>
                                        </form>
                                    </div>
                                    <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-8 md:pt-0 md:pl-12 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Gateway Restriction</h3>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Admin Gateway Secret Key</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., brazil"
                                                        className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                                                        value={settings.admin_login_secret || ''}
                                                        onChange={(e) => setSettings({...settings, admin_login_secret: e.target.value})}
                                                    />
                                                    <p className="text-[10px] text-slate-400 italic mt-2 leading-relaxed">
                                                        When configured, users must access the administrative gateway via a secret query parameter.
                                                    </p>
                                                    <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-2xl mt-4">
                                                        <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1">Example Gateway URL:</div>
                                                        <div className="text-[11px] font-mono break-all text-slate-700 select-all font-bold">
                                                            {window.location.origin}/admin-login/?secret={settings.admin_login_secret || 'yourkey'}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 italic mt-2 leading-relaxed">
                                                        If the key is left empty, the gateway will be accessible to everyone at the standard <span className="font-bold">/admin-login</span> URL.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleSaveSettings} 
                                            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-8"
                                        >
                                            Save Gateway Restriction
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Testimonial Modal */}
            {showTestimonialModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowTestimonialModal(false)} />
                    <div className="bg-white w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">{editingTestimonialId ? 'Edit Testimonial' : 'Add New Testimonial'}</h3>
                                <p className="text-sm text-slate-500">Official quote for the landing page.</p>
                            </div>
                            <button onClick={() => setShowTestimonialModal(false)} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all shadow-sm"><X size={24} /></button>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                                <div className="md:col-span-1 flex flex-col items-center">
                                    <div className="w-40 h-40 rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-300 transition-all">
                                        {newTestimonial.image_url ? (
                                            <>
                                                <img src={newTestimonial.image_url} alt="Profile" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                    <button onClick={() => setNewTestimonial({...newTestimonial, image_url: ''})} className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={18} /></button>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setNewTestimonial({...newTestimonial, image_url: reader.result});
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                                <Plus size={32} className="text-slate-300 mb-2" />
                                                <span className="text-xs font-black uppercase text-slate-400">Add Photo</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-1 lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                                            <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" value={newTestimonial.name} onChange={e => setNewTestimonial({...newTestimonial, name: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Designation</label>
                                            <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" value={newTestimonial.designation} onChange={e => setNewTestimonial({...newTestimonial, designation: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Official Message</label>
                                            <span className={`text-[10px] font-bold ${(newTestimonial.message || '').length >= 250 ? 'text-red-500 font-extrabold animate-pulse' : 'text-slate-400'}`}>
                                                {(newTestimonial.message || '').length}/250
                                            </span>
                                        </div>
                                        <textarea 
                                            maxLength={250}
                                            className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-medium h-32 resize-none leading-relaxed" 
                                            value={newTestimonial.message} 
                                            onChange={e => setNewTestimonial({...newTestimonial, message: e.target.value})} 
                                        />
                                    </div>
                                    <button onClick={handleAddTestimonial} className="w-full h-14 bg-blue-600 text-white rounded-[1.5rem] font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 text-lg">
                                        <Save size={20} /> {editingTestimonialId ? 'Update Testimonial' : 'Save Testimonial'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Partner Modal */}
            {showCsrModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowCsrModal(false)} />
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{editingCsrId ? 'Edit Partner' : 'Add Partner'}</h3>
                                <p className="text-xs text-slate-500">Add company logo and categorization.</p>
                            </div>
                            <button onClick={() => setShowCsrModal(false)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all shadow-sm"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveCsrPartner} className="p-8 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Company Name</label>
                                <input className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all text-sm" value={newCsrPartner.name} onChange={e => setNewCsrPartner({...newCsrPartner, name: e.target.value})} required />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status</label>
                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setNewCsrPartner({...newCsrPartner, status: 'active'})}
                                        className={`flex-1 h-12 rounded-2xl font-bold text-sm transition-all border ${newCsrPartner.status !== 'inactive' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Active
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setNewCsrPartner({...newCsrPartner, status: 'inactive'})}
                                        className={`flex-1 h-12 rounded-2xl font-bold text-sm transition-all border ${newCsrPartner.status === 'inactive' ? 'bg-slate-500 border-slate-500 text-white shadow-lg shadow-slate-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Inactive
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Upload Partner Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden group hover:border-blue-300 transition-all">
                                        {newCsrPartner.logo_url ? (
                                            <img src={newCsrPartner.logo_url} alt="Preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <Plus size={24} className="text-slate-300" />
                                        )}
                                        <input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const formData = new FormData();
                                                formData.append('csr_logo', file);
                                                try {
                                                    const res = await axios.post(`${API_BASE}/admin/csr-partners/upload`, formData);
                                                    setNewCsrPartner({...newCsrPartner, logo_url: res.data.url});
                                                } catch (err) { 
                                                    console.error("Upload error:", err);
                                                    alert(`Upload failed: ${err.response?.data?.error || err.message}`); 
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 leading-relaxed italic">Click the box to upload a transparent PNG logo. Recommended size: 400x200px.</p>
                                        {newCsrPartner.logo_url && (
                                            <div className="mt-1 text-[9px] text-blue-500 font-mono truncate max-w-[200px]">{newCsrPartner.logo_url}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowCsrModal(false)} className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" className="flex-[2] h-12 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                    <Save size={18} /> {editingCsrId ? 'Update Partner' : 'Save Partner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
