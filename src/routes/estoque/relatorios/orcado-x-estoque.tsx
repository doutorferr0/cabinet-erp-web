import { createFileRoute } from '@tanstack/react-router'
import { TelaOrcadoContraEstoque } from '@/features/relatorios/tela-orcado-contra-estoque'

export const Route = createFileRoute('/estoque/relatorios/orcado-x-estoque')({
  component: TelaOrcadoContraEstoque,
})
