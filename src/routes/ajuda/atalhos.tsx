import { createFileRoute } from '@tanstack/react-router'
import { MapaDeAtalhosTela } from '@/features/ajuda/mapa-de-atalhos'

export const Route = createFileRoute('/ajuda/atalhos')({
  component: MapaDeAtalhosTela,
})
