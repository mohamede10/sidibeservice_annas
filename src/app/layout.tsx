import type { Metadata, Viewport } from 'next';
import './globals.css';
import DashboardLayout from '@/components/DashboardLayout';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Sidibe Services — ERP Gestion Multi-Boutiques',
  description: 'Gestion commerciale multi-points de vente, stock, caisse, factures et rapports pour Sidibe Services',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sidibe ERP',
    startupImage: [
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Sidibe Services ERP',
    title: 'Sidibe Services — ERP Gestion Multi-Boutiques',
    description: 'Gestion commerciale multi-points de vente, stock, caisse et rapports',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags — iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sidibe ERP" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />

        {/* PWA Meta Tags — Android & général */}
        <meta name="application-name" content="Sidibe ERP" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#090d16" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[PWA] Service Worker enregistré:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('[PWA] Échec enregistrement SW:', error);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-[#090d16] text-slate-100" suppressHydrationWarning>
        <AuthProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
