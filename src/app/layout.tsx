import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Skillio — Technical Assessment Platform',
  description: 'Send candidates a secure link to complete technical assessments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
