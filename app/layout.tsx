import type { Metadata } from "next";
import { Pacifico, Fraunces } from "next/font/google";
import "./globals.css";

// Glossy chunky script for the brand wordmark.
const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Warm editorial serif for body and labels. Variable axis enables fine opsz tuning.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "vanilizator",
  description:
    "Paste text. Slide between a clean rewrite and a 4am crypto degen rewrite. Facts stay true, vibes do not.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pacifico.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
