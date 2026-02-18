'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Nav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrollShadow, setHasScrollShadow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrollShadow(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openMobileMenu = () => {
    setIsMobileMenuOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 bg-surface-primary transition-shadow duration-200 ${
          hasScrollShadow ? 'shadow-sm' : ''
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-5 md:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="#" className="font-serif text-xl tracking-tight text-ink">
              find your tribe
            </a>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <a
                href="#how-it-works"
                className="px-3 py-2 text-[13px] font-medium text-ink-secondary hover:text-ink rounded-md hover:bg-surface-secondary/60 transition-all duration-150"
              >
                How It Works
              </a>
              <a
                href="#builders"
                className="px-3 py-2 text-[13px] font-medium text-ink-secondary hover:text-ink rounded-md hover:bg-surface-secondary/60 transition-all duration-150"
              >
                Builders
              </a>
              <a
                href="#projects"
                className="px-3 py-2 text-[13px] font-medium text-ink-secondary hover:text-ink rounded-md hover:bg-surface-secondary/60 transition-all duration-150"
              >
                Projects
              </a>
              <a
                href="#feed"
                className="px-3 py-2 text-[13px] font-medium text-ink-secondary hover:text-ink rounded-md hover:bg-surface-secondary/60 transition-all duration-150"
              >
                Feed
              </a>
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#"
                className="text-[13px] font-medium text-ink-secondary hover:text-ink transition-colors duration-150"
              >
                Sign in
              </a>
              <button className="bg-ink text-ink-inverse text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-ink/90 transition-colors duration-150">
                Join the waitlist
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={openMobileMenu}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-ink-secondary" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-surface-elevated">
          <div className="flex flex-col h-full px-6 py-5">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between mb-12">
              <span className="font-serif text-xl text-ink">find your tribe</span>
              <button
                onClick={closeMobileMenu}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-ink-secondary" />
              </button>
            </div>

            {/* Mobile Menu Links */}
            <div className="flex flex-col gap-2">
              <a
                href="#how-it-works"
                onClick={closeMobileMenu}
                data-testid="mobile-menu-link"
                className="font-serif text-4xl text-ink-tertiary hover:text-ink transition-colors py-2"
              >
                How It Works
              </a>
              <a
                href="#builders"
                onClick={closeMobileMenu}
                data-testid="mobile-menu-link"
                className="font-serif text-4xl text-ink-tertiary hover:text-ink transition-colors py-2"
              >
                Builders
              </a>
              <a
                href="#projects"
                onClick={closeMobileMenu}
                data-testid="mobile-menu-link"
                className="font-serif text-4xl text-ink-tertiary hover:text-ink transition-colors py-2"
              >
                Projects
              </a>
              <a
                href="#feed"
                onClick={closeMobileMenu}
                data-testid="mobile-menu-link"
                className="font-serif text-4xl text-ink-tertiary hover:text-ink transition-colors py-2"
              >
                Feed
              </a>
            </div>

            {/* Mobile Menu Footer */}
            <div className="mt-auto pb-8">
              <button className="w-full bg-ink text-ink-inverse text-[15px] font-medium px-5 py-3.5 rounded-lg">
                Join the waitlist
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
