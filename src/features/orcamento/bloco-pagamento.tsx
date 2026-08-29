import type { DocumentInstallmentDto, InstallmentPolicyDto } from '@/api/gerado'
import { totalItemCentavos } from '@/components/cabinet/documento'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import {
  motivoDeNaoCaber,
  useCondicoesDePagamento,
  usePoliticaDeParcelamento,
} from '@/data/pagamento-api'
import { PERCENT_ESCALA, formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import type { Orcamento } from '@/mocks/orcamentos'
import { useWatch } from 'react-hook-form'

/**
 * O BLOCO PAGAMENTO do documento de venda — a aba `Pagamento` do legado
 * (`Forma_Pagamento` + `Forma_Pagamento_Parcela`), consumindo o contrato S4
 * (web#307/#309).
 *
 * ## Ele escolhe UMA coisa e exibe três
 *
 * O que a tela escreve é o `paymentTermId`, e só. Nome da condição, parcelas e
 * limites são CARIMBO do servidor: vêm no `QuoteDetailDto`, aparecem aqui e não
 * voltam no `PUT`. É o que impede o documento reimpresso de sair diferente de
 * si mesmo quando alguém edita a condição semanas depois.
 *
 * ## Por que o plano não é pré-visualizado
 *
 * Escolher a condição não desenha as parcelas: elas só existem depois que o
 * servidor as carimba. Calculá-las aqui para mostrar antes seria a segunda
 * implementação da distribuição da sobra — e a que o operador veria, enquanto a
 * que vale é a outra. O bloco diz isso por escrito em vez de adivinhar.
 *
 * ## O que o combo previne, e o que ele deixa o servidor recusar
 *
 * Duas das três regras dependem só do que a tela tem em mãos — o teto de
 * parcelas e o mínimo para parcelar — e viram opção DESABILITADA com o motivo
 * ao lado (ver `motivoDeNaoCaber`). A terceira, `parcela-abaixo-do-minimo`,
 * depende do total E do número de parcelas ao mesmo tempo, e a web#309 a
 * declarou como a que não se previne filtrando o combo: ela chega como recusa
 * do servidor, com URN própria, e a frase dele aparece no aviso do formulário.
 *
 * **Desabilitar, e não esconder.** A condição que não cabe continua na lista com
 * o porquê; sumir com ela faria quem a procura concluir que ela foi apagada.
 */

/**
 * O valor de UMA linha de serviço, em centavos.
 *
 * Duas formas chegam aqui, e a diferença não é acidente:
 *
 * - **Linha EDITÁVEL** (a aba Serviços do orçamento): a conta é a mesma dos
 *   itens — quantidade × unitário menos o desconto da linha. Usar o
 *   `totalCents` que veio do servidor deixaria o rodapé mostrando o total de
 *   ANTES enquanto o operador digita.
 * - **Linha PASSANTE** (o pedido de venda, que ainda não tem a grade): a linha
 *   é o DTO como o servidor o mandou, e o valor dela é o carimbo dele.
 *
 * O que NÃO é opção é somar zero: serviço fora do total é o número do rodapé
 * divergindo do que o cliente paga — no legado a instalação é linha de
 * `VendaServico`, e o contrato diz em letra que "o total do documento é a soma
 * das DUAS coleções".
 */
export interface LinhaDeServico {
  /** Presente na linha EDITÁVEL; ausente na passante. */
  quantidade?: string | number | boolean | null
  valorUnitarioCentavos?: string | number | boolean | null
  descontoPercentual?: string | number | boolean | null
  /** O carimbo do servidor, só na linha passante. */
  totalCents?: number
}

export function totalServicoCentavos(servico: LinhaDeServico): number {
  if (servico.quantidade !== undefined) return totalItemCentavos(servico)
  return typeof servico.totalCents === 'number' ? servico.totalCents : 0
}

/**
 * Os totais do documento como a TELA os mostra — uma cópia só da regra.
 *
 * O desconto geral incide sobre o subtotal e o por produto já saiu na linha
 * (§8.2). A conta vive aqui porque duas partes precisam dela: o pé da grade de
 * itens e este bloco, que decide quais condições cabem no total. Em duas cópias,
 * o dia em que o desconto mudar de fórmula deixa o combo oferecendo parcela
 * sobre um total que a tela não mostra mais.
 *
 * **O subtotal soma as DUAS coleções**, produtos e serviços — ver
 * `totalServicoCentavos`. É o que faz o parcelamento ser oferecido sobre o total
 * que o servidor vai carimbar: um documento cuja instalação passa do mínimo para
 * parcelar recusaria, no combo, a condição que o servidor aceitaria.
 */
export function useTotaisDoOrcamento(): {
  subtotalCentavos: number
  subtotalDeServicosCentavos: number
  descontoGeralCentavos: number
  totalCentavos: number
} {
  const itens = (useWatch({ name: 'itens' }) ?? []) as Parameters<typeof totalItemCentavos>[0][]
  const servicos = (useWatch({ name: 'servicos' }) ?? []) as LinhaDeServico[]
  const modo = useWatch({ name: 'modoDesconto' }) as Orcamento['modoDesconto']
  const percentual = (useWatch({ name: 'descontoPercentual' }) as number) ?? 0

  const subtotalDeProdutos = itens.reduce((acc, item) => acc + totalItemCentavos(item), 0)
  const subtotalDeServicosCentavos = servicos.reduce(
    (acc, servico) => acc + totalServicoCentavos(servico),
    0,
  )
  const subtotalCentavos = subtotalDeProdutos + subtotalDeServicosCentavos
  const descontoGeralCentavos =
    modo === 'GERAL' ? Math.round((subtotalCentavos * percentual) / (PERCENT_ESCALA * 100)) : 0

  return {
    subtotalCentavos,
    subtotalDeServicosCentavos,
    descontoGeralCentavos,
    totalCentavos: subtotalCentavos - descontoGeralCentavos,
  }
}

export function BlocoPagamento() {
  const { totalCentavos } = useTotaisDoOrcamento()
  const condicaoId = useWatch({ name: 'condicaoPagamentoId' }) as string | null
  const nomeCarimbado = useWatch({ name: 'condicaoPagamento' }) as string | null
  const parcelas = (useWatch({ name: 'parcelas' }) ?? []) as DocumentInstallmentDto[]
  const carimbo = useWatch({ name: 'politicaDeParcelamento' }) as InstallmentPolicyDto | undefined

  const { condicoes, carregando, erro } = useCondicoesDePagamento()
  const { politica: politicaCorrente } = usePoliticaDeParcelamento()

  // O documento manda no que ele mostra: os limites exibidos são os do CARIMBO
  // quando ele existe. Ler a política de hoje aqui mudaria, na tela, a regra sob
  // a qual o documento foi feito.
  const limites = carimbo ?? politicaCorrente
  const limitesSaoDoCarimbo = carimbo !== undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ComboDeCondicao
          condicoes={condicoes}
          carregando={carregando}
          // A condição do DOCUMENTO entra na lista mesmo que hoje esteja
          // inativa: sem ela o campo apareceria em branco e o próximo `Gravar`
          // apagaria o plano — o mesmo defeito que esta PR conserta na origem.
          atual={condicaoId && nomeCarimbado ? { id: condicaoId, nome: nomeCarimbado } : null}
          politica={limites}
          totalCentavos={totalCentavos}
        />
        <p
          aria-label="Limites de parcelamento"
          className="pb-2 text-muted-foreground text-sm tabular-nums"
        >
          Até {limites.maxInstallments}× · parcela mínima{' '}
          {formatMoneyBRL(limites.minInstallmentCents)} · parcela só acima de{' '}
          {formatMoneyBRL(limites.minTotalToInstallCents)}{' '}
          <span className="font-[family-name:var(--font-nome)] italic">
            {limitesSaoDoCarimbo ? '— vigentes na gravação' : '— vigentes hoje na empresa'}
          </span>
        </p>
      </div>

      {erro ? (
        // Falha de lista de apoio não trava o formulário: o documento continua
        // com a condição que já tem, e o operador continua gravando o resto.
        <p className="text-sm text-warn">
          Não foi possível carregar as condições de pagamento. O documento mantém a que já tem.
        </p>
      ) : null}

      {condicaoId === null ? (
        <p className="text-muted-foreground text-sm">
          Documento sem condição de pagamento — o plano é carimbado pelo servidor ao gravar.
        </p>
      ) : parcelas.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          O plano desta condição é calculado pelo servidor no `Gravar` — datas e valores aparecem
          aqui depois dele.
        </p>
      ) : (
        <PlanoCarimbado parcelas={parcelas} />
      )}
    </div>
  )
}

