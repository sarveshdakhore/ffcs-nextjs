'use client';

export default function Footer() {
  return (
    <footer 
      style={{
        background: 'rgba(15, 15, 15, 0.9)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        marginTop: '3rem',
        padding: '1.5rem 0 1rem 0'
      }}
    >
      <div className="container-xl">
        <div className="row align-items-center text-center">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-center mb-2">
              <img
                src="./images/icons/gdsc.png"
                alt="GDG Logo"
                style={{ width: '24px', marginRight: '8px' }}
              />
              <span
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                GDG VIT
              </span>
            </div>
            <p 
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                margin: '0',
                fontSize: '0.8rem'
              }}
            >
              Made with <i className="fas fa-heart" style={{ color: '#e74c3c', fontSize: '0.7rem' }}></i> for VITians • 
              Modified from{' '}
              <a 
                href="https://github.com/vatz88/FFCSonTheGo"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#4ECDCC',
                  textDecoration: 'none',
                  transition: 'color 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseOut={(e) => e.currentTarget.style.color = '#4ECDCC'}
              >
                original repository
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}