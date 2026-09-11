'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'వాయిస్', icon: '🎙️' },
    { href: '/products', label: 'కేటలాగ్', icon: '📦' },
    { href: '/customers', label: 'కస్టమర్లు', icon: '👥' },
    { href: '/documents', label: 'బిల్లులు', icon: '📄' },
    { href: '/dashboard', label: 'రిపోర్ట్స్', icon: '📊' },
    { href: '/settings', label: 'సెట్టింగ్స్', icon: '⚙️' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
