import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Bolder Intranet',
  description: 'Corporate intranet POC — knowledge and project tracking.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
