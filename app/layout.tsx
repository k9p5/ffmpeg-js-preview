import "./globals.css";
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: "FFmpeg.js: Web-based Video Converter and Trimmer",
  description: "Select MP4, AVI, MOV, WEBM, MKV and other video files up to 2GB and create animated GIF images or convert them into other video formats. Free and high quality web video editor, for local file conversions and clip trimming.",
  themeColor: "#000",
};
// Convert your videos locally. No registration required.

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
