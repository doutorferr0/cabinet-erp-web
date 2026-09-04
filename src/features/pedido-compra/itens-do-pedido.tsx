import type { PartnerDto } from '@/api/gerado'
import {
  type FonteDeItens,
  FonteEmFolha,
  GradeDeItens,
  type LinhaDaGrade,
} from '@/components/cabinet/grade-de-itens'
import { Nome } from '@/components/cabinet/nome'
import { data } from '@/data'
import { DESTINO_ROTULO, ROTULOS_DE_DESTINO, SITUACAO_DA_LINHA } from '@/data/compras-api'
import type { ItemDoPedidoDeCompra } from '@/data/compras-api'
import { tabelas } from '@/data/tabelas'
import { SHORTCUTS } from '@/lib/shortcuts'
import type { ColumnDef } from '@tanstack/react-table'
import { Package } from 'lucide-react'
import { useWatch } from 'react-hook-form'
import type { LinhaNoFormulario } from './pedido-compra-form'

/**
 * ITENS DO PEDIDO DE COMPRA na grade 2.0 (D17, #485).
 *
 * **A linha nasce escolhendo o FORNECEDOR, e é por isso que não há
 * `+ Adicionar item` solto.** Um pedido de compra pode misturar fornecedores —
 * é ele que se reparte em várias ordens depois —, então `fornecedorId` é o
 * primeiro dado da linha, não o último. Um botão que inserisse linha em branco
 * criaria linha que nenhuma ordem consegue levar.
 *
 * A busca era `Dialog` e vira `Sheet` (mockup): o operador traz linhas de dois
 * ou três fornecedores seguidos, e o modal centralizado cobre justamente a
 * grade que ele está enchendo. `Alt+P` continua abrindo — a tecla é
 * conveniência que já existia e nenhuma rodada de design a tira.
 */

const colunasDeFornecedor: ColumnDef<PartnerDto>[] = [
  { accessorKey: 'code', header: 'Código' },
  {
    accessorKey: 'legalName',
    header: 'Fornecedor',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  { accessorKey: 'document', header: 'Documento' },
]

/** A linha em branco DESTE fornecedor — o resto o operador digita na grade. */
function linhaDoFornecedor(fornecedor: PartnerDto, proximaLinha: number): LinhaDaGrade {
  return {
    linha: proximaLinha,
    varianteId: null,
    descricao: '',
    acabamento: '',
    tamanho: '',
    unidade: 'UN',
    quantidade: '',
    destinoRotulo: DESTINO_ROTULO.stock,
    fornecedorId: fornecedor.id,
    fornecedor: fornecedor.legalName ?? '',
    linhaDoPedidoDeVenda: null,
    ordemId: null,
    ordemNumero: null,
    situacao: 'open',
    observacao: '',
  }
}

export function ItensDoPedido() {
  const itens = (useWatch({ name: 'itens' }) as LinhaNoFormulario[] | undefined) ?? []

  const fontes: FonteDeItens[] = [
    {
      id: 'fornecedor',
      render: (adicionar) => (
        <FonteEmFolha<PartnerDto>
          primaria
          rotulo="Produto"
          atalho={SHORTCUTS.produto}
          icone={<Package className="size-4" />}
          titulo="De qual fornecedor é esta linha?"
          descricao="O pedido pode misturar fornecedores — é ele que se reparte em ordens depois. Por isso a linha começa por aqui."
          colunas={colunasDeFornecedor}
          queryKey={['fornecedores', 'linha-do-pedido-de-compra']}
          fetcher={(state) => data.fornecedores.list(state)}
          paraLinhas={(fornecedor) => [linhaDoFornecedor(fornecedor, itens.length + 1)]}
          adicionar={adicionar}
        />
      ),
    },
  ]

  return (
    <GradeDeItens
      name="itens"
      semAdicionar
      vazio="Nenhuma linha ainda — escolha o fornecedor pelo rodapé para abrir a primeira."
      fontes={fontes}
      linhaNova={{}}
      colunas={[
        { key: 'descricao', rotulo: 'Descrição', papel: 'descricao' },
        { key: 'acabamento', rotulo: 'Acab.', papel: 'select', opcoes: tabelas.acabamentos },
        { key: 'tamanho', rotulo: 'Tamanho' },
        { key: 'quantidade', rotulo: 'Quantidade', papel: 'quantidade' },
        { key: 'unidade', rotulo: 'Unidade', papel: 'select', opcoes: tabelas.unidades },
        {
          key: 'destinoRotulo',
          rotulo: 'Destino',
          papel: 'select',
          opcoes: ROTULOS_DE_DESTINO,
        },
        {
          // ECO, não campo: a chave é o `fornecedorId` que a busca gravou.
          key: 'fornecedor',
          rotulo: 'Fornecedor',
          papel: 'calculada',
          calcular: (linha) => String(linha.fornecedor ?? '') || '—',
        },
        {
          key: 'situacao',
          rotulo: 'Situação',
          papel: 'calculada',
          calcular: (linha) =>
            SITUACAO_DA_LINHA[linha.situacao as ItemDoPedidoDeCompra['situacao']] ?? '—',
        },
        {
          // A rastreabilidade para o outro lado: qual ordem levou esta linha.
          key: 'ordemNumero',
          rotulo: 'Ordem',
          papel: 'calculada',
          calcular: (linha) => String(linha.ordemNumero ?? '') || '—',
        },
      ]}
    />
  )
}
