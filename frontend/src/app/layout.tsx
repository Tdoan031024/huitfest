import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import MusicDecor from "@/components/MusicDecor/MusicDecor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "900"],
});

import { getCurrentEvent } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const { getSiteSettings, getCurrentEvent } = await import("@/lib/api");
  
  // Lấy dữ liệu dự phòng (Fallback)
  const event = await getCurrentEvent();
  const defaultTitle = event?.name || "HUIT Fest 2026";
  const defaultDesc = event?.description || "Tham gia lễ hội âm nhạc lớn nhất tháng 3 dành cho học sinh, sinh viên tại HUIT Campus.";
  const defaultImage = event?.heroImage || "/assets/images/logo/logohuit_avt.jpg";

  // 1. Thử lấy từ SiteSettings
  const settings = await getSiteSettings();
  
  const title = settings?.siteName || defaultTitle;
  const description = settings?.siteDescription || defaultDesc;
  const logo = settings?.siteLogo || defaultImage;
  const banner = settings?.siteBanner || defaultImage;

  return {
    title,
    description,
    icons: {
      icon: logo,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: banner,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [banner],
    },
  };
}

import { SiteConfigProvider } from '@/context/SiteConfigContext';
import { ToastProvider } from '@/context/ToastContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased">
        <ToastProvider>
          <SiteConfigProvider>
            <MusicDecor />
            <div style={{ position: 'relative', zIndex: 1 }}>
              {children}
            </div>
          </SiteConfigProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
