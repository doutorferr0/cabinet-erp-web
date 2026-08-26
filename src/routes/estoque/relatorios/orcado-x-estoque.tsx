import { TelaOrcadoContraEstoque } from '@/features/relatorios/tela-orcado-contra-estoque'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/relatorios/orcado-x-estoque')({
  component: TelaOrcadoContraEstoque,
})
