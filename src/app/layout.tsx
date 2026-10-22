import type { Metadata } from "next";
import Script from "next/script";
import { gtmId } from "@/config/analytics";
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
      <body>
        {gtmId ? (
          <>
            {/* Google Tag Manager (noscript) */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
            {/* Google Tag Manager
                ページの表示を遅らせないよう、操作可能になってから読み込む */}
            <Script id="gtm" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}
