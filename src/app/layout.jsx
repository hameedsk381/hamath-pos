import './globals.css';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'Maatlaadi Bill - మాట్లాడితే బిల్ రెడీ | Telugu Voice Billing',
  description: 'Telugu-first voice-powered quotation & invoice generator for retail and wholesale businesses in Andhra Pradesh',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default function RootLayout({ children }) {
  return (
    <html lang="te">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Telugu:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="app">
          <AppHeader />
          <main id="app-view-container">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
