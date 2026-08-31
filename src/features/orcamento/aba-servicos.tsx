import type { ServiceDto } from '@/api/gerado'
import { totalItemCentavos } from '@/components/cabinet/documento'
import { FormGrid, type FormGridRow } from '@/components/cabinet/form-grid'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Button } from '@/components/ui/button'
import { data } from '@/data'
import { tabelas } from '@/data/tabelas'
import { useTotaisDoOrcamento } from '@/features/orcamento/bloco-pagamento'
import { formatMoneyBRL } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilLine, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useWatch } from 'react-hook-form'

/**
 * A ABA SERVIÇOS do documento de venda — instalação, projeto e entrega.
 *
 * ## Por que ela é uma coleção à parte, e não um item com flag
 *
 * As duas linhas não têm as mesmas colunas. Serviço não tem acabamento,
 * tamanho, unidade, fornecedor nem código no fornecedor, e tem percentual de
 * eletricista, que produto nenhum tem. Uma coleção só obrigaria metade dos
 * campos a serem `null` conforme a outra metade. É o que o contrato publica
 * (`QuoteServiceItemDto`) e o que o legado guarda em `VendaServico` — tabela
 * própria, 4.450 linhas, enquanto `Orcamento_servico_det` está zerada.
 *
 * ## Três valores CONGELAM na emissão
 *
 * `description`, `unitPriceCents` e `electricianPercent` são fotografia do
 * cadastro no dia da gravação: corrigir o preço de `INST-LUM` amanhã não pode
 * reescrever documento que já foi ao cliente. Por isso o botão `Serviço` COPIA
 * os valores para a linha em vez de guardar só o id.
 *
 * ## O que a tela NÃO calcula
 *
 * `electricianAmountCents` — quanto o instalador recebe. O número vira pagamento
 * de gente (`acerto_eletrecistas_servicos` no legado), e recalculá-lo aqui daria
 * um arredondamento por cliente sobre a linha que alguém recebe. A coluna mostra
 * o carimbo do servidor e fica em branco na linha ainda não gravada — o
 * contrato manda, e o mock já obedece.
 */

/** Linha em branco — a mesma forma de `ServicoDoOrcamento`. */
const SERVICO_VAZIO: FormGridRow = {
  item: '',
  servicoId: null,
  descricao: '',
  quantidade: '1',
  valorUnitarioCentavos: null,
  descontoPercentual: null,
  // `null` = HERDA do cadastro na gravação. Ver `BuscaDeServico`.
  percentualEletricista: null,
  eletricistaCentavos: null,
  ambiente: '',
}

/** Colunas da busca — chaves no nome do contrato, que é o que viaja como `sortBy`. */
const colunasDeServico: ColumnDef<ServiceDto>[] = [
  { accessorKey: 'code', header: 'Código' },
  { accessorKey: 'description', header: 'Descrição' },
  {
    accessorKey: 'priceCents',
    header: 'Preço',
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatMoneyBRL(getValue<number>())}</span>
    ),
  },
]

/**
 * Os dois jeitos de nascer uma linha, e os dois estão no contrato:
 * `serviceId` apontando para o cadastro, ou `null` na DESCRIÇÃO AVULSA — que o
 * legado permite (`ose_descricao` existe ao lado do `Sev_cod`).
 */
function BotoesDeServico({ append }: { append: (row: FormGridRow) => void }) {
  const servicos = (useWatch({ name: 'servicos' }) ?? []) as unknown[]
  const [buscaAberta, setBuscaAberta] = useState(false)

  function proximoItem() {
    return String(servicos.length + 1)
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setBuscaAberta(true)}>
        <Wrench className="size-4" /> Serviço
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ ...SERVICO_VAZIO, item: proximoItem() })}
      >
        <PencilLine className="size-4" /> Descrição avulsa
      </Button>

      <SearchDialog
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="Busca de Serviço"
        columns={colunasDeServico}
        queryKey={['busca-servico-orcamento']}
        fetcher={(state) => data.servicos.list(state, 0)}
        onSelect={(servico) => {
          append({
            ...SERVICO_VAZIO,
            item: proximoItem(),
            servicoId: servico.id,
            descricao: servico.description,
            // `priceLocked` é `Serv_NaoAtualizarValor`: serviço orçado caso a
            // caso NÃO puxa o preço do cadastro — quem digita o valor é o
            // operador. Trazer os R$ 950 do projeto luminotécnico faria a tela
            // propor um número que o cadastro diz não valer.
            valorUnitarioCentavos: servico.priceLocked ? null : servico.priceCents,
            // O percentual do eletricista NÃO é copiado, e a omissão é a
            // instrução: `null` no corpo pede ao servidor o percentual vigente
            // no momento da gravação. Copiá-lo aqui congelaria o número que
            // estava na tela — que é o do cadastro de quando a busca abriu.
            percentualEletricista: null,
          })
          setBuscaAberta(false)
        }}
      />
    </>
  )
}

export function AbaServicos() {
  const { subtotalDeServicosCentavos } = useTotaisDoOrcamento()

  return (
    <div className="flex flex-col gap-4">
      <FormGrid
        name="servicos"
        hideAdd
        actions={(append) => <BotoesDeServico append={append} />}
        columns={[
          { key: 'item', label: 'Item' },
          { key: 'descricao', label: 'Descrição', voz: 'produto' },
          { key: 'ambiente', label: 'Ambiente', type: 'select', options: tabelas.ambientes },
          { key: 'quantidade', label: 'Quant.' },
          { key: 'valorUnitarioCentavos', label: 'Valor Unit.', type: 'money' },
          { key: 'descontoPercentual', label: 'Desc. %', type: 'percent' },
          { key: 'percentualEletricista', label: '% Eletricista', type: 'percent' },
          {
            key: 'valorServico',
            label: 'Valor Serviço',
            type: 'computed',
            compute: (row: FormGridRow) => formatMoneyBRL(totalItemCentavos(row)),
          },
          {
            key: 'eletricista',
            label: 'Eletricista',
            type: 'computed',
            // Em branco, e não `R$ 0,00`: zero é uma resposta ("esta linha não
            // paga instalador") e a linha nova ainda não tem nenhuma.
            compute: (row: FormGridRow) =>
              typeof row.eletricistaCentavos === 'number'
                ? formatMoneyBRL(row.eletricistaCentavos)
                : '—',
          },
        ]}
        newRow={SERVICO_VAZIO}
        totals={{
          valueColumnKey: 'valorServico',
          // SEM `destaque`: o fecho do documento é o Total da seção `Totais`,
          // que já soma as duas coleções. Um segundo total em destaque aqui
          // seria dois grand totals na mesma folha, e o operador leria o menor.
          rows: [{ label: 'Total dos Serviços', valorCentavos: subtotalDeServicosCentavos }],
        }}
      />

      <p className="font-[family-name:var(--font-nome)] text-[0.9375rem] text-muted-foreground italic">
        <strong className="font-semibold text-foreground not-italic">
          % Eletricista em branco
        </strong>{' '}
        herda o percentual do cadastro do serviço na gravação; <code>0</code> é escolha explícita —
        esta linha não paga instalador. O valor do eletricista é calculado pelo servidor e aparece
        na coluna depois do{' '}
        <strong className="font-semibold text-foreground not-italic">Gravar</strong>.
      </p>
    </div>
  )
}
