import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";

export const metadata: Metadata = {
  title: "Autonomous Compliance & Regulatory Intelligence System",
  description: "Real-time AI system actively analyzing regulations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FFFEF2] text-[#0A0A0A] font-sans selection:bg-[#FFE500] selection:text-[#0A0A0A]">
        <AuthProvider>
          <CompanyProvider>
            {children}
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
