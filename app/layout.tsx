import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "FFmpeg.js: A WebAssembly-powered Video to Video Converter",
  description: "Convert your videos locally in the browser for free. No registration required. Supports MP4 to GIF, WEBM to GIF, AVI to MP4, MOV to GIF and many more conversions",
  themeColor: "#FFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
