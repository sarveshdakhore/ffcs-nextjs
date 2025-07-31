'use client';

export default function Footer() {
  return (
    <footer className="container-fluid text-center py-2">
      <span>
        Made with <i className="fas fa-heart"></i> for VITians
      </span>
      <br />
      <span>
        Copyright <i className="fa fa-copyright" aria-hidden="true"> 2024</i>
      </span>
      <p>
        This is modified from{' '}
        <a 
          href="https://github.com/vatz88/FFCSonTheGo"
          target="_blank"
          rel="noopener noreferrer"
        >
          original repository
        </a>
        (as of 1 Nov, 2023),{' '}
        <a 
          href="http://www.gnu.org/licenses/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Licence: GPL-3.0
        </a>
      </p>
    </footer>
  );
}