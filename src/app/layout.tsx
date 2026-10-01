import type { Metadata, Viewport } from "next"
import { Outfit, Syne } from "next/font/google"
import { GameProvider } from "@/lib/store"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })
const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne" })

export const metadata: Metadata = {
  title: "VibeLeague",
  description: "¿Cuánto conoces realmente a tus amigos?",
  applicationName: "VibeLeague",
  appleWebApp: {
    capable: true,
    title: "VibeLeague",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#07060e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${outfit.variable} ${syne.variable}`}>
      <body>
        <div className="stage">
          <div className="phone">
            <GameProvider>{children}</GameProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
