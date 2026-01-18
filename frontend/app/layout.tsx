import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'AIAR Guitar | AR Musical Instrument',
    description: 'Browser-based Augmented Reality Guitar with real-time hand tracking and AI chord correction',
    keywords: ['AR', 'guitar', 'music', 'hand tracking', 'WebGL', 'audio'],
    authors: [{ name: 'AIAR Guitar Team' }],
    viewport: 'width=device-width, initial-scale=1',
    themeColor: '#0A0A0F',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="bg-surface-dark text-white antialiased font-sans">
                {children}
            </body>
        </html>
    );
}
