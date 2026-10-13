import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { AppShell } from '@/components/AppShell'
import { StoreProvider } from '@/state/StoreProvider'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: { default: 'Incerta Casino', template: '%s | Incerta Casino' },
  description:
    'Demo casino games: test environment, simulated outcomes only, no real-money value.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17191d',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>
        <StoreProvider>
          <AppShell>{props.children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  )
}
