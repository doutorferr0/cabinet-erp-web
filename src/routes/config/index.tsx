import { createFileRoute } from '@tanstack/react-router'
import { TelaDeConfiguracoes } from '@/features/config/tela-de-configuracoes'

export const Route = createFileRoute('/config/')({
  component: TelaDeConfiguracoes,
})
