import type { QuoteDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { Button } from '@/components/ui/button'
import { data } from '@/data'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useCancelarOrcamento } from '@/data/quotes-api'
import { GerarPedido } from '@/features/vendas/gerar-pedido'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR } from '@/lib/formatters'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, FileOutput, HardHat, Hash, User } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/vendas/orcamentos/')({
  component: OrcamentosPage,
})

/**
 * Colunas LITERAIS da transcrição §8.1 — com o `accessorKey` em INGLÊS.
 *
 * O rótulo que o operador lê continua o da transcrição; o que muda é a CHAVE,
 * que é o nome que a whitelist de `sortBy` do servidor aceita. Traduzir a chave
 * quebraria a ordenação com 400 ao primeiro clique no cabeçalho (padrão 1).
 */
const columns: ColumnDef<QuoteDto>[] = [
  { accessorKey: 'number', header: 'Número' },
  // `series` não está na whitelist do contrato: a coluna aparece e não ordena,
  // o que é melhor que um cabeçalho clicável que responde 400.
  { accessorKey: 'series', header: 'Série', enableSorting: false },
  { accessorKey: 'customerName', header: 'Cliente' },
  {
    accessorKey: 'projectName',
    header: 'Descrição da Obra',
    cell: ({ getValue }) => getValue<string | null>() || '—',
  },
  {
    accessorKey: 'issuedAt',
    header: 'Data Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    accessorKey: 'expiresAt',
    header: 'Data Validade',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
]

/** Botões do rodapé da listagem — §8.1 (telas próprias ainda não capturadas). */
const BOTOES_RODAPE = [
  'Produtos Desativados',
  'Alterar Limites',
  'Atualizar Valores',
  'Margem de Lucro',
  'Quadro',
] as const

function RodapeDeOrcamento() {
  return (
    <div className="flex flex-wrap gap-2">
      {BOTOES_RODAPE.map((label) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info(`[mock] ${label}`)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

/**
 * Campos filtráveis da §8.1. **Primeira listagem a filtrar por DATA**, e é a
 * consulta que uma tela de documento pede antes de qualquer outra: "os
 * orçamentos de agosto", "o que vence esta semana".
 *
 * A data usa `<input type="date">` nativo — o dado é ISO (`yyyy-mm-dd`), que é
 * exatamente o que o input fala, e o calendário vem do sistema operacional.
 *
 * `Série` fica de fora: é o mesmo valor em toda linha, e filtro por campo de
 * valor único não estreita nada. Valor e desconto também: trafegam em unidade
 * que o operador não digita (centavos, percentual com 4 casas implícitas) e não
 * há variante que converta na borda.
 *
 * Recurso HTTP desde a #134: quem responde é `/api/quotes`, e os `id` daqui
 * são os nomes do DTO — o contrato publica `filters` com a mesma whitelist do
 * `sortBy`, e campo fora dela é barrado na fronteira antes de sair.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'number', rotulo: 'Número', variante: 'text', icon: Hash, placeholder: 'Ex.: 21653' },
  {
    id: 'customerName',
    rotulo: 'Cliente',
    variante: 'text',
    icon: User,
    placeholder: 'Parte do nome…',
  },
  {
    id: 'projectName',
    rotulo: 'Descrição da Obra',
    variante: 'text',
    icon: HardHat,
    placeholder: 'Parte da descrição…',
  },
  { id: 'issuedAt', rotulo: 'Data Emissão', variante: 'date', icon: CalendarDays },
  { id: 'expiresAt', rotulo: 'Data Validade', variante: 'date', icon: CalendarDays },
]

function OrcamentosPage() {
  const navigate = useNavigate()
  const [paraCancelar, setParaCancelar] = useState<QuoteDto | null>(null)
  const [paraConverter, setParaConverter] = useState<QuoteDto | null>(null)
  const cancelar = useCancelarOrcamento()
  const { readOnly } = useReadOnlyPorPapel('quotes')

  function abrir(orcamentoId: string, modo?: 'consulta') {
    void navigate({
      to: '/vendas/orcamentos/$orcamentoId',
      params: { orcamentoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<QuoteDto>({
    entidade: 'orçamento',
    readOnly,
    onIncluir: () => abrir('novo'),
    onAbrir: (o) => abrir(o.id),
    onConsultar: (o) => abrir(o.id, 'consulta'),
  })

  // Orçamento não se apaga, se cancela (§8.1) — e cancelar é caminho PRÓPRIO
  // do contrato (`POST /api/quotes/{id}/cancel`), não um `PUT` com situação
  // trocada: quem decide a transição é o servidor.
  const actionsOrcamento = actions.map((a) =>
    a.id === 'excluir'
      ? {
          ...a,
          label: 'Cancelar',
          // Abre a confirmação; a escrita só sai de lá. Cancelamento é
          // terminal (o contrato não publica reabertura), e ação irreversível
          // atrás de um clique só é a que o operador dá sem querer.
          onClick: (o: QuoteDto | null) => setParaCancelar(o),
        }
      : a,
  )

  /**
   * `Gerar Pedido` é a SÉTIMA ação, e não substitui nenhuma das seis.
   *
   * A barra do padrão 4 (`Filtro · Incluir · Alterar · Consul. · Excluir ·
   * Imprimir`) é a mesma em toda tela, e continua sendo: esta entra depois, com
   * `needsSelection`, então ela desce para a barra de SELEÇÃO — a que só existe
   * quando há uma linha marcada. É onde a ação pertence, porque converter é
   * sobre ESTE orçamento, e é o único lugar em que ela não disputa espaço com a
   * fileira que o operador já conhece de cor.
   *
   * O papel que ela exige é o do ORÇAMENTO, não o do pedido: a borda do backend
   * classifica `POST /api/quotes/{id}/order` por prefixo de caminho, e o prefixo
   * é `/api/quotes`. Pedir o papel de pedido aqui recusaria na tela quem o
   * servidor aceitaria — e passaria a acusar o papel errado.
   */
  const acoesDaTela = [
    ...actionsOrcamento,
    {
      id: 'gerar-pedido',
      label: 'Gerar Pedido',
      icon: FileOutput,
      needsSelection: true,
      ...(readOnly
        ? { disabled: true, title: 'O papel deste vínculo não permite alterações.' }
        : {}),
      onClick: (o: QuoteDto | null) => setParaConverter(o),
    },
  ]

  return (
    <>
      <TelaDeListagem
        titulo="Orçamento"
        columns={columns}
        queryKey={['orcamentos']}
        fetcher={data.orcamentos.list}
        actions={acoesDaTela}
        filtros={camposFiltraveis}
        rodape={<RodapeDeOrcamento />}
        cancelamento={{
          documento: 'orçamento',
          registro: paraCancelar,
          numero: (o) => o.number,
          cancelado: (o) => o.status === 'cancelled',
          pendente: cancelar.isPending,
          erro: cancelar.error,
          onFechar: () => {
            setParaCancelar(null)
            cancelar.reset()
          },
          comMotivo: true,
          onConfirmar: (motivo) => {
            if (!paraCancelar) return
            // Fecha no SUCESSO. Fechar antes esconderia a recusa do servidor
            // junto com o diálogo, e a listagem voltaria igual — indistinguível
            // de um cancelamento que deu certo.
            cancelar.mutate(
              { id: paraCancelar.id, motivo },
              { onSuccess: () => setParaCancelar(null) },
            )
          },
        }}
      />
      {/* IRMÃ da listagem, e não dentro dela: a caixa precisa do orçamento
          SELECIONADO, e quem guarda a seleção é esta página. O `rodape` da
          `TelaDeListagem` é o lugar dos botões que valem para a tela inteira,
          não para uma linha. */}
      <GerarPedido orcamento={paraConverter} onFechar={() => setParaConverter(null)} />
    </>
  )
}
