import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Клик-Клак: Соедини пары — найди одинаковые картинки',
  description:
    'Игра «Клик-Клак: Соедини пары»: нажимай на две одинаковые картинки, чтобы соединить их. 90 реалистичных картинок — звери, фрукты и овощи. Классика с чекпоинтами и турнирной таблицей плюс детский режим с игрой «Найди одинаковые». Чем дальше, тем сложнее!',
  applicationName: 'Клик-Клак: Соедини пары',
  manifest: '/manifest.webmanifest',
  keywords: [
    'клик-клак',
    'клик-линк',
    'онэт',
    'onet',
    'найди пары',
    'соедини пары',
    'мемори',
    'найди одинаковые',
    'детская игра',
    'маджонг',
    'головоломка',
    'игра',
  ],
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Клик-Клак',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d9488',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
