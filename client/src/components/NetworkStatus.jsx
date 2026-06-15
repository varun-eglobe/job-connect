import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const NetworkStatus = ({ forceShow }) => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleReload = () => {
        window.location.reload();
    };

    if (!isOffline && !forceShow) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300 border border-slate-100">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6 shadow-xl shadow-red-100/50">
                    <WifiOff size={40} />
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 mb-3">Connection Lost</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    It looks like you're offline or the server is temporarily unreachable. Please check your internet connection and try again.
                </p>

                <button 
                    onClick={handleReload}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 active:scale-95"
                >
                    <RefreshCw size={20} />
                    Try Again
                </button>

                {forceShow && (
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                    >
                        Dismiss Overlay
                    </button>
                )}
                
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <AlertCircle size={12} />
                    Offline Mode Active
                </div>
            </div>
        </div>
    );
};

export default NetworkStatus;
