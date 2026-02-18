'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const LOGGED_OUT_LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#builders', label: 'Builders' },
  { href: '#projects', label: 'Projects' },
  { href: '#feed', label: 'Feed' },
];

const LOGGED_IN_LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/projects', label: 'Projects' },
  { href: '/feed', label: 'Feed' },
];

function getFirstInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() || '?';
}

export default function Nav() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
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

  const navLinks = isAuthenticated ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS;

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
            <Link href={isAuthenticated ? '/feed' : '/'} className="font-serif text-xl tracking-tight text-ink">
              find your tribe
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-[13px] font-medium text-ink-secondary hover:text-ink rounded-md hover:bg-surface-secondary/60 transition-all duration-150"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth Section */}
            {!isLoading && (
              <div className="hidden md:flex items-center gap-3">
                {isAuthenticated && user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-accent-subtle to-accent-muted cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                        aria-label="User menu"
                      >
                        <span className="font-serif text-[14px] text-accent">
                          {getFirstInitial(user.displayName)}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-surface-elevated rounded-xl shadow-lg p-1.5"
                    >
                      <DropdownMenuLabel className="px-2.5 py-2">
                        <p className="text-[13px] font-medium text-ink">{user.displayName}</p>
                        <p className="text-[12px] text-ink-tertiary">@{user.username}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-surface-secondary" />
                      <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2 text-[13px] text-ink-secondary cursor-pointer hover:bg-surface-secondary hover:text-ink">
                        <Link href={`/profile/${user.username}`}>
                          <User className="w-4 h-4" />
                          Your Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2 text-[13px] text-ink-secondary cursor-pointer hover:bg-surface-secondary hover:text-ink">
                        <Link href="/settings">
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-surface-secondary" />
                      <DropdownMenuItem
                        onClick={logout}
                        className="rounded-lg px-2.5 py-2 text-[13px] text-ink-secondary cursor-pointer hover:bg-surface-secondary hover:text-ink"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-[13px] font-medium text-ink-secondary hover:text-ink transition-colors duration-150"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="bg-ink text-ink-inverse text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-ink/90 transition-colors duration-150"
                    >
                      Get started
                    </Link>
                  </>
                )}
              </div>
            )}

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
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  data-testid="mobile-menu-link"
                  className="font-serif text-4xl text-ink-tertiary hover:text-ink transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Footer */}
            <div className="mt-auto pb-8">
              {isAuthenticated && user ? (
                <div className="flex flex-col gap-3">
                  <Link
                    href={`/profile/${user.username}`}
                    onClick={closeMobileMenu}
                    data-testid="mobile-profile-link"
                    className="text-[15px] font-medium text-ink-secondary hover:text-ink transition-colors py-2"
                  >
                    Your Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={closeMobileMenu}
                    data-testid="mobile-settings-link"
                    className="text-[15px] font-medium text-ink-secondary hover:text-ink transition-colors py-2"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      logout();
                    }}
                    data-testid="mobile-sign-out"
                    className="w-full bg-surface-secondary text-ink text-[15px] font-medium px-5 py-3.5 rounded-lg text-left"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="text-center text-[15px] font-medium text-ink-secondary hover:text-ink transition-colors py-2"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={closeMobileMenu}
                    className="w-full bg-ink text-ink-inverse text-[15px] font-medium px-5 py-3.5 rounded-lg text-center"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
