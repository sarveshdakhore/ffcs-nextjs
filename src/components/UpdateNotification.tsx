'use client';

import { useState, useEffect } from 'react';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('[Update Notification] New version available!');
        setShowUpdate(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleReload = () => {
    console.log('[Update Notification] Reloading app...');
    // This preserves localStorage and localforage data
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(15, 15, 15, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '2px solid #4ECDCC',
        borderRadius: '15px',
        padding: '1rem 1.5rem',
        boxShadow: '0 8px 32px rgba(78, 205, 204, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        maxWidth: '90%',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <i className="fas fa-sync-alt" style={{ color: '#4ECDCC', fontSize: '1.2rem' }}></i>
        <span style={{ color: 'white', fontWeight: 500, fontSize: '0.95rem' }}>
          New version available! Reload to get the latest updates.
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
        <button
          onClick={handleReload}
          style={{
            background: 'linear-gradient(135deg, #4ECDCC 0%, #3BB8B8 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1.25rem',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(78, 205, 204, 0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(78, 205, 204, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 204, 0.3)';
          }}
        >
          Reload Now
        </button>

        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
