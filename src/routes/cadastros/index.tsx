import { PageHeader } from '@/components/cabinet/page-header'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/')({
  component: CadastrosHome,
})

function CadastrosHome() {
  return (
    <>
      {/* A casa do módulo é uma PÁGINA, e página tem nome: sem o cabeçalho,
          a única coisa que dizia onde o operador estava era o menu — e quem
          chega por link colado não tem menu aberto. */}
      <PageHeader titulo="Cadastros" />
      <p className="text-muted-foreground">Escolha uma opção no menu de Cadastros.</p>
    </>
  )
}