function ComboDeCondicao({
  condicoes,
  carregando,
  atual,
  politica,
  totalCentavos,
}: {
  condicoes: readonly { id: string; name: string; installmentCount: number }[]
  carregando: boolean
  atual: { id: string; nome: string } | null
  politica: InstallmentPolicyDto
  totalCentavos: number
}) {
  const listadas = condicoes.some((c) => c.id === atual?.id)
  const opcoes = [
    // A condição do documento primeiro, quando a listagem não a traz (inativa,
    // ou lista que falhou). Nunca desabilitada: ela É o valor do registro.
    ...(atual && !listadas
      ? [{ id: atual.id, rotulo: `${atual.nome} (inativa)`, motivo: null }]
      : []),
    ...condicoes.map((c) => {
      const motivo = motivoDeNaoCaber(c, politica, totalCentavos)
      // Sempre `N×`, inclusive para 1: a condição chamada "À vista" sairia
      // "À vista (à vista)", e o rótulo que repete o nome não informa nada.
      const vezes = `${c.installmentCount}×`
      return {
        id: c.id,
        rotulo: motivo ? `${c.name} (${vezes}) — ${motivo}` : `${c.name} (${vezes})`,
        motivo,
      }
    }),
  ]

  return (
    <FormField
      name="condicaoPagamentoId"
      render={({ field }) => (
        <FormItem className="min-w-72">
          <FormLabel>Condição de pagamento</FormLabel>
          <FormControl>
            <select
              // Sem sombra: campo é coplanar com a folha (Regra da Linha Antes
              // da Sombra), como todo controle de `form-controls.tsx`.
              className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
              disabled={carregando}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">{carregando ? 'Carregando…' : 'Sem condição'}</option>
              {opcoes.map((o) => (
                <option key={o.id} value={o.id} disabled={o.motivo !== null}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </FormControl>
        </FormItem>
      )}
    />
  )
}

/**
 * As parcelas que o servidor carimbou — leitura pura, com a SOMA ao pé.
 *
 * A soma existe porque o plano é conferido a olho contra o total do documento,
 * como o impresso do legado: sem ela, quem confere soma N números de cabeça
 * para descobrir se o plano fecha.
 */
function PlanoCarimbado({ parcelas }: { parcelas: readonly DocumentInstallmentDto[] }) {
  const soma = parcelas.reduce((acc, p) => acc + p.amountCents, 0)

  return (
    <table aria-label="Parcelas do documento" className="w-full max-w-md text-sm">
      <thead>
        <tr className="border-rule-hair border-b text-left text-muted-foreground">
          <th scope="col" className="py-1 font-medium">
            Parcela
          </th>
          <th scope="col" className="py-1 font-medium">
            Vencimento
          </th>
          <th scope="col" className="py-1 text-right font-medium">
            Valor
          </th>
        </tr>
      </thead>
      <tbody>
        {parcelas.map((p) => (
          <tr key={p.number} className="border-rule-hair border-b last:border-0">
            <td className="py-1 tabular-nums">{p.number}</td>
            <td className="py-1 tabular-nums">{formatDateBR(p.dueDate)}</td>
            <td className="py-1 text-right tabular-nums">{formatMoneyBRL(p.amountCents)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="py-1 font-semibold" colSpan={2}>
            Soma das parcelas
          </td>
          <td aria-label="Soma das parcelas" className="py-1 text-right font-semibold tabular-nums">
            {formatMoneyBRL(soma)}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}
