'use client';

import { useState, useEffect } from 'react';
import { useFFCS } from '@/context/FFCSContext';
// import { useAuth } from '@/context/AuthContext';
// import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { state, dispatch } = useFFCS();
  // const { state: authState, logout } = useAuth();
  // const router = useRouter();
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);

  const handleCampusChange = (campus: 'Vellore' | 'Chennai') => {
    dispatch({ type: 'SWITCH_CAMPUS', payload: campus });
  };

  // const handleLogout = () => {
  //   logout();
  // };

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?message=FFCS made hassle free!&u=https://ffcs.sarveshdakhore.in/`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=https://ffcs.sarveshdakhore.in/`,
    twitter: `https://twitter.com/intent/tweet?text=FFCS made hassle free! https://ffcs.sarveshdakhore.in/`,
    whatsapp: `whatsapp://send?text=FFCS made hassle free! https://ffcs.sarveshdakhore.in/`,
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar fixed-top navbar-expand-md" style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div className="container-xl px-4 py-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left side - GDG Logo and Text */}
          <div className="navbar-brand d-flex align-items-center" style={{ flex: 1, margin: 0 }}>
            <div className="d-flex align-items-center">
              <img src="./images/icons/gdsc.png" alt="GDG Logo" className="gdsc-logo" style={{ paddingRight: '10px' }} />
              <div className="d-flex flex-column">
                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>Google Developer Group</span>
                <span style={{ color: '#bdc3c7', fontSize: '12px', fontWeight: 400, lineHeight: 1.2 }}>Vellore Institute of Technology</span>
              </div>
            </div>
          </div>

          {/* Center - FFCS PLANNER Title */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>FFCS PLANNER</h1>
          </div>

          {/* Right side - Navigation buttons */}
          <div className="navbar-nav flex-row" style={{ flex: 1, justifyContent: 'flex-end' }}>
            {/* Commented out auth functionality for now */}
            {/* {authState.isAuthenticated ? ( */}
              {/* Show user dropdown when authenticated */}
              {/* <>
                <div id="user-opt">
                  <div className="dropdown d-inline">
                    <a
                      id="logout-button"
                      className="btn btn-outline-secondary dropdown-toggle nav-btn-outline"
                      href="#"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '15px',
                        color: 'white',
                        fontWeight: 500,
                        padding: '0.75rem 1.5rem',
                        backdropFilter: 'blur(10px)',
                        textDecoration: 'none'
                      }}
                    >
                      <i className="fas fa-user"></i>
                      &nbsp;&nbsp;{authState.user?.name || 'User'}
                    </a>

                    <ul
                      className="dropdown-menu dropdown-menu-dark"
                      aria-labelledby="logout-button"
                    >
                      <li>
                        <a
                          rel="noopener"
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleLogout();
                          }}
                        >
                          <i className="fas fa-sign-out" aria-hidden="true"></i>
                          &nbsp;&nbsp;<span>Logout</span>
                        </a>
                      </li>

                      <li>
                        <a
                          rel="noopener"
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            alert('Settings feature coming soon!');
                          }}
                        >
                          <i className="fas fa-edit"></i>
                          &nbsp;&nbsp;<span>Settings</span>
                        </a>
                      </li>

                      <li>
                        <a
                          className="dropdown-item"
                          href="https://twitter.com/intent/tweet?text=FFCS made hassle free! https://ffcs.sarveshdakhore.in/"
                          target="_blank"
                        >
                          <i className="fas fa-share"></i>
                          &nbsp;&nbsp;<span>Share App</span>
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              // Show login button when not authenticated
              <>
                <button 
                  className="btn btn-success" 
                  style={{ 
                    borderRadius: '15px', 
                    fontWeight: 500, 
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                    border: 'none'
                  }}
                  onClick={() => router.push('/login')}
                >
                  <i className="fas fa-sign-in-alt"></i>&nbsp;&nbsp;Login
                </button>
              </>
            )} */}
          </div>
        </div>
      </nav>
      {/* End of navbar */}
      
      <div style={{ textAlign: 'center', display: 'none' }} id="mobile_message">
        <p
          style={{
            padding: '6px 6%',
            margin: '0%',
            color: 'red',
            fontWeight: 500,
          }}
        >
          For optimal use of all features, please tilt your device to
          landscape mode or switch to a larger screen.
        </p>
      </div>
    </>
  );
}
