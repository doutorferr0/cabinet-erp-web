import { Entrada } from '@/components/cabinet/entrada'

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
 *
 * FUSÃO v5 (fase 1.7): a sombra da folha é MACIA (`shadow-macia`), não mais o
 * degrau duro `el3` — sombra dura ficou reservada ao que é interativo ou
 * decisão. A folha é superfície estática: repousa sobre a bancada.
 */
export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    // A folha é o primeiro tempo da entrada de tela (§Motion): sobe 16px e
    // aparece uma vez por navegação. Quem garante o "uma vez" é a `key` que o
    // shell passa — sem ela, qualquer re-render remontaria a animação.
    <Entrada
      // 2.0: a folha de página SAIU. No mockup o conteúdo pousa direto na bancada
      // tonal do módulo e quem tem caixa é o painel da listagem, o card da
      // ficha, o KPI — nunca a página inteira (§Hierarquia: máx. 2 níveis de
      // card; a folha era um terceiro em volta de tudo).
      className="flex min-h-0 flex-1 flex-col gap-6"
      data-slot="page-frame"
    >
      {/* A SAÍDA saiu daqui na 2.0 (D5): ela é a tecla de 32px colada ao
          título, dentro do `PageHeader`, que agora é o cabeçalho de TODA rota.
          Montá-la no frame E no cabeçalho daria duas saídas na mesma tela —
          que é o defeito espelhado do opt-in que a #235 corrigiu. */}
      {children}
    </Entrada>
  )
}
