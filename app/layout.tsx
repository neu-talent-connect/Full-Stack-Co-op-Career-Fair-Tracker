import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { AppDataProvider } from "@/components/AppDataProvider";
import { MigrateDataModal } from "@/components/MigrateDataModal";
import { Navigation } from "@/components/Navigation";
import { FloatingAddButton } from "@/components/FloatingAddButton";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Career Tracker | Job Applications",
  description: "Track your job applications, career fair connections, and networking in one beautiful, professional platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
            <ToastProvider>
              <AppDataProvider>
                <MigrateDataModal />
                <div className="min-h-screen flex flex-col">
                  <Navigation />
                  <main className="flex-1">
                    {children}
                  </main>
                  <FloatingAddButton />
                  <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        <p>Career Fair Tracker &copy; {new Date().getFullYear()}</p>
                        <p className="mt-1">Built with Next.js, TypeScript, and Tailwind CSS</p>
                      </div>
                    </div>
                  </footer>
                </div>
              </AppDataProvider>
            </ToastProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
