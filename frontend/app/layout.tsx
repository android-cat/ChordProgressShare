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
      <body className={inter.className} suppressHydrationWarning>
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <a href="/" className="text-2xl font-bold">
              Chord Progress Share
            </a>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
