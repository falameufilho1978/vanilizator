import type { Metadata } from "next";
import { Pacifico, Fraunces } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

// Glossy chunky script for the brand wordmark only.
const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Warm editorial serif — reserved for the CTA, the one "literary action."
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// GeistSans exposes its CSS variable as `--font-geist-sans` and ships its own className.

export const metadata: Metadata = {
  title: "vanillizator",
  description:
    "Paste text. Slide between a clean rewrite and a 4am crypto degen rewrite. Facts stay true, vibes do not.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${pacifico.variable} ${fraunces.variable} ${GeistSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
