import { ClerkProvider } from "@clerk/nextjs";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "RouteMate - Share Your Ride. Save Money. Reduce Traffic.",
  description: "Find taxis already traveling toward your destination and share the journey with others heading the same way.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${outfit.variable} ${inter.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-white text-slate-900 font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
