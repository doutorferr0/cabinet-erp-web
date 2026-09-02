import { PageHeader } from '@/components/cabinet/page-header'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/')({
  component: ComprasHome,
})

function ComprasHome() {
  return (
    <>
      {/* A casa do módulo é uma PÁGINA, e página tem nome: sem o cabeçalho,
          a única coisa que dizia onde o operador estava era o menu — e quem
          chega por link colado não tem menu aberto. */}
      <PageHeader titulo="Compras" />
      <p className="text-muted-foreground">Escolha uma opção no menu de Compras.</p>
    </>
  )
}
