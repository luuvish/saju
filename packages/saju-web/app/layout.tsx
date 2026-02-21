import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Saju Calculator',
  description: 'Four Pillars of Destiny calculator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">
              <span className="text-blue-600 dark:text-blue-400">Saju</span> Calculator
            </h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
