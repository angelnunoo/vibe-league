import { Guard, Shell } from "@/components/shell"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Guard mode="app">
      <Shell>{children}</Shell>
    </Guard>
  )
}
