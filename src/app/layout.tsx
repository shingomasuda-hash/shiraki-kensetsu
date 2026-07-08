import type { Metadata } from "next";
import { siteLinks } from "@/config/links";
import "./globals.css";

const title = "現場監督採用サイト｜白木建設株式会社";
const description =
  "白木建設株式会社の現場監督採用サイトです。未経験から3〜4年かけてじっくり育成します。仕事内容、働く魅力、キャリア、募集要項、応募の流れをご紹介します。";

export const metadata: Metadata = {
  title,
  description,
  ...(siteLinks.site
    ? {
        metadataBase: new URL(siteLinks.site),
        alternates: { canonical: siteLinks.site },
        openGraph: {
          title,
          description,
          url: siteLinks.site,
          siteName: "白木建設株式会社 採用サイト",
          images: [{ url: "/ogp.jpg", width: 1200, height: 630 }],
          locale: "ja_JP",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ["/ogp.jpg"],
        },
      }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
