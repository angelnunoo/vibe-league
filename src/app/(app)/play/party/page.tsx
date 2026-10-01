import { PartyScreen } from "@/components/party-screen"

export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  return <PartyScreen codeFromLink={params.code ?? ""} />
}
