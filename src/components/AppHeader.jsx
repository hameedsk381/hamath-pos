'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MicIcon,
  PackageIcon,
  UsersIcon,
  FileTextIcon,
  BarChartIcon,
  SettingsIcon
} from './Icons';

export default function AppHeader() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Voice Terminal', teLabel: 'వాయిస్ బిల్లింగ్', icon: MicIcon },
    { href: '/products', label: 'Catalogue', teLabel: 'ఉత్పత్తులు', icon: PackageIcon },
    { href: '/customers', label: 'Customers & Khata', teLabel: 'ఖాతా లెడ్జర్', icon: UsersIcon },
    { href: '/documents', label: 'Bills & Invoices', teLabel: 'ఇన్వాయిస్‌లు', icon: FileTextIcon },
    { href: '/dashboard', label: 'Analytics', teLabel: 'నివేదికలు', icon: BarChartIcon },
  ];

  return (
    <header className="app-header">
      {/* Professional Brand Section */}
      <Link href="/" className="brand-section" style={{ textDecoration: 'none', cursor: 'pointer' }}>
        <div className="brand-logo-tile">
          <MicIcon size={20} />
        </div>
        <div className="brand-text-block">
          <div className="brand-title">
            HAMATH <span className="brand-highlight">POS</span>
          </div>
          <div className="brand-subtitle">AI Voice Billing • మాట్లాడితే బిల్ రెడీ</div>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="desktop-nav-menu" aria-label="Desktop Primary Navigation">
        {navLinks.map((link) => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          const IconComponent = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`desktop-nav-link ${isActive ? 'active' : ''}`}
            >
              <IconComponent size={16} />
              <div className="nav-label-container">
                <span className="nav-primary-label">{link.label}</span>
                <span className="nav-sub-label">{link.teLabel}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Right Utility Controls */}
      <div className="header-right">
        <div className="header-status-pill">
          <span className="system-dot-online"></span>
          <span className="status-label">Live System • Telugu AI</span>
        </div>

        <Link
          href="/settings"
          className={`settings-nav-btn ${pathname === '/settings' ? 'active' : ''}`}
          title="Store Settings & Configuration"
        >
          <SettingsIcon size={17} />
          <span>సెట్టింగ్స్</span>
        </Link>
      </div>
    </header>
  );
}
