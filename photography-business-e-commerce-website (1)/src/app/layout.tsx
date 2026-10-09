import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethan Jeffress Photography | Fine Art Photography & Objects",
  description: "Thoughtful photography for the spaces we call home. Shop fine art prints, framed prints, digital wallpapers, Lightroom presets, and photobooks by Ethan Jeffress.",
  keywords: ["Ethan Jeffress Photography", "fine art photography", "landscape prints", "framed prints", "photobooks", "Lightroom presets"],
  openGraph: { title: "Ethan Jeffress Photography", description: "For the places that stay with us. Fine art photography and objects for everyday living.", type: "website" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
