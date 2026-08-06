/**
 * Regra da Folha (DESIGN.md §Layout, brut): toda região de trabalho é uma
 * folha OPACA pousada sobre a grade do Papel — fundo Documento (`bg-card`),
 * caixa preta 2px, sombra dura 5px, canto reto, padding de `spacing.lg`.
 * Conteúdo solto direto no Papel é bug de composição.
 *
 * Uso atual: o shell envolve o `<Outlet/>` inteiro numa única folha — todas
 * as telas são região única (listagem, formulário, documento). Quando uma
 * tela precisar de duas folhas (ex.: painel lateral próprio), compor dois
 * `<PageFrame>` na tela e remover o wrap do shell para ela.
 */
export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-slot="page-frame"
      className="flex min-h-0 flex-1 flex-col rounded-panel border-2 border-border bg-card p-4 shadow-el3"
    >
      {children}
    </div>
  )
}
