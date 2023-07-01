import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "FFmpeg.js: A WebAssembly-powered FFmpeg Interface for Browsers",
  description:
    "Welcome to FFmpeg.js, an innovative library that offers a WebAssembly-powered interface for utilizing FFmpeg in the browser. 🌐💡",
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
