import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CSRPartners = () => {
    const [partners, setPartners] = useState([]);
    const [content, setContent] = useState('');
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'CSR Partnerships & Sponsors - Job Connect';
        const fetchData = async () => {
            try {
                const [partnersRes, settingsRes] = await Promise.all([
                    axios.get('/api/csr-partners'),
                    axios.get('/api/settings')
                ]);
                const shuffledPartners = (partnersRes.data || []).sort(() => Math.random() - 0.5);
                setPartners(shuffledPartners);
                setSettings(settingsRes.data || {});
                setContent(settingsRes.data.csr_partners_content || '');
            } catch (err) {
                console.error("Failed to fetch CSR data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 text-center">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back to Home
                    </Link>
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Building2 size={32} />
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">{settings?.csr_page_title || 'Our Partners'}</h1>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                        {settings?.csr_page_subtitle || 'Recognizing the organizations that empower our local workforce and drive community growth.'}
                    </p>
                </div>
            </div>

            {/* Content & Logos */}
            <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
                {/* Intro Content */}
                {content && (
                    <div className="mb-20 prose prose-slate max-w-4xl mx-auto prose-h1:font-black prose-h2:font-black prose-p:text-slate-600 prose-p:leading-loose">
                        <div dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                )}

                {/* Logos Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-12 items-center justify-items-center">
                    {partners.map(partner => (
                        <div key={partner.id} className="group relative flex items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-500 w-full aspect-video overflow-hidden">
                            <img 
                                src={partner.logo_url} 
                                alt={partner.name} 
                                className="h-10 md:h-14 w-auto max-w-[80%] object-contain transition-transform duration-500 group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 bg-gradient-to-t from-blue-50/50 to-transparent">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{partner.name}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {partners.length === 0 && !content && (
                    <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                        <div className="text-slate-400 italic">No partners or content added yet.</div>
                        <Link to="/" className="mt-4 inline-block text-blue-600 font-bold hover:underline">Return to Home</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CSRPartners;
