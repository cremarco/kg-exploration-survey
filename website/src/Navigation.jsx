import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';

function Navigation({ defaultOpen = false }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(defaultOpen);

  /**
   * Checks if a navigation item is currently active
   * @param {string} path - The path to check
   * @returns {boolean} True if the path matches the current location
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  /**
   * Opens a pre-filled email to the contact address
   */
  const handleContactClick = () => {
    const email = 'marco.cremaschi@unimib.it';
    const subject = 'Info about KG exploration survey';
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    window.open(mailtoLink, '_blank');
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/survey', label: 'Survey' },
    { path: '/citation-map', label: 'Citation Map' },
    { path: '/taxonomy', label: 'Taxonomy' },
    { path: '/charts', label: 'Charts' },
  ];

  return (
    <div className="px-4 md:px-8 py-4 relative z-50">
      <nav className="bg-neutral-900 px-4 md:px-6 py-2 shadow-lg max-w-4xl mx-auto relative">
        <div className="flex items-center justify-between">
          
          {/* Mobile Menu Button - Left aligned on mobile */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-neutral-300 hover:text-white p-2 focus:outline-none"
              aria-label="Toggle menu"
            >
              <Icon name={isMobileMenuOpen ? 'close' : 'menu'} className="text-xl" />
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-6 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 transition-all duration-200 text-sm font-medium whitespace-nowrap ${
                  isActive(link.path) 
                    ? 'text-indigo-100 bg-indigo-600/20 shadow-lg' 
                    : 'text-neutral-100 hover:text-neutral-200 hover:bg-neutral-700/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact Button */}
          <button 
            onClick={handleContactClick}
            className="bg-neutral-700 hover:bg-neutral-600 text-neutral-100 px-3 md:px-4 py-1.5 transition-colors duration-200 text-sm font-medium whitespace-nowrap ml-auto md:ml-0"
            title="Send email to marco.cremaschi@unimib.it"
          >
            Contact Us
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-neutral-900 shadow-xl border border-neutral-800 md:hidden flex flex-col space-y-1 animation-fade-in-down">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 transition-all duration-200 text-sm font-medium ${
                  isActive(link.path) 
                    ? 'text-indigo-100 bg-indigo-600/20' 
                    : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
      
      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-[-1] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default Navigation; 
