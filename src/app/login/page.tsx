'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isGDSC, setIsGDSC] = useState(false);
  const { state, login, clearError } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      router.push('/');
    }
  }, [state.isAuthenticated, router]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return;
    }
    
    await login(username.trim(), password, isGDSC);
  };

  return (
    <div className="min-vh-100" style={{
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
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
        <img src="/images/doodles/gdsc.svg" alt="" style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '60px',
          height: '60px',
          opacity: 0.3,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }} />
        <img src="/images/doodles/ffcs.svg" alt="" style={{
          position: 'absolute',
          top: '12%',
          right: '8%',
          width: '55px',
          height: '55px',
          opacity: 0.3,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }} />
        <img src="/images/doodles/moto.svg" alt="" style={{
          position: 'absolute',
          bottom: '20%',
          left: '8%',
          width: '52px',
          height: '52px',
          opacity: 0.3,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }} />
        <img src="/images/doodles/shape1.svg" alt="" style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: '45px',
          height: '45px',
          opacity: 0.3,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }} />
      </div>

      <div className="" style={{
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        // border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        padding: '2rem',
        zIndex: 10
      }}>
        <div className="">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="d-flex justify-content-center align-items-center mb-3">
              <img src="/images/icons/gdsc.png" alt="GDSC Logo" style={{ height: '30px', marginRight: '15px' }} />
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>FFCS Planner</h2>
                <p style={{ color: '#bdc3c7', margin: 0, fontSize: '0.9rem' }}>Login to your account</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {state.error && (
            <div className="alert alert-danger" style={{
              background: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '10px',
              color: '#f8d7da'
            }}>
              {state.error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                Username
              </label>
              <input
                type="text"
                id="username"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '0.75rem',
                }}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '0.75rem',
                }}
              />
            </div>

            

            {/* Submit Button */}
            <button
              type="submit"
              disabled={state.isLoading}
              className="btn btn-success w-100"
            >
              {state.isLoading ? (
                <div className="d-flex align-items-center justify-content-center">
                  <div
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    style={{ width: '1rem', height: '1rem' }}
                  >
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Logging in...
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="text-center mt-4">
            <p style={{ color: '#bdc3c7', margin: 0 }}>
              Don't have an account?{' '}
              <Link 
                href="/register" 
                style={{ 
                  color: '#4285F4', 
                  textDecoration: 'none', 
                  fontWeight: '500' 
                }}
              >
                Register here
              </Link>
            </p>
          </div>

          {/* Back to App Link */}
          <div className="text-center mt-3">
            <Link 
              href="/" 
              style={{ 
                color: '#bdc3c7', 
                textDecoration: 'none', 
                fontSize: '0.9rem' 
              }}
            >
              ← Back to FFCS Planner
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
