import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Font Detector — Typography Intelligence',
  description: 'Identify fonts from images or URLs, with AI-powered pairing suggestions.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
