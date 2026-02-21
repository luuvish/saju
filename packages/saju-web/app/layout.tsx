import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Saju Calculator',
  description: 'Four Pillars of Destiny calculator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="container">
          <header>
            <h1>Saju Calculator</h1>
            <p className="subtitle">Four Pillars of Destiny</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
