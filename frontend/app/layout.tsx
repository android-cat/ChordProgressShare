import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Chord Progress Share - コード進行共有サイト',
  description: '度数によるコード進行を投稿・共有・検索できるプラットフォーム',
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
                <span className="text-xl font-bold text-primary">
                  Chord Progress Share
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
        </div>
        <Toaster />
      </body>
    </html>
  )
}
