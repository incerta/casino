import type { Metadata, Viewport } from 'next'
import { StoreProvider } from '@/state/StoreProvider'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Incerta Casino', template: '%s | Incerta Casino' },
  description: 'Demo slot games — test environment, simulated outcomes only.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#120c24',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{props.children}</StoreProvider>
      </body>
    </html>
  )
}
