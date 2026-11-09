import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, STIX_Two_Text } from "next/font/google";

import { Encabezado } from "@/components/encabezado";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers";

import "./globals.css";

// Tipografía de interfaz: diseñada para legibilidad (docs/06-ux-ui.md §1.2).
const fuenteInterfaz = Atkinson_Hyperlegible_Next({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Tipografía matemática: variables en itálica, números en regular.
const fuenteMatematica = STIX_Two_Text({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Programación lineal, paso a paso",
  description:
    "Plantea un problema de programación lineal en lenguaje cotidiano y resolvelo por el método gráfico o por Simplex, viendo cada tabla como en clase.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fuenteInterfaz.variable} ${fuenteMatematica.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Encabezado />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
