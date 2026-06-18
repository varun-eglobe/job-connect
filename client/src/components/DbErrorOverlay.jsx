import React, { useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import axios from 'axios';

const DbErrorOverlay = ({ details, onRetry }) => {
    const [retrying, setRetrying] = useState(false);
    const [failed, setFailed] = useState(false);

    const handleRetry = async () => {
        setRetrying(true);
        setFailed(false);
        try {
            const res = await axios.get('/api/health');
            if (res.data?.database === 'connected') {
                onRetry();
            } else {
                setFailed(true);
            }
        } catch {
            setFailed(true);
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10, 14, 30, 0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)'
        }}>
            <div style={{
                textAlign: 'center', padding: '40px 32px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px', maxWidth: '340px', width: '100%'
            }}>
                {/* Icon */}
                <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px'
                }}>
                    <Database size={28} color="#f87171" />
                </div>

                {/* Text */}
                <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
                    Database Offline
                </h2>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>
                    Start MySQL in WampServer / XAMPP, then click retry.
                </p>

                {details?.host && (
                    <p style={{ color: '#475569', fontSize: 11, margin: '0 0 24px', fontFamily: 'monospace' }}>
                        {details.host}:{details.port} · {details.database}
                    </p>
                )}

                {failed && (
                    <p style={{ color: '#f87171', fontSize: 12, marginBottom: 16 }}>
                        Still offline. Check your MySQL service.
                    </p>
                )}

                {/* Retry button */}
                <button
                    onClick={handleRetry}
                    disabled={retrying}
                    style={{
                        width: '100%', height: 44, borderRadius: 12, border: 'none',
                        background: retrying ? 'rgba(99,102,241,0.4)' : '#6366f1',
                        color: '#fff', fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, cursor: retrying ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s'
                    }}>
                    <RefreshCw size={16} style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }} />
                    {retrying ? 'Checking…' : 'Retry Connection'}
                </button>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default DbErrorOverlay;
