import './globals.css';

export const metadata = { title: 'Mapquo | Driveway estimate in under a minute', description: 'Outline your driveway on the map and get a preliminary estimate.' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
