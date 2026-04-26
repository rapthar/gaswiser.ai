import type { Metadata } from 'next';
import { Jost } from 'next/font/google';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gas Wiser — AI Fuel Intelligence',
  description: 'Save money on fuel with AI-powered route optimization',
  icons: {
    icon:  '/Gas-Wiser-Icon.png',
    apple: '/Gas-Wiser-Icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable}>
      <body>
        <AuthProvider>
          <QueryProvider>
            {children}
            <Toaster position="top-right" />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
