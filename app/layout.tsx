import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import { ThemeProvider } from "../components/providers/theme-provider";

import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";


const gabarito = Gabarito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-gabarito",
});

export const metadata: Metadata = {
  title: "Apom Logistics",
  description: "Apom Logistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${gabarito.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
