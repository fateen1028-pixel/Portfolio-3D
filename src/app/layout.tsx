import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mohamed Fateen — Software Engineer",
  description:
    "Mohamed Fateen builds software systems, products, and interactive experiences. ChatY, SkillForge AI, DeployForge.",
  openGraph: {
    title: "Mohamed Fateen — Software Engineer",
    description: "Building systems, products, and interactive experiences.",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--font-display:'Archivo',system-ui,sans-serif;--font-body:'Space Grotesk',system-ui,sans-serif}`,
          }}
        />
      </head>
      <body className="stage-bg text-bone antialiased">{children}</body>
    </html>
  );
}
