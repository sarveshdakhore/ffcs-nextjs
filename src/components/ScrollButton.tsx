'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ScrollButton() {
  const [isAtCourseList, setIsAtCourseList] = useState(false);

  useEffect(() => {
    const scrollButton = document.getElementById('scrollButton');
    const targetElement = document.getElementById('course_list11');
    const navbar = document.querySelector('.navbar') as HTMLElement;
    const navbarHeight = navbar?.offsetHeight || 0;

    const handleScroll = () => {
      if (!targetElement) return;

      const scrollPosition = window.pageYOffset;
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;

      if (scrollPosition >= targetPosition - navbarHeight) {
        setIsAtCourseList(true);
        targetElement.classList.add('sticky');
      } else {
        setIsAtCourseList(false);
        targetElement.classList.remove('sticky');
      }
    };

    const handleClick = (event: Event) => {
      event.preventDefault();

      if (isAtCourseList) {
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Scroll to course list
        if (targetElement) {
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    scrollButton?.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      scrollButton?.removeEventListener('click', handleClick);
    };
  }, [isAtCourseList]);

  return (
    <button id="scrollButton">
      <Image
        style={{
          height: '50px',
          width: '50px',
          transform: isAtCourseList ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}
        id="scrollImg"
        src="/images/top.svg"
        alt="Scroll to top"
        width={50}
        height={50}
      />
    </button>
  );
}