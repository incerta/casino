import { Game } from '@/screens/Game'
import type { GameId } from '@/generated/client-api-types'

export default async function Page(props: PageProps<'/games/[gameId]'>) {
  const { gameId } = await props.params

  return <Game gameId={gameId as GameId} />
}
