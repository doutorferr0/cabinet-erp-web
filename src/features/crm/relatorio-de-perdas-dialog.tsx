import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useRelatorioDePerdas } from '@/data/crm-api'
import { mensagemDoErro } from '@/lib/erros'
import { useId, useState } from 'react'

/**
 * POR QUE PERDEMOS, somado no período.
 *
 * É a pergunta que justifica o catálogo de motivos existir em vez de texto
 * livre: com texto livre, "preço", "preco alto" e "valor" viram três linhas
 * para a mesma coisa e a soma do ano não responde nada.
 *
 * ## Quem conta é o SERVIDOR
 *
 * Contar aqui, sobre as linhas que a listagem já trouxe, sairia de graça e não
 * mexeria no contrato. Não serve: a listagem tem teto de 100 por página, então
 * a contagem sairia certa numa empresa pequena e **errada, sem sintoma**, na
 * primeira que passasse do teto. Relatório que erra calado é pior que
 * relatório nenhum, porque alguém decide com ele.
 *
 * ## O período começa no ANO corrente
 *
 * "Por que perdemos" é pergunta de fechamento de ano, e é o recorte que o
 * operador quase sempre quer. Os dois campos ficam à vista para mudar — o
 * padrão é atalho, não trava.
 *
 * ## Barra proporcional, e não gráfico
 *
 * A pergunta é "qual é o maior" e a resposta é uma ordem com pesos. A barra é
 * a própria linha da lista, com largura em porcentagem do maior motivo: um
 * gráfico traria eixo, legenda e biblioteca para dizer o que a ordem já diz. O
 * NÚMERO fica escrito ao lado — a barra é reforço, nunca a única forma de ler.
 */
export function RelatorioDePerdasDialog({
  aberto,
  pipelineId,
  onFechar,
}: {
  aberto: boolean
  /** Só as perdas deste funil — é a partir dele que a pergunta foi feita. */
  pipelineId: string
  onFechar: () => void
}) {
  const campoDe = useId()
  const campoAte = useId()
  const [de, setDe] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [ate, setAte] = useState(() => new Date().toISOString().slice(0, 10))

  const periodoInvalido = de !== '' && ate !== '' && de > ate
  // Período invertido NÃO vira requisição: o servidor recusaria com 400, e o
  // erro chegaria com cara de falha dele quando o que está trocado são os dois
  // campos da tela. Barrar no `enabled`, e não só na mensagem, é o que faz a
  // guarda existir de verdade.
  const relatorio = useRelatorioDePerdas({
    pipelineId,
    de,
    ate,
    habilitado: aberto && !periodoInvalido,
  })
  const linhas = relatorio.data?.rows ?? []
  // O maior motivo dá a escala. Sem ele a barra não teria com o que se comparar
  // — e uma barra cheia em toda linha não diria nada.
  const maior = linhas.reduce((maximo, linha) => Math.max(maximo, linha.count), 0)

  return (
    <Dialog
      isOpen={aberto}
      onOpenChange={(estado) => (estado ? undefined : onFechar())}
      className="max-w-lg"
    >
      <DialogHeader>
        <DialogTitle>Perdas por motivo</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={campoDe}>De</Label>
            {/* `<input type="date">` nativo, a mesma escolha do filtro por data:
                o calendário do sistema operacional faz o papel do widget, de
                graça e com o teclado que a pessoa já conhece. */}
            <Input
              id={campoDe}
              type="date"
              className="w-40"
              value={de}
              onChange={(e) => setDe(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={campoAte}>Até</Label>
            <Input
              id={campoAte}
              type="date"
              className="w-40"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
            />
          </div>
        </div>

        {periodoInvalido ? (
          // Barrado aqui, e não no 400: o servidor recusaria, mas o erro
          // chegaria com cara de falha do servidor quando é o período que está
          // invertido — e a correção está nos dois campos logo acima.
          <p role="alert" className="text-sm text-destructive">
            O início do período é depois do fim.
          </p>
        ) : relatorio.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : relatorio.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {mensagemDoErro(relatorio.error, 'Não foi possível apurar as perdas do período.')}
          </p>
        ) : linhas.length === 0 ? (
          // Zero perdas é RESULTADO, e bom. Um vazio genérico ("nada aqui")
          // faria parecer que a consulta falhou.
          <p className="text-sm text-muted-foreground">Nenhum negócio perdido neste período.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {linhas.map((linha) => (
                <li key={linha.lostReasonId ?? 'sem-motivo'} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{linha.lostReasonName}</span>
                    <span className="font-mono text-sm tabular-nums">{linha.count}</span>
                  </div>
                  {/* `aria-hidden`: a barra repete o número que está do lado, e
                      anunciá-la de novo faria o leitor de tela ler duas vezes a
                      mesma informação. */}
                  <div aria-hidden="true" className="h-2 bg-surface-sunken">
                    <div
                      className="h-full bg-modulo"
                      style={{ width: `${maior === 0 ? 0 : (linha.count / maior) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* O total vem do SERVIDOR e é comparado com a soma das linhas: a
                divergência entre os dois é o sintoma de perda escapando do
                agrupamento, e é melhor vê-la do que confiar nela. */}
            <p className="border-t pt-2 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-muted-foreground">
              {relatorio.data?.total} negócio{relatorio.data?.total === 1 ? '' : 's'} perdido
              {relatorio.data?.total === 1 ? '' : 's'} no período
            </p>
          </>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Fechar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
