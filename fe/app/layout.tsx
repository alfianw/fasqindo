import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PT Fasqindo Mandiri Bersama | Visa, Stay Permit & Work Permit Services Indonesia',
  description: 'PT Fasqindo Mandiri provides professional visa, stay permit and work permit assistance for expatriates, foreign workers and companies in Indonesia.',
  generator: 'v0.app',
  openGraph: {
    title: 'PT Fasqindo Mandiri Bersama | Immigration & Permit Services',
    description: 'Professional visa, stay permit and work permit assistance in Indonesia.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/images/fasqindo-logo-final.png',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/images/fasqindo-logo-final.png',
        type: 'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
