'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import CoursePanel from '@/components/CoursePanel';
import Timetable from '@/components/Timetable';
import CourseList from '@/components/CourseList';
import Footer from '@/components/Footer';
import Modals from '@/components/Modals';
import CollaborationRoom from '@/components/CollaborationRoom';
import { FFCSProvider } from '@/context/FFCSContext';

export default function Home() {
  const [showMobileMessage, setShowMobileMessage] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Hide loading screen after page loads
    const timer = setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          setShowLoading(false);
        }, 500);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check for mobile orientation
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowMobileMessage(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <FFCSProvider>
      <div className="ffcs-app">
        {/* Loading Screen */}
        {showLoading && (
          <div id="loading-screen" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
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
        )}

        {/* Decorative Doodles */}
        <div className="doodles-container" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
          overflow: 'hidden'
        }}>
          {/* Top left area */}
          <img src="/images/doodles/gdsc.svg" alt="" style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '60px',
            height: '60px',
            opacity: 0.4,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          <img src="/images/doodles/shape1.svg" alt="" style={{
            position: 'absolute',
            top: '20%',
            left: '15%',
            width: '40px',
            height: '40px',
            opacity: 0.3,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          <img src="/images/doodles/shape2.svg" alt="" style={{
            position: 'absolute',
            top: '15%',
            left: '8%',
            width: '35px',
            height: '35px',
            opacity: 0.35,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          
          {/* Top right area */}
          <img src="/images/doodles/ffcs.svg" alt="" style={{
            position: 'absolute',
            top: '12%',
            right: '8%',
            width: '55px',
            height: '55px',
            opacity: 0.4,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          <img src="/images/doodles/shape2.svg" alt="" style={{
            position: 'absolute',
            top: '18%',
            right: '5%',
            width: '45px',
            height: '45px',
            opacity: 0.3,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          
          {/* Middle left area */}
          <img src="/images/doodles/moto.svg" alt="" style={{
            position: 'absolute',
            top: '45%',
            left: '3%',
            width: '50px',
            height: '50px',
            opacity: 0.35,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          <img src="/images/doodles/gdsc.svg" alt="" style={{
            position: 'absolute',
            top: '55%',
            left: '12%',
            width: '42px',
            height: '42px',
            opacity: 0.4,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          
          {/* Middle right area */}
          <img src="/images/doodles/moto2.svg" alt="" style={{
            position: 'absolute',
            top: '48%',
            right: '5%',
            width: '48px',
            height: '48px',
            opacity: 0.35,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          <img src="/images/doodles/shape3.svg" alt="" style={{
            position: 'absolute',
            top: '42%',
            right: '18%',
            width: '40px',
            height: '40px',
            opacity: 0.3,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          
          {/* Bottom left area */}
          <img src="/images/doodles/moto3.svg" alt="" style={{
            position: 'absolute',
            bottom: '20%',
            left: '8%',
            width: '52px',
            height: '52px',
            opacity: 0.4,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          
          {/* Bottom right area */}
          <img src="/images/doodles/moto.svg" alt="" style={{
            position: 'absolute',
            bottom: '15%',
            right: '10%',
            width: '45px',
            height: '45px',
            opacity: 0.3,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
        </div>

        <Navbar />
        
        
        {showMobileMessage && (
          <div style={{ textAlign: 'center', display: 'block' }} id="mobile_message">
            <p
              style={{
                padding: '6px 6%',
                margin: '0%',
                color: 'red',
                fontWeight: '500',
              }}
            >
              For optimal use of all features, please tilt your device to
              landscape mode or switch to a larger screen.
            </p>
          </div>
        )}

        {/* Collaboration Room */}
        <CollaborationRoom />

        {/* Course Panel */}
        <div className="container-xl cardnew" style={{ marginTop: '100px', position: 'relative' }}>
          {/* Decorative pins for Course Panel */}
          <img src="/images/doodles/bluepin.svg" alt="" style={{
            position: 'absolute',
            top: '-15px',
            left: '25px',
            width: '42px',
            height: '42px',
            opacity: 1.0,
            zIndex: 100,
            transform: 'rotate(12deg)',
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))'
          }} />
          
          <CoursePanel />
        </div>

        <br />
        <br />

        {/* Timetable Section */}
        <Timetable />

        <br />

        
          <CourseList />
        <Footer />
        
        <Modals />
      </div>
    </FFCSProvider>
  );
}
