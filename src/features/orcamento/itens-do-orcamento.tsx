import { totalItemCentavos } from '@/components/cabinet/documento'
import {
  AcaoDoRodape,
  type AjusteDoTotal,
  type FonteDeItens,
  GradeDeItens,
  type LinhaDaGrade,
} from '@/components/cabinet/grade-de-itens'
import { useLookupOptions } from '@/data/lookups-api'
import { tabelas } from '@/data/tabelas'
import { formatMoneyBRL } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { Home, Package } from 'lucide-react'
import { useEffect } from 'react'
import { useWatch } from 'react-hook-form'
import { useTotaisDoOrcamento } from './bloco-pagamento'

/**
 * ITENS DO ORÇAMENTO na grade 2.0 (D17, #485) — e a MESMA grade serve ao
 * pedido de venda, que é o orçamento aprovado com outro nome.
 *
 * **As 14 colunas continuam 14.** O mockup desenha sete e joga acabamento e
 * tamanho para o subtítulo da descrição, e na ordem de compra isso vale — lá
 * os dois são ECO do pedido de origem, não campo. Aqui os dois se DIGITAM, e
 * subtítulo não se digita: consolidar tiraria do operador dois campos que a
 * transcrição do Softlux lista como campos. O que o reface traz para esta tela
 * é a linha que se lê como extrato — célula sem moldura até o hover, dado em
 * mono tabular, cabeçalho em tint — e não uma poda de campo que ninguém pediu.
 */

/** Os valores de uma linha nova. Mesma forma do `ITEM_VAZIO` de sempre. */
export const ITEM_VAZIO: LinhaDaGrade = {
  item: '',
  codigoFornecedor: '',
  descricaoFornecedor: '',
  acabamento: '',
  tamanho: '',
  quantidade: '',
  unidade: 'UN',
  valorUnitarioCentavos: null,
  descontoPercentual: null,
  grupoProduto: '',
  tipoPeca: '',
  fornecedor: '',
  ambiente: '',
}

/**
 * As três inserções do §8.2 — no legado F5/F6, aqui `Alt+A`/`Alt+P` pelo
 * registry (o CLAUDE.md veta F3–F6 por conflito com o navegador).
 *
 * Não abrem folha: a linha nasce em branco e se preenche na própria grade, que
 * é o ponto da edição inline. `Produto` é a primária porque é o caminho de
 * toda linha; `Ambiente` só acrescenta o agrupador junto.
 */
function InsercoesDoOrcamento({
  adicionar,
}: {
  adicionar: (linhas: LinhaDaGrade[]) => void
}) {
  const itens = (useWatch({ name: 'itens' }) ?? []) as unknown[]

  function inserirProduto() {
    adicionar([{ ...ITEM_VAZIO, item: String(itens.length + 1) }])
  }

  function inserirAmbiente() {
    // Ambiente agrupa os itens da obra: entra como linha com ambiente definido.
    adicionar([{ ...ITEM_VAZIO, item: String(itens.length + 1), ambiente: tabelas.ambientes[0] }])
  }

  useEffect(() => bindShortcut(SHORTCUTS.produto, inserirProduto))
  useEffect(() => bindShortcut(SHORTCUTS.ambiente, inserirAmbiente))
  useEffect(() =>
    bindShortcut(SHORTCUTS.imagemProduto, () => console.info('[mock] Mostrar imagem do produto')),
  )

  return (
    <>
      <AcaoDoRodape primaria onClick={inserirProduto}>
        <Package className="size-4" /> Produto <kbd>{shortcutLabel(SHORTCUTS.produto)}</kbd>
      </AcaoDoRodape>
      <AcaoDoRodape onClick={inserirAmbiente}>
        <Home className="size-4" /> Ambiente <kbd>{shortcutLabel(SHORTCUTS.ambiente)}</kbd>
      </AcaoDoRodape>
      <AcaoDoRodape onClick={() => console.info('[mock] Pré Produto (item fora do catálogo)')}>
        Pré Produto
      </AcaoDoRodape>
    </>
  )
}

/**
 * O EXTRATO do documento (mockup: Ramp).
 *
 * Os serviços entram como PARCELA e não somem dentro do subtotal: o total do
 * orçamento sempre incluiu a aba de serviços, mas o pé da grade dizia só
 * "Subtotal" e o operador não tinha como saber de onde vinha a diferença. Como
 * parcela nomeada, a conta se lê de cima a baixo — que é o que um extrato faz.
 * O total continua idêntico ao de `useTotaisDoOrcamento`.
 */
function useAjustesDoOrcamento(): readonly AjusteDoTotal[] {
  const { subtotalDeServicosCentavos, descontoGeralCentavos } = useTotaisDoOrcamento()
  const ajustes: AjusteDoTotal[] = []
  if (subtotalDeServicosCentavos !== 0) {
    ajustes.push({ rotulo: 'Serviços', valorCentavos: subtotalDeServicosCentavos, sinal: 1 })
  }
  if (descontoGeralCentavos !== 0) {
    ajustes.push({ rotulo: 'Desconto', valorCentavos: descontoGeralCentavos, sinal: -1 })
  }
  return ajustes
}

export function ItensDoOrcamento({ rotuloDoTotal }: { rotuloDoTotal: string }) {
  // A coluna `Tipo de Peça` é um kind do servidor; as demais são tabelas locais
  // que o contrato não expõe como lista de apoio.
  const { options: opcoesDeTipoDePeca } = useLookupOptions('tipoPeca')
  const tiposDePeca = opcoesDeTipoDePeca.map((o) => o.nome)
  const ajustes = useAjustesDoOrcamento()

  const fontes: FonteDeItens[] = [
    { id: 'insercoes', render: (adicionar) => <InsercoesDoOrcamento adicionar={adicionar} /> },
  ]

  return (
    <GradeDeItens
      name="itens"
      semAdicionar
      vazio="Nenhum item ainda — o rodapé abaixo abre o primeiro."
      fontes={fontes}
      linhaNova={ITEM_VAZIO}
      colunas={[
        { key: 'item', rotulo: 'Item', papel: 'codigo' },
        { key: 'codigoFornecedor', rotulo: 'Código Fornecedor', papel: 'codigo' },
        { key: 'descricaoFornecedor', rotulo: 'Descrição do Fornecedor', papel: 'descricao' },
        { key: 'ambiente', rotulo: 'Ambiente', papel: 'select', opcoes: tabelas.ambientes },
        { key: 'acabamento', rotulo: 'Acabamento', papel: 'select', opcoes: tabelas.acabamentos },
        { key: 'tamanho', rotulo: 'Tamanho' },
        { key: 'quantidade', rotulo: 'Quant.', papel: 'quantidade' },
        { key: 'unidade', rotulo: 'Und.', papel: 'select', opcoes: tabelas.unidades },
        { key: 'valorUnitarioCentavos', rotulo: 'Valor Unit.', papel: 'money' },
        { key: 'descontoPercentual', rotulo: 'Desc. %', papel: 'percent' },
        {
          key: 'valorItem',
          rotulo: 'Valor Item',
          papel: 'calculada',
          calcular: (linha) => formatMoneyBRL(totalItemCentavos(linha)),
        },
        { key: 'grupoProduto', rotulo: 'Grupo Produto' },
        { key: 'tipoPeca', rotulo: 'Tipo de Peça', papel: 'select', opcoes: tiposDePeca },
        { key: 'fornecedor', rotulo: 'Fornecedor' },
      ]}
      totais={{ ajustes, rotuloDoTotal }}
    />
  )
}
