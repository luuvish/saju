import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '사주팔자',
  description: '사주팔자(四柱八字) 계산기',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="container">
          <header>
            <h1>사주팔자</h1>
            <p className="subtitle">四柱八字</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
