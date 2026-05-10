import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { PlantProvider } from "@/context/PlantContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FarmPilot | Agentic Farming",
  description: "AI-powered vertical farming management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased text-white bg-[#09090b]`}>
        <PlantProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col relative overflow-y-auto">
              {children}
            </main>
          </div>
        </PlantProvider>
      </body>
    </html>
  );
}