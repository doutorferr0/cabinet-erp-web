/**
 * Regra da Folha (DESIGN.md §Layout): toda região de trabalho pousa sobre o
 * Papel dentro de uma moldura — fundo Documento (`bg-card`), borda de 1px em
 * Régua, canto `rounded-lg` (4px), padding de `spacing.lg` (16px). É o degrau
 * Papel → Documento que substitui a sombra. Conteúdo solto direto no Papel é
 * bug de composição.
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
      className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card p-4"
    >
      {children}
    </div>
  )
}
