import React from 'react';

// Custom Link component to simulate Next.js <Link> in our Vite SPA
export const Link: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
}> = ({ href, children, className }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Dispatch a custom event that App.tsx can listen to
    const event = new CustomEvent('navigate', { detail: { href } });
    window.dispatchEvent(event);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};
