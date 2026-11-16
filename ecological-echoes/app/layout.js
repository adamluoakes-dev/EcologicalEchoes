import './globals.css';
export const metadata = { title: 'Ecological Echoes', description: 'Share music, nature photos and sustainable practices — and the difference they make.' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
