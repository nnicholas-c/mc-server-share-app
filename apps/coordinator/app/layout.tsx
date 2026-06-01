import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "MC Server Share",
  description: "Share and host Minecraft Java servers with friends."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
