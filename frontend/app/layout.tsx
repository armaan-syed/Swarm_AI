import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import { UiProvider } from "./context/UiContext";

export const metadata: Metadata = {
  title: "Swarm AI | Autonomous Compliance Intelligence",
  description: "Real-time AI system actively analyzing regulations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#FFFEF2] text-[#0A0A0A] font-sans selection:bg-[#FFE500] selection:text-[#0A0A0A]" suppressHydrationWarning>
        <AuthProvider>
          <CompanyProvider>
            <UiProvider>
              {children}
            </UiProvider>
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
