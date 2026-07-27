import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const hostHeader = forwardedHost ?? requestHeaders.get("host") ?? "localhost";
  const host = /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(hostHeader)
    ? hostHeader
    : "localhost";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host.startsWith("localhost")
        ? "http"
        : "https";
  const origin = `${protocol}://${host}`;
  const title = "Império IA | Mesa de Consignado";
  const description =
    "Assistente operacional para leitura de extratos e aplicação auditável de roteiros bancários.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1740,
          height: 909,
          alt: "Império IA - Mesa de Consignado",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} ${sourceSerif.variable}`}>
        {children}
      </body>
    </html>
  );
}
