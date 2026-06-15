import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Clock } from 'lucide-react';

const StaticPage = () => {
    const { slug } = useParams();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPage = async () => {
            try {
                const res = await axios.get(`/api/pages/${slug}`);
                setPage(res.data);
            } catch (err) {
                console.error("Page fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
    }, [slug]);

    if (loading) return <div className="p-20 text-center text-slate-400">Loading content...</div>;
    if (!page) return (
        <div className="p-20 text-center">
            <h1 className="text-2xl font-bold text-slate-800">404 - Page Not Found</h1>
            <button onClick={() => navigate('/')} className="mt-4 text-blue-600 font-bold hover:underline">Back to Home</button>
        </div>
    );

    return (
        <div className="bg-white min-h-screen">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 py-12">
                <div className="max-w-4xl mx-auto px-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm mb-6 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>
                    <h1 className="text-4xl font-black text-slate-900 mb-4">{page.title}</h1>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Clock size={14} />
                        Last updated {page.created_at ? new Date(String(page.created_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-12 pb-24">
                <div 
                    className="prose prose-slate max-w-none text-slate-700 leading-relaxed cms-content"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </div>

            <style>{`
                .cms-content h1 { font-size: 2rem; font-weight: 800; margin-bottom: 1rem; color: #1e293b; }
                .cms-content h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: #334155; }
                .cms-content p { margin-bottom: 1.25rem; }
                .cms-content ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1.25rem; }
                .cms-content ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1.25rem; }
                .cms-content li { margin-bottom: 0.5rem; }
                .cms-content strong { color: #000; font-weight: 700; }
                .cms-content blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; italic; color: #64748b; margin: 1.5rem 0; }
            `}</style>
        </div>
    );
};

export default StaticPage;
