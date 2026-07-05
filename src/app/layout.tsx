import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import "./globals.css";

// Tipografia do Manual da Marca MedFlow.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "MedFlow",
  description: "Gestão financeira inteligente para clínicas e consultórios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${poppins.variable} ${GeistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
