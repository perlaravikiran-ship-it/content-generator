import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Content Generator',
  description: 'Generate platform-optimized social media content and images using GPT-4o and DALL-E 3',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
