import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, Info } from 'lucide-react';

const InstallPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [platform, setPlatform] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        // 1. Detect Platform
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
        const hasDismissed = localStorage.getItem('installPromptDismissed');

        // 2. Handle Android/Chrome
        const handleBeforeInstallPrompt = (e) => {
            console.log('✅ PWA: beforeinstallprompt event fired!');
            e.preventDefault();
            setDeferredPrompt(e);
            if (!hasDismissed && !isStandalone) {
                console.log('📦 PWA: Showing install prompt UI');
                setPlatform('android');
                setShowPrompt(true);
            } else {
                console.log('⏭️ PWA: Prompt suppressed (Dismissed or Standalone)');
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 3. Handle iOS specifically
        if (isIOS && !isStandalone && !hasDismissed) {
            console.log('🍎 PWA: iOS detected, showing instructions');
            setPlatform('ios');
            setShowPrompt(true);
        }
        
        console.log('🔍 PWA Debug:', { isIOS, isStandalone, hasDismissed });

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (platform === 'android' && deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('installPromptDismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-6 left-4 right-4 z-[200] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-blue-100 shadow-2xl rounded-3xl p-5 overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl"></div>
                
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                        <Download size={28} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-slate-800 leading-tight mb-1">Get the App</h3>
                        <p className="text-sm text-slate-600 leading-snug">
                            {platform === 'ios' 
                                ? 'Add this job portal to your home screen for instant access.' 
                                : 'Install our app for a faster, better experience.'}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                    {platform === 'android' ? (
                        <button 
                            onClick={handleInstallClick}
                            className="w-full h-12 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            Install Now
                        </button>
                    ) : (
                        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                            <div className="flex items-center gap-3 text-sm font-bold text-blue-700 mb-3">
                                <Info size={18} />
                                <span>Instructions for iOS</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                    <div className="w-6 h-6 bg-white rounded-lg border border-blue-100 flex items-center justify-center shrink-0">
                                        <Share size={14} className="text-blue-500" />
                                    </div>
                                    <span>Tap the <strong className="text-slate-800">Share</strong> button below</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                    <div className="w-6 h-6 bg-white rounded-lg border border-blue-100 flex items-center justify-center shrink-0">
                                        <PlusSquare size={14} className="text-blue-500" />
                                    </div>
                                    <span>Select <strong className="text-slate-800">'Add to Home Screen'</strong></span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleDismiss}
                        className="text-xs font-bold text-slate-400 hover:text-slate-500 transition-colors uppercase tracking-widest text-center py-1"
                    >
                        Not Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
