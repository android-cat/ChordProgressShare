import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { FeedbackForm } from '@/components/FeedbackForm'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Chord Progressions Share - コード進行共有サイト',
  description: 'コード進行を投稿・共有・検索できるプラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`} suppressHydrationWarning>
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center px-4">
              <a href="/" className="mr-6 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-8 w-8">
                  <rect width="100" height="100" rx="20" fill="#f97316"/>
                  <path d="M30 70a10 10 0 1 0 20 0 10 10 0 1 0-20 0zm10-50v40M70 60a10 10 0 1 0 20 0 10 10 0 1 0-20 0zm10-40v40" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                  <path d="M40 20L80 20" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                </svg>
                <span className="text-xl font-bold text-primary">
                  Chord Progressions Share
                </span>
              </a>
              <nav className="flex items-center space-x-6 text-sm font-medium">
                <a href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Browse</a>
                <a href="/admin" className="transition-colors hover:text-foreground/80 text-foreground/60">Admin</a>
              </nav>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
              <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                Built by Chord Progressions Share.
              </p>
              <div className="flex items-center gap-4">
                <FeedbackForm />
              </div>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
