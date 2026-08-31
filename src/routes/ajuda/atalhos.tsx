import { MapaDeAtalhosTela } from '@/features/ajuda/mapa-de-atalhos'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ajuda/atalhos')({
  component: MapaDeAtalhosTela,
})
