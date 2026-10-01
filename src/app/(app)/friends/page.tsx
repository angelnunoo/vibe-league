import { FriendsScreen } from "@/components/social-screens"

export default async function Page({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const params = await searchParams
  return <FriendsScreen initialCode={params.add ?? ""} />
}
