/**
 * TELA NÃO CAPTURADA — placeholder honesto para item de menu do SoftLux que
 * existe (está listado em `transcricaosoftlux.md` §1) mas cujos campos nunca
 * foram fotografados (§10, lacunas de captura).
 *
 * Existe pela mesma razão das abas `ABAS_SEM_CAPTURA` já usadas em
 * `colaborador-form.tsx`/`fornecedor-form.tsx`/`cliente-form.tsx`/
 * `profissional-form.tsx`/`ordem-compra-form.tsx`/`orcamento-form.tsx`: dizer
 * ao operador "isto existe, ainda não tem campo" é diferente de fingir a tela
 * com campo inventado. A regra do repo proíbe o segundo; o primeiro é honesto
 * e mantém a rota alcançável para o dia em que a captura chegar.
 *
 * **Não é `Empty` (`components/ui/empty.tsx`).** Aquele componente é para os
 * SEIS vazios de DADO (módulo sem registro, busca sem resultado…), cada um
 * com ornamento e shape próprios. Este é vazio de CAPTURA — uma frase, sem
 * ornamento, pelo mesmo motivo que a versão em aba não leva um: inventar um
 * shape para "tela que não existe ainda" seria decidir identidade visual sem
 * fonte, a mesma armadilha que a fonte de campo já proíbe para conteúdo.
 */
export function TelaNaoCapturada({ titulo, menu }: { titulo: string; menu: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-bold tracking-[-0.012em]">{titulo}</h1>
      <p className="text-sm text-muted-foreground">
        Tela do menu <strong>{menu}</strong> do SoftLux, listada mas sem transcrição de campo
        (transcricaosoftlux.md §10) — aguardando nova rodada de prints antes de modelar.
      </p>
    </div>
  )
}
