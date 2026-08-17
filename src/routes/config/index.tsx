import { TelaDeConfiguracoes } from '@/features/config/tela-de-configuracoes'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/config/')({
  component: TelaDeConfiguracoes,
})
