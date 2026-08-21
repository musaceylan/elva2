import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ELVA — Yangın, Patlama ve Aşırı Basınçtan Korunma Sistemleri",
  description:
    "Toz ve gaz patlamalarını milisaniyeler içinde algılayıp bastıran mühendislik çözümleri. 20+ yıl saha tecrübesi, 2000+ tamamlanan proje. İstanbul.",
  openGraph: {
    title: "ELVA — Endüstriyel Kazalardan Korunma Çözümleri",
    description:
      "Patlama önleme, yangın algılama ve söndürme, aşırı basınçtan korunma. Tesisinize özel tasarım, projelendirme ve uygulama.",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body
        className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
      >
        <a href="#main" className="skip-link">
          İçeriğe atla
        </a>
        {children}
      </body>
    </html>
  );
}
