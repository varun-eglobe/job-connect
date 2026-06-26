import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, UserCheck, UserX, Building, Search, Settings, Clock, Trash2 } from 'lucide-react';

const AdminDashboard = () => {
    const [employers, setEmployers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [approvalFilter, setApprovalFilter] = useState('all'); // all, approved, pending
    const [verifiedFilter, setVerifiedFilter] = useState('all'); // all, verified, unverified
    const [previewImage, setPreviewImage] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'admin') {
            navigate('/login');
        }
    }, [navigate]);

    const userPermissions = JSON.parse(localStorage.getItem('permissions') || '{}');
    const userEmail = localStorage.getItem('email');
    const userName = localStorage.getItem('name');
    const isSuperAdmin = userPermissions.super_admin === true || userEmail === 'admin@jobconnect.gov.in' || userName === 'Super Admin';
    const can = (permission) => isSuperAdmin || userPermissions[permission] === true;

    const fetchEmployers = async () => {
        try {
            const response = await axios.get('/api/admin/employers');
            setEmployers(response.data);
        } catch (err) {
            console.error("Error fetching employers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployers();
    }, []);

    const toggleApproval = async (id, currentStatus) => {
        try {
            await axios.put(`/api/admin/approve/${id}`, {
                is_approved: !currentStatus
            });
            fetchEmployers();
        } catch (err) {
            alert("Approval failed");
        }
    };

    const toggleVerification = async (id, currentStatus) => {
        const confirmMsg = currentStatus
            ? "Are you sure you want to remove the verification status for this employer?"
            : "Are you sure you want to verify this employer?";
        
        if (!window.confirm(confirmMsg)) {
            return;
        }

        try {
            await axios.put(`/api/admin/verify/${id}`, {
                is_verified: !currentStatus
            });
            fetchEmployers();
        } catch (err) {
            alert("Verification failed");
        }
    };

    const handleDeleteEmployer = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this employer registration?")) {
            return;
        }
        try {
            await axios.delete(`/api/admin/employers/${id}`);
            fetchEmployers();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete employer");
        }
    };

    const filteredEmployers = employers.filter(e => {
        const matchesSearch = 
            (e.company_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
            (e.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesApproval =
            approvalFilter === 'all' ? true :
                approvalFilter === 'approved' ? e.is_approved :
                    approvalFilter === 'pending' ? !e.is_approved : true;
        const matchesVerified =
            verifiedFilter === 'all' ? true :
                verifiedFilter === 'verified' ? e.is_verified :
                    verifiedFilter === 'unverified' ? !e.is_verified : true;
        return matchesSearch && matchesApproval && matchesVerified;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, approvalFilter, verifiedFilter]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredEmployers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEmployers.length / itemsPerPage);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            <div className="bg-white rounded-none border border-slate-200 p-8 text-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                        <ShieldCheck size={16} />
                        Control Panel
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-extrabold text-slate-900">Admin Management</h1>
                        <Link
                            to="/admin/settings/users"
                            className="bg-slate-50 hover:bg-slate-100 p-2 rounded-none border border-slate-200 transition-all"
                            title="Manage Masters & Settings"
                        >
                            <Settings size={22} className="text-blue-600" />
                        </Link>
                    </div>
                </div>
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search business..."
                        className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm text-slate-800 placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
            </div>

            <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden h-fit">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="font-bold text-slate-800">Employer Management Queue</h2>
                            <p className="text-xs text-slate-500 mt-1">Review registrations and assign trust badges.</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="relative group min-w-[160px]">
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1">Listing Approval</label>
                                <select
                                    value={approvalFilter}
                                    onChange={(e) => setApprovalFilter(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-none text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer shadow-sm pr-10"
                                >
                                    <option value="all">All Status</option>
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending</option>
                                </select>
                                <div className="absolute right-4 bottom-3 pointer-events-none text-slate-400">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            <div className="relative group min-w-[160px]">
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1">Verified Badge</label>
                                <select
                                    value={verifiedFilter}
                                    onChange={(e) => setVerifiedFilter(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-none text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer shadow-sm pr-10"
                                >
                                    <option value="all">All Badges</option>
                                    <option value="verified">Verified</option>
                                    <option value="unverified">Not Verified</option>
                                </select>
                                <div className="absolute right-4 bottom-3 pointer-events-none text-slate-400">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {can('manage_employers') ? (
                        <>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs uppercase tracking-wider text-slate-400 font-bold bg-slate-50">
                                    <th className="px-6 py-4">Business Name & Contact</th>
                                    <th className="px-6 py-4">Listing Approval</th>
                                    <th className="px-6 py-4">License Document</th>
                                    <th className="px-6 py-4 text-right">Verified Badge</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-slate-400 italic">Loading data...</td>
                                    </tr>
                                ) : employers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-slate-400 italic">No employers registered yet.</td>
                                    </tr>
                                ) : filteredEmployers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-slate-400 italic">No employers match the selected filters.</td>
                                    </tr>
                                ) : (
                                    currentItems.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-none flex items-center justify-center text-slate-400">
                                                            <Building size={20} />
                                                        </div>
                                                        <div>
                                                            <Link 
                                                                to={`/employers/${emp.id}`}
                                                                className="font-bold text-slate-900 hover:text-blue-600 hover:underline transition-colors"
                                                            >
                                                                {emp.company_name}
                                                            </Link>
                                                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-1">
                                                                <span className="break-all">{emp.email}</span>
                                                                <span>•</span>
                                                                <span>{emp.phone}</span>
                                                            </div>
                                                            {emp.gst_number && (
                                                                <div className="mt-1 flex items-center gap-2 text-xs">
                                                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 font-mono font-semibold uppercase rounded">
                                                                        GST: {emp.gst_number}
                                                                    </span>
                                                                    {!emp.is_verified && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    try {
                                                                                        if (navigator.clipboard && navigator.clipboard.writeText) {
                                                                                            navigator.clipboard.writeText(emp.gst_number);
                                                                                        } else {
                                                                                            const textarea = document.createElement('textarea');
                                                                                            textarea.value = emp.gst_number;
                                                                                            textarea.style.position = 'fixed';
                                                                                            textarea.style.opacity = '0';
                                                                                            document.body.appendChild(textarea);
                                                                                            textarea.select();
                                                                                            document.execCommand('copy');
                                                                                            document.body.removeChild(textarea);
                                                                                        }
                                                                                        setCopiedId(emp.id);
                                                                                        setTimeout(() => {
                                                                                            setCopiedId(null);
                                                                                        }, 2000);
                                                                                    } catch (err) {
                                                                                        console.error('Failed to copy text', err);
                                                                                    }
                                                                                }}
                                                                                className={`${copiedId === emp.id ? 'text-green-600 font-bold' : 'text-blue-600 hover:text-blue-800 font-bold'} text-[10px] uppercase hover:underline`}
                                                                            >
                                                                                {copiedId === emp.id ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                            <span className="text-slate-300">|</span>
                                                                            <a
                                                                                href="https://services.gst.gov.in/services/searchtp"
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-slate-500 hover:text-blue-600 font-medium text-[10px] flex items-center gap-0.5 hover:underline"
                                                                            >
                                                                                Verify GST ↗
                                                                            </a>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => toggleApproval(emp.id, emp.is_approved)}
                                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-none font-bold text-[10px] uppercase tracking-wider transition-all ${emp.is_approved
                                                                ? 'bg-green-50 text-green-600 border border-green-100'
                                                                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-100'
                                                                }`}
                                                        >
                                                            {emp.is_approved ? <UserCheck size={14} /> : <Clock size={14} />}
                                                            {emp.is_approved ? 'Approved' : 'Pending'}
                                                        </button>
                                                        {!emp.is_approved && (
                                                            <button
                                                                onClick={() => handleDeleteEmployer(emp.id)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-none font-bold text-[10px] uppercase tracking-wider transition-all"
                                                                title="Delete registration request"
                                                            >
                                                                <Trash2 size={14} />
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {emp.license_image_url ? (
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={emp.license_image_url}
                                                                alt="License"
                                                                className="w-10 h-10 rounded-none object-cover border border-slate-200 cursor-pointer hover:opacity-85 transition-opacity"
                                                                onClick={() => setPreviewImage(emp.license_image_url)}
                                                            />
                                                            <button
                                                                onClick={() => setPreviewImage(emp.license_image_url)}
                                                                className="text-xs text-blue-600 font-bold hover:underline"
                                                            >
                                                                Preview
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">None (GST Method)</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                     <button
                                                         onClick={() => toggleVerification(emp.id, emp.is_verified)}
                                                         className={`inline-flex items-center gap-2 px-4 py-2 rounded-none font-bold text-[10px] uppercase tracking-wider transition-all ${emp.is_verified
                                                             ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                             : 'bg-slate-100 text-slate-400 hover:text-blue-600 font-medium'
                                                             }`}
                                                     >
                                                         <ShieldCheck size={14} />
                                                         {emp.is_verified 
                                                              ? (emp.gst_number ? 'GST Verified' : 'Verified') 
                                                              : 'Verification pending'}
                                                     </button>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                                <div className="text-xs text-slate-500 font-bold">
                                    Showing <span className="text-slate-800">{indexOfFirstItem + 1}</span> to{' '}
                                    <span className="text-slate-800">{Math.min(indexOfLastItem, filteredEmployers.length)}</span> of{' '}
                                    <span className="text-slate-800">{filteredEmployers.length}</span> employers
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        className="h-9 px-3 bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-none transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalPages }).map((_, idx) => {
                                        const pageNum = idx + 1;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-9 h-9 font-black text-xs rounded-none border transition-all cursor-pointer active:scale-95 ${
                                                    currentPage === pageNum
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        className="h-9 px-3 bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-none transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-none flex items-center justify-center mx-auto text-slate-300">
                                <UserX size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Access Restricted</h3>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto">You do not have permission to manage the Employer Queue. Please contact the Super Admin.</p>
                            </div>
                            <Link to="/admin/settings" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-none font-bold text-sm hover:bg-black transition-all">
                                Go to My Settings <Settings size={16} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {previewImage && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-none overflow-hidden max-w-2xl w-full border border-slate-100 shadow-2xl relative">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-extrabold text-slate-800">Trade License Document Preview</h3>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6 flex items-center justify-center bg-slate-100/50 max-h-[70vh] overflow-y-auto">
                            <img src={previewImage} alt="Trade License Full View" className="max-w-full h-auto rounded-none shadow-md border border-slate-200" />
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-none text-xs uppercase tracking-wider transition-colors"
                            >
                                Close Preview
                            </button>
                            {(() => {
                                const emp = employers.find(e => e.license_image_url === previewImage);
                                if (emp && !emp.is_verified) {
                                    return (
                                        <button
                                            onClick={async () => {
                                                await toggleVerification(emp.id, emp.is_verified);
                                                setPreviewImage(null);
                                            }}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none text-xs uppercase tracking-wider transition-colors shadow-lg shadow-blue-200"
                                        >
                                            Verify Employer Now
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
