import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Anton, Lato, Oswald } from "next/font/google";
import "./globals.css";

const titulo = Anton({ weight: "400", subsets: ["latin"], variable: "--font-titulo", display: "swap" });
const rotulo = Oswald({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-rotulo",
  display: "swap",
});
const texto = Lato({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-texto", display: "swap" });

export const metadata: Metadata = {
  title: "Pedidos | Brasamiga",
  description: "Controle de pedidos do carrinho de espetinho Brasamiga",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${rotulo.variable} ${texto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
