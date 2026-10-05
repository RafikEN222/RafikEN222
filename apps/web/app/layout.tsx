import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recherche Job",
  description: "Plateforme personnelle de recherche d'emploi",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-10 py-8">{children}</main>
      </body>
    </html>
  );
}
