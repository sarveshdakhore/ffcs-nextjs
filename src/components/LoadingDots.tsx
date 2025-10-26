import React from 'react';

const LoadingDots: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: '#171717',
      backgroundImage: 
        'linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
      backgroundSize: '4rem 4rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      transition: 'opacity 0.5s ease-out'
    }}>
      <div className="loading-dots" style={{ display: 'flex', gap: '1rem' }}>
        <div className="loading-dot dot-blue" style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#4285F4',
          animation: 'loading-bounce 1.4s infinite ease-in-out',
          animationDelay: '-0.32s'
        }}></div>
        <div className="loading-dot dot-red" style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#EA4335',
          animation: 'loading-bounce 1.4s infinite ease-in-out',
          animationDelay: '-0.16s'
        }}></div>
        <div className="loading-dot dot-yellow" style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#FBBC05',
          animation: 'loading-bounce 1.4s infinite ease-in-out',
          animationDelay: '0s'
        }}></div>
        <div className="loading-dot dot-green" style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#34A853',
          animation: 'loading-bounce 1.4s infinite ease-in-out',
          animationDelay: '0.16s'
        }}></div>
      </div>
    </div>
  );
};

export default LoadingDots;