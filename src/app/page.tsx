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
            {/* Mobile Decorative Doodles */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1
            }}>
              {/* Top scattered doodles */}
              <img src="/images/doodles/gdsc.svg" alt="" style={{
                position: 'absolute',
                top: '8%',
                left: '10%',
                width: '40px',
                height: '40px',
                opacity: 0.6,
                transform: 'rotate(15deg)'
              }} />
              <img src="/images/doodles/shape1.svg" alt="" style={{
                position: 'absolute',
                top: '12%',
                right: '15%',
                width: '35px',
                height: '35px',
                opacity: 0.5,
                transform: 'rotate(-20deg)'
              }} />
              <img src="/images/doodles/moto.svg" alt="" style={{
                position: 'absolute',
                top: '20%',
                left: '20%',
                width: '30px',
                height: '30px',
                opacity: 0.4,
                transform: 'rotate(45deg)'
              }} />
              
              {/* Middle scattered doodles */}
              <img src="/images/doodles/shape2.svg" alt="" style={{
                position: 'absolute',
                top: '40%',
                left: '5%',
                width: '38px',
                height: '38px',
                opacity: 0.5,
                transform: 'rotate(-30deg)'
              }} />
              <img src="/images/doodles/ffcs.svg" alt="" style={{
                position: 'absolute',
                top: '45%',
                right: '8%',
                width: '42px',
                height: '42px',
                opacity: 0.6,
                transform: 'rotate(25deg)'
              }} />
              
              {/* Bottom scattered doodles */}
              <img src="/images/doodles/moto2.svg" alt="" style={{
                position: 'absolute',
                bottom: '25%',
                left: '12%',
                width: '36px',
                height: '36px',
                opacity: 0.4,
                transform: 'rotate(60deg)'
              }} />
              <img src="/images/doodles/shape3.svg" alt="" style={{
                position: 'absolute',
                bottom: '20%',
                right: '20%',
                width: '34px',
                height: '34px',
                opacity: 0.5,
                transform: 'rotate(-45deg)'
              }} />
              <img src="/images/doodles/moto3.svg" alt="" style={{
                position: 'absolute',
                bottom: '10%',
                left: '25%',
                width: '32px',
                height: '32px',
                opacity: 0.3,
                transform: 'rotate(30deg)'
              }} />
            </div>

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
                <div style={{ 
                  position: 'absolute',
                  top: '-12px',
                  left: '-12px'
                }}>
                  <img src="/images/doodles/bluepin.svg" alt="" style={{
                    width: '48px',
                    height: '48px',
                    transform: 'rotate(15deg)'
                  }} />
                </div>
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
            {/* Collaboration Room */}
            <div style={{marginTop: '100px'}}>
              <CollaborationRoom />
            </div>

            {/* Course Panel */}
            <div className="container-xl cardnew pt-10" style={{ marginTop: '140px', position: 'relative', paddingTop: '2rem' }}>
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
          </>
        )}
      </div>
    </FFCSProvider>
  );
}
