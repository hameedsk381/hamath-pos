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
    { href: '/', label: 'Voice Register', te: 'వాయిస్ బిల్లింగ్', icon: MicIcon },
    { href: '/products', label: 'Catalogue & Stock', te: 'ఉత్పత్తులు', icon: PackageIcon },
    { href: '/customers', label: 'Customers & Khata', te: 'ఖాతా లెడ్జర్', icon: UsersIcon },
    { href: '/documents', label: 'Invoices & History', te: 'ఇన్వాయిస్‌లు', icon: FileTextIcon },
    { href: '/dashboard', label: 'Analytics', te: 'నివేదికలు', icon: BarChartIcon },
  ];

  return (
    <header className="app-header">
      {/* Brand Section */}
      <Link href="/" className="brand-section" style={{ textDecoration: 'none' }}>
        <div className="brand-logo-tile">
          <MicIcon size={18} />
        </div>
        <div className="brand-text-block">
          <div className="brand-title">
            HAMATH <span className="brand-highlight">POS</span>
          </div>
          <div className="brand-subtitle">AI Voice Billing • వాయిస్ బిల్లింగ్</div>
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
              title={`${link.label} (${link.te})`}
            >
              <IconComponent size={15} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="header-right">
        <div className="shortcut-strip-badge">
          <span><kbd className="kbd-badge">F2</kbd> Mic</span>
          <span>•</span>
          <span><kbd className="kbd-badge">F4</kbd> Print</span>
        </div>

        <div className="header-status-pill">
          <span className="system-dot-online"></span>
          <span className="status-label">Telugu AI Active</span>
        </div>

        <Link
          href="/settings"
          className={`settings-nav-btn ${pathname === '/settings' ? 'active' : ''}`}
          title="Store Settings & Configuration"
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </Link>
      </div>
    </header>
  );
}
