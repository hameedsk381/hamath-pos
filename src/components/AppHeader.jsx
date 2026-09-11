'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppHeader() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'వాయిస్ స్టూడియో (Voice Studio)', icon: '🎙️' },
    { href: '/products', label: 'ఉత్పత్తులు (Products)', icon: '📦' },
    { href: '/customers', label: 'కస్టమర్లు (Customers)', icon: '👥' },
    { href: '/documents', label: 'బిల్లులు (Documents)', icon: '📄' },
    { href: '/dashboard', label: 'డ్యాష్‌బోర్డ్ (Dashboard)', icon: '📊' },
  ];

  return (
    <header className="app-header">
      {/* Brand Section */}
      <Link href="/" className="brand-section" style={{ textDecoration: 'none', cursor: 'pointer' }}>
        <div className="brand-icon">🎙️</div>
        <div>
          <div className="brand-title">Maatlaadi Bill</div>
          <div className="brand-subtitle">మాట్లాడితే బిల్ రెడీ</div>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="desktop-nav-menu" aria-label="Desktop Primary Navigation">
        {navLinks.map((link) => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`desktop-nav-link ${isActive ? 'active' : ''}`}
            >
              <span style={{ fontSize: '15px' }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="header-right">
        <div className="header-status-pill">
          <span className="pulse-dot"></span>
          <span>Next.js AI Live</span>
        </div>
        <Link
          href="/settings"
          className={`btn btn-outline btn-sm ${pathname === '/settings' ? 'active' : ''}`}
          style={{
            borderRadius: '20px',
            fontSize: '12px',
            padding: '6px 12px',
            textDecoration: 'none',
            fontWeight: 700,
            background: pathname === '/settings' ? 'var(--primary-light)' : 'transparent',
            borderColor: pathname === '/settings' ? 'var(--primary-border)' : 'var(--border-color)',
            color: pathname === '/settings' ? 'var(--primary-dark)' : 'var(--text-primary)'
          }}
        >
          ⚙️ సెట్టింగ్స్
        </Link>
      </div>
    </header>
  );
}
