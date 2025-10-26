'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import CoursePanel from '@/components/CoursePanel';
import Timetable from '@/components/Timetable';
import CourseList from '@/components/CourseList';
import Footer from '@/components/Footer';
import Modals from '@/components/Modals';
import CollaborationRoom from '@/components/CollaborationRoom';
import LoadingDots from '@/components/LoadingDots';
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
    // Check for mobile device
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setShowMobileMessage(isMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return (
    <FFCSProvider>
      <div className="ffcs-app">
        {/* Loading Screen */}
        {showLoading && (
          <div id="loading-screen" style={{ opacity: 1 }}>
            <LoadingDots />
          </div>
        )}


        {/* Mobile-only page */}
        {showMobileMessage ? (
          <div style={{
            minHeight: '100vh',
            background: '#090909',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Main content */}
            <div style={{
              textAlign: 'center',
              zIndex: 2,
              maxWidth: '90%'
            }}>
              {/* GDSC Logo */}
              <div style={{ marginBottom: '30px' }}>
                <img src="/images/icons/gdsc.png" alt="GDSC Logo" style={{
                  width: '80px',
                  // height: '80px',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }} />
              </div>

              {/* GDSC Full Form */}
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '10px',
                lineHeight: '1.3'
              }}>
                Google Developer Student Clubs
              </h1>

              {/* University Name */}
              <h2 style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#4285F4',
                marginBottom: '30px'
              }}>
                VIT Vellore
              </h2>

              {/* FFCS Planner Title */}
              <h3 style={{
                fontSize: '28px',
                fontWeight: '800',
                background: 'linear-gradient(45deg, #4285F4, #EA4335, #FBBC05, #34A853)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '40px',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                FFCS Planner
              </h3>

              {/* Message */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                border: '1px solid #e9ecef',
                position: 'relative'
              }}>
                <h4 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '15px'
                }}>
                  Best experienced on desktop!
                </h4>
                <p style={{
                  fontSize: '16px',
                  color: '#adb5bd',
                  lineHeight: '1.5',
                  marginBottom: '20px'
                }}>
                  For the full FFCS planning experience with all features, please switch to a laptop or desktop computer.
                </p>
                
              </div>

              {/* Footer note */}
              {/* <p style={{
                fontSize: '14px',
                color: '#adb5bd',
                marginTop: '30px',
                fontStyle: 'italic'
              }}>
                Built with ❤️ by GDSC VIT Vellore
              </p> */}
            </div>
          </div>
        ) : (
          /* Desktop content */
          <>
            <Navbar />
            {/* Collaboration Room - Moved into CoursePanel's Room Settings */}
            {/* <div style={{marginTop: '100px'}}>
              <CollaborationRoom />
            </div> */}

            {/* Course Panel */}
            <div style={{ 
              marginTop: '140px', 
              marginBottom: '2rem',
              position: 'relative',
              width: 'calc(100% - 48px)',
              maxWidth: '90%',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              
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
          </>
        )}
      </div>
    </FFCSProvider>
  );
}
