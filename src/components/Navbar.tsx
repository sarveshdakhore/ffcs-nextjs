'use client';

import { useState, useEffect } from 'react';
import { useFFCS } from '@/context/FFCSContext';

export default function Navbar() {
  const { state, dispatch } = useFFCS();
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);

  const handleCampusChange = (campus: 'Vellore' | 'Chennai') => {
    dispatch({ type: 'SWITCH_CAMPUS', payload: campus });
  };

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?message=FFCS made hassle free!&u=https://ffcs.sarveshdakhore.in/`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=https://ffcs.sarveshdakhore.in/`,
    twitter: `https://twitter.com/intent/tweet?text=FFCS made hassle free! https://ffcs.sarveshdakhore.in/`,
    whatsapp: `whatsapp://send?text=FFCS made hassle free! https://ffcs.sarveshdakhore.in/`,
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar fixed-top navbar-expand-md navbar-light bg-light">
        <div className="container-xl px-3 py-1">
          <a className="navbar-brand" href="/">
            FFCS Planner
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbar"
            aria-controls="navbarNavDarkDropdown"
            aria-expanded="false"
            aria-label="Toggle navigation"
            onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            id="navbar"
            className={`collapse navbar-collapse justify-content-between ${!isNavbarCollapsed ? 'show' : ''}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a
                  id="campus"
                  className="nav-link dropdown-toggle"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {state.currentCampus} Campus
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-light mb-3"
                  aria-labelledby="campus"
                >
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCampusChange('Vellore');
                      }}
                    >
                      Vellore Campus
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCampusChange('Chennai');
                      }}
                    >
                      Chennai Campus
                    </a>
                  </li>
                </ul>
              </li>
            </ul>

            <div className="navbar-nav flex-row flex-wrap md-auto">
              {/* User Options - will be implemented with Firebase Auth */}
              <div id="user-opt" style={{ display: 'none' }}>
                {  }
                <div className="dropdown d-inline" style={{ display: 'none' }}>
                  <a
                    id="logout-button"
                    className="btn btn-outline-secondary dropdown-toggle nav-btn-outline"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="fas fa-user"></i>
                    {  }User
                  </a>

                  <ul
                    className="dropdown-menu dropdown-menu-light"
                    aria-labelledby="logout-button"
                  >
                    <li>
                      <a
                        rel="noopener"
                        className="dropdown-item"
                        id="logout-link"
                        href=""
                        target="_blank"
                      >
                        <i className="fas fa-sign-out" aria-hidden="true"></i>
                        {  }<span>Logout</span>
                      </a>
                    </li>
                    <li>
                      <a
                        rel="noopener"
                        className="dropdown-item"
                        href={shareUrls.linkedin}
                        target="_blank"
                        id="username-edit"
                      >
                        <i className="fas fa-edit"></i>
                        {  }<span>set username</span>
                      </a>
                    </li>
                    <li>
                      <a
                        rel="noopener"
                        className="dropdown-item"
                        href={shareUrls.twitter}
                        target="_blank"
                      >
                        <i className="fas fa-user-friends"></i>
                        {  }<span>Friends</span>
                      </a>
                    </li>
                    <li>
                      <a
                        className="dropdown-item"
                        href={shareUrls.whatsapp}
                        target="_blank"
                      >
                        <i className="fas fa-location-arrow"></i>
                        {  }<span>Track FFCS</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              
              {  }
              <div className="dropdown d-inline">
                <a
                  id="share-button"
                  className="btn btn-outline-secondary dropdown-toggle nav-btn-outline"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="fas fa-share"></i>
                  {  }Share
                </a>

                <ul
                  className="dropdown-menu dropdown-menu-light"
                  aria-labelledby="share-button"
                >
                  <li>
                    <a
                      rel="noopener"
                      className="dropdown-item"
                      href={shareUrls.facebook}
                      target="_blank"
                    >
                      <i className="fab fa-facebook"></i>
                      <span>{  }Facebook</span>
                    </a>
                  </li>
                  <li>
                    <a
                      rel="noopener"
                      className="dropdown-item"
                      href={shareUrls.linkedin}
                      target="_blank"
                    >
                      <i className="fab fa-linkedin"></i>
                      <span>{  }LinkedIn</span>
                    </a>
                  </li>
                  <li>
                    <a
                      rel="noopener"
                      className="dropdown-item"
                      href={shareUrls.twitter}
                      target="_blank"
                    >
                      <i className="fab fa-twitter"></i>
                      <span>{  }Twitter</span>
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href={shareUrls.whatsapp}
                      target="_blank"
                    >
                      <i className="fab fa-whatsapp"></i>
                      <span>{  }WhatsApp</span>
                    </a>
                  </li>
                </ul>
              </div>

              <a
                rel="noopener"
                href="https://github.com/sarveshdakhore/FFCSonTheGo"
                target="_blank"
                hidden
              >
                <button
                  className="btn btn-outline-secondary nav-btn-outline ms-2"
                  type="button"
                >
                  <i className="fab fa-github"></i>{  }GitHub
                </button>
              </a>

              <a
                rel="noopener"
                href="https://sarveshdakhore.in/rd/how_to_use_ffcs_planner"
                target="_blank"
              >
                <button
                  className="btn btn-outline-secondary nav-btn-outline ms-2"
                  type="button"
                >
                  <i className="fa fa-bicycle" aria-hidden="true"></i>
                  {  }How To Use ?
                </button>
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}