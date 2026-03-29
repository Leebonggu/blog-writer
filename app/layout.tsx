import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "블로그펜 — AI 블로그 리뷰 생성기",
  description: "사진과 가게 정보만 넣으면, 블로그 리뷰가 완성됩니다",
  metadataBase: new URL("https://pen.2lee.kr"),
  openGraph: {
    title: "블로그펜",
    description: "사진과 가게 정보만 넣으면, 블로그 리뷰가 완성됩니다",
    url: "https://pen.2lee.kr",
    siteName: "블로그펜",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "블로그펜 — AI 블로그 리뷰 생성기",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "블로그펜",
    description: "사진과 가게 정보만 넣으면, 블로그 리뷰가 완성됩니다",
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
