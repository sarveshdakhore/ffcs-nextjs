'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import CoursePanel from '@/components/CoursePanel';
import Timetable from '@/components/Timetable';
import CourseList from '@/components/CourseList';
import Footer from '@/components/Footer';
import ScrollButton from '@/components/ScrollButton';
import Modals from '@/components/Modals';
import { FFCSProvider } from '@/context/FFCSContext';

export default function Home() {
  const [showMobileMessage, setShowMobileMessage] = useState(false);

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
        <Navbar />
        
        <ScrollButton />
        
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

        {/* Course Panel */}
        <div className="container-xl">
          <CoursePanel />
        </div>

        <hr />

        {/* Timetable Section */}
        <Timetable />

        <hr />

        {/* Course List */}
        <CourseList />

        <hr />

        {/* Comments Section */}
        <div className="container-sm">
          New comment section coming soon...
        </div>

        <Footer />
        
        <Modals />
      </div>
    </FFCSProvider>
  );
}
