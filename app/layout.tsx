import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vanilizator",
  description:
    "Paste text. Slide between a clean professional version and a 4am crypto degen rewrite.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
