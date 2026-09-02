import type { OrderDetailDto, PartnerDto } from '@/api/gerado'
import { AbasSemCaptura } from '@/components/cabinet/abas-sem-captura'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { DocumentoBloco } from '@/components/cabinet/documento'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { DateField, RadioField, SelectField, TextField } from '@/components/cabinet/form-controls'
import { Nome } from '@/components/cabinet/nome'
import { posGravar } from '@/components/cabinet/pos-gravar'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Secao } from '@/components/cabinet/secao'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { data } from '@/data'
import { type PedidoDeVenda, useGravarPedidoDeVenda } from '@/data/pedidos-venda-api'
import { tabelas } from '@/data/tabelas'
import { ParticipacaoDoPedido } from '@/features/comissoes/participacao-do-pedido'
import { BlocoPagamento } from '@/features/orcamento/bloco-pagamento'
import { ItensDoOrcamento } from '@/features/orcamento/itens-do-orcamento'
import { AcoesDoCiclo } from '@/features/vendas/acoes-do-ciclo'
import { formatDateBR, formatMoneyBRL, formatPercent } from '@/lib/formatters'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Calculator, CreditCard, Hash, List, Percent, Truck, User } from 'lucide-react'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'

/**
 * O FORMULÁRIO DO PEDIDO DE VENDA — `/api/orders`.
 *
 * A folha é irmã da do orçamento e não é cópia dela: o pedido tem TIPO (venda
 * ou demonstração), prazo e retorno de demonstração, e sabe de qual orçamento
 * veio. O que ele NÃO tem é validade — proposta vence, pedido não.
 *
 * ## O que esta tela não edita, ela preserva
 *
 * `serviceItems`, `groupDiscounts` e `workId` atravessam o formulário sem campo
 * nenhum. Precisam estar DECLARADOS no schema abaixo mesmo assim: o Zod remove
 * o que não declara, o que chega ao `onGravar` é o resultado do parse, e o
 * `PUT` é INTEGRAL — sem a linha, `Gravar` sem editar nada apagaria os três.
 */

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const pedidoDeVendaSchema = z.object({
  // Id de TEXTO: o documento tem id de servidor, e ele não aparece na tela.
  id: z.string(),
  numero: z.string(),
  serie: z.string(),
  numeroPasta: z.string(),
  dataEmissao: z.string().nullable(),
  dataFechamento: z.string().nullable(),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  // O ID PRECISA ESTAR DECLARADO mesmo sem campo próprio na tela: sem ele o
  // `PUT` sairia com `customerId: undefined` e apagaria o cliente do documento,
  // enquanto a tela mostraria o nome o tempo todo — o nome está declarado.
  clienteId: z.string(),
  descricaoObra: z.string(),
  // O elo com a OBRA, que a tela não edita e não pode perder. É a mesma dívida
  // que `quotes-api.ts` registra por escrito: quem puser o campo no formulário
  // liga os dois lados no MESMO PR.
  obraId: z.string().nullable(),
  obra: z.string().nullable(),
  consultor: z.string().nullable(),
  consultorId: z.string().nullable(),
  profissionalExterno: z.string().nullable(),
  profissionalId: z.string().nullable(),
  // Situação: não se edita aqui (muda por `/cancel` e `/conclude`), e some do
  // registro se não for declarada — a ficha passaria a mostrar "aberto" para um
  // pedido cancelado.
  situacao: z.enum(['active', 'concluded', 'cancelled']),
  tipo: z.enum(['sale', 'demo']),
  prazoDemonstracao: z.string().nullable(),
  // Carimbo de `POST .../demo-return`, que o backend ainda não serve (501).
  retornoDemonstracao: z.string().nullable(),
  orcamentoOrigemId: z.string().nullable(),
  orcamentoOrigemNumero: z.string().nullable(),
  modoDesconto: z.enum(['PRODUTO', 'GERAL', 'GRUPO']),
  descontoPercentual: z.number(),
  // Desconto por GRUPO — declarado para ser REENVIADO, não para ser editado.
  // No legado são ~8 grupos por documento; perdê-los muda o valor do pedido
  // sem erro em lugar nenhum.
  descontosPorGrupo: z.array(
    z.object({
      productGroupId: z.string(),
      productGroupName: z.string(),
      discountPercent: z.number(),
      subtotalCents: z.number(),
      discountCents: z.number(),
      totalCents: z.number(),
      quantity: z.number().nullable().optional(),
    }),
  ),
  ambientes: z.array(z.object({ codigo: z.string(), nome: z.string(), ordem: z.number() })),
  // O BLOCO PAGAMENTO inteiro. Só o id é editável; os outros três são CARIMBO
  // do servidor e voltam ao formulário sem subirem no corpo. Declará-los é o
  // que os mantém vivos entre a leitura e a gravação — sem isso, abrir um
  // documento com plano e clicar em `Gravar` APAGA a condição, com 200.
  condicaoPagamentoId: z.string().nullable(),
  condicaoPagamento: z.string().nullable(),
  parcelas: z.array(z.object({ number: z.number(), dueDate: z.string(), amountCents: z.number() })),
  politicaDeParcelamento: z
    .object({
      minTotalToInstallCents: z.number(),
      minInstallmentCents: z.number(),
      maxInstallments: z.number(),
    })
    .optional(),
  // Serviços do documento — mesma razão dos descontos por grupo: a tela não os
  // edita (a aba `Serviços` não foi capturada) e o `PUT` os apagaria.
  servicos: z.array(
    z.object({
      lineNumber: z.number(),
      environmentCode: z.string().nullable().optional(),
      serviceId: z.string().nullable().optional(),
      description: z.string(),
      quantity: z.number(),
      unitPriceCents: z.number(),
      discountPercent: z.number(),
      electricianPercent: z.number(),
      electricianAmountCents: z.number(),
      totalCents: z.number(),
    }),
  ),
  itens: z.array(
    z.object({
      item: z.string(),
      codigoFornecedor: z.string(),
      descricaoFornecedor: z.string(),
      acabamento: z.string(),
      tamanho: z.string(),
      quantidade: z.string(),
      unidade: z.string(),
      valorUnitarioCentavos: z.number().nullable(),
      descontoPercentual: z.number().nullable(),
      grupoProduto: z.string(),
      tipoPeca: z.string(),
      fornecedor: z.string(),
      ambiente: z.string(),
    }),
  ),
})

/** Botões de inserção de item — F5/F6 no legado; aqui Alt+A / Alt+P (F3–F6 vetadas). */

/** Colunas de PARCEIRO — a busca de Cliente e a de Profissional são papéis do
 * mesmo `GET /api/partners`; só o filtro `role` muda. */
const colunasParceiro: ColumnDef<PartnerDto>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'legalName',
    header: 'Nome',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
]

/**
 * A PROCEDÊNCIA do documento — de qual orçamento ele veio.
 *
 * O contrato resolve o número no servidor justamente para a tela dizer "veio do
 * orçamento 1234" sem uma segunda consulta. Some quando o pedido nasceu direto:
 * linha vazia dizendo "sem origem" é ruído em todo pedido digitado à mão.
 */
function OrigemDoPedido() {
  const numero = useWatch({ name: 'orcamentoOrigemNumero' }) as string | null
  const id = useWatch({ name: 'orcamentoOrigemId' }) as string | null
  if (!id) return null

  return (
    <p className="text-sm text-muted-foreground">
      Convertido do orçamento <strong className="text-foreground">{numero ?? id}</strong>.
    </p>
  )
}

/**
 * TIPO do documento, e o prazo que só ele usa.
 *
 * `demo` é o que muda o COMPORTAMENTO do pedido: a peça sai do estoque como
 * empréstimo e tem de voltar. O prazo aparece só em demonstração — em venda o
 * contrato manda `null`, e prazo pendurado num pedido de venda é prazo que
 * nunca vence porque nada o consulta.
 *
 * `presale` não existe no contrato, e é decisão medida: o menu do legado tinha
 * "Pré-venda" e o dado real traz ZERO em 34 mil documentos.
 */
function TipoDoDocumento() {
  const tipo = useWatch({ name: 'tipo' }) as PedidoDeVenda['tipo']
  const retorno = useWatch({ name: 'retornoDemonstracao' }) as string | null

  return (
    <div className="flex flex-wrap items-end gap-4">
      <RadioField
        name="tipo"
        label="Tipo"
        options={[
          { value: 'sale', label: 'Venda' },
          { value: 'demo', label: 'Demonstração' },
        ]}
      />
      {tipo === 'demo' && (
        <>
          <DateField name="prazoDemonstracao" label="Retornar até" className="w-44" />
          <p className="text-sm text-muted-foreground">
            {retorno ? (
              <>
                Peça devolvida em{' '}
                <strong className="text-foreground">{formatDateBR(retorno)}</strong>.
              </>
            ) : (
              'Peça ainda fora.'
            )}
          </p>
        </>
      )}
    </div>
  )
}

/**
 * Desconto — TRÊS modos no contrato, DOIS editáveis aqui.
 *
 * `group` é o modo mais usado da operação no legado (`VendaDesconto` tem
 * 300.337 linhas para 37.707 vendas, ~8 grupos por documento) e a tela ainda
 * não tem a grade que o edita. Ele não é rebaixado em silêncio: o documento que
 * chega no modo GRUPO o mantém, os percentuais são reenviados intactos, e o
 * aviso diz o que o operador está vendo. Trocar o modo por um clique é decisão
 * dele — explícita, e não efeito colateral de abrir a folha e gravar.
 */
function ControlesDesconto() {
  const modo = useWatch({ name: 'modoDesconto' }) as PedidoDeVenda['modoDesconto']
  const grupos = (useWatch({ name: 'descontosPorGrupo' }) ??
    []) as PedidoDeVenda['descontosPorGrupo']

  return (
    <div className="flex flex-col gap-3">
      <RadioField
        name="modoDesconto"
        label="Modo"
        options={[
          { value: 'PRODUTO', label: 'Desconto por Produto' },
          { value: 'GERAL', label: 'Desconto Geral' },
        ]}
      />
      {modo === 'GRUPO' && (
        <AvisoDeCobertura>
          <p>
            Este pedido usa <strong>desconto por grupo de produto</strong>, e esta tela ainda não
            tem a grade que o edita. Os {grupos.length} grupos continuam gravados e são reenviados
            como estão — escolher um dos modos acima os substitui.
          </p>
        </AvisoDeCobertura>
      )}
      {modo === 'GRUPO' && grupos.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {grupos.map((g) => (
            <li key={g.productGroupId}>
              {g.productGroupName}: {formatPercent(g.discountPercent)} % —{' '}
              {formatMoneyBRL(g.discountCents)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Os totais que a tela mostra.
 *
 * A conta vem de `useTotaisDoOrcamento`, que é o MESMO cálculo que o combo de
 * condição de pagamento usa para decidir quais condições cabem — em duas
 * cópias, o dia em que o desconto mudar de fórmula deixa o combo oferecendo
 * parcelamento sobre um total que a grade não mostra mais.
 *
 * No modo GRUPO ele devolve o subtotal sem o desconto dos grupos, porque a
 * fórmula deles não está na tela. É a mesma razão de o aviso existir, e está
 * dito aqui em vez de calculado errado em silêncio.
 */
function TotaisDoPedido() {
  const modo = useWatch({ name: 'modoDesconto' }) as PedidoDeVenda['modoDesconto']
  const percentual = (useWatch({ name: 'descontoPercentual' }) as number) ?? 0

  if (modo === 'GRUPO') {
    return (
      <p className="text-sm text-muted-foreground">
        O desconto deste pedido é por grupo de produto e não entra no total abaixo.
      </p>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      Desconto geral:{' '}
      <output aria-label="Desconto percentual">
        {formatPercent(modo === 'GERAL' ? percentual : 0)}
      </output>{' '}
      %
    </p>
  )
}

function Cabecalho() {
  const { setValue } = useFormContext<PedidoDeVenda>()
  const [buscaClienteOpen, setBuscaClienteOpen] = useState(false)
  const [buscaProfissionalOpen, setBuscaProfissionalOpen] = useState(false)

  return (
    <>
      <Secao
        numero="01"
        titulo="Cliente & Obra"
        cor="id"
        icone={User}
        nota="para quem, e para qual obra"
      >
        <div className="grid grid-cols-12 items-end gap-3">
          <div className="col-span-12 sm:col-span-5">
            <div className="flex items-end gap-1">
              <TextField name="cliente" label="Cliente" className="campo-heroi flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBuscaClienteOpen(true)}
              >
                <User className="size-4" /> Cliente
              </Button>
            </div>
          </div>
          {/* `Consultor(a)` é LEITURA, e o campo diz isso ao ser `readOnly`.
              Duas coisas o tiraram da edição, e as duas são medidas:

              1. **O contrato**: `salespersonId` é o atendente `isPrincipal` da
                 participação (`OrderParticipantDto`), "não um segundo lugar
                 onde se grava". Quem muda o consultor é a grade de
                 participação, que tem percentual e vigência — trocar o nome
                 aqui deixaria a comissão apontando para quem saiu.
              2. **O campo mentia**: até aqui ele era um combo do lookup `CARGO`
                 rotulado `Consultor(a)`. O operador escolhia um CARGO, o valor
                 ia para `consultor` (o NOME), e `paraEscrita` nunca manda nome
                 nenhum — o servidor resolve o nome do id. Gravar e reabrir
                 devolvia o texto de antes, sem erro em lugar nenhum.

              O painel `ParticipacaoDoPedido`, abaixo do formulário, é onde a
              lista inteira aparece — é lá que o nome daqui vem. */}
          <TextField
            name="consultor"
            label="Consultor(a)"
            readOnly
            placeholder="Sem atendente principal"
            className="col-span-6 sm:col-span-3"
          />
          <div className="col-span-6 sm:col-span-4">
            <div className="flex items-end gap-1">
              <TextField
                name="profissionalExterno"
                label="Profissional Externo"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBuscaProfissionalOpen(true)}
              >
                <User className="size-4" /> Buscar
              </Button>
            </div>
          </div>
          <TextField
            name="descricaoObra"
            label="Descrição da Obra"
            className="col-span-12 sm:col-span-6"
          />
        </div>
        <OrigemDoPedido />
      </Secao>

      <Secao
        numero="02"
        titulo="Identificação"
        cor="info"
        icone={Hash}
        nota="números, datas e o que o documento é"
      >
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="numero" label="Código" className="col-span-6 sm:col-span-2" />
          <SelectField
            name="serie"
            label="Série"
            options={tabelas.series}
            className="col-span-6 sm:col-span-1"
          />
          <TextField name="numeroPasta" label="Nº Pasta" className="col-span-6 sm:col-span-2" />
          <DateField name="dataEmissao" label="Data Emissão" className="col-span-6 sm:col-span-2" />
          <DateField
            name="dataFechamento"
            label="Data Fechamento"
            className="col-span-6 sm:col-span-2"
          />
        </div>
        {/* O pedido NÃO tem Data Validade: proposta vence, pedido não. O campo
            some em vez de aparecer vazio — coluna que o DTO não tem sai da tela. */}
        <TipoDoDocumento />
      </Secao>

      <SearchDialog
        open={buscaClienteOpen}
        onOpenChange={setBuscaClienteOpen}
        title="Busca de Cliente"
        columns={colunasParceiro}
        queryKey={['busca-cliente-pedido-venda']}
        fetcher={(state) => data.clientes.list(state, 0)}
        onSelect={(c) => {
          // O ID vai junto com o nome, e é ele que o `PUT` manda. Setar só o
          // nome deixaria a tela mostrando um cliente e o corpo enviando outro
          // — ou nenhum, no documento novo, que é 400 na hora de gravar.
          setValue('cliente', c.legalName, { shouldDirty: true })
          setValue('clienteId', c.id, { shouldDirty: true })
          setBuscaClienteOpen(false)
        }}
      />
      <SearchDialog
        open={buscaProfissionalOpen}
        onOpenChange={setBuscaProfissionalOpen}
        title="Busca de Profissional Externo"
        columns={colunasParceiro}
        queryKey={['busca-profissional-pedido-venda']}
        fetcher={(state) => data.profissionais.list(state, 0)}
        onSelect={(p) => {
          setValue('profissionalExterno', p.legalName, { shouldDirty: true })
          setValue('profissionalId', p.id, { shouldDirty: true })
          setBuscaProfissionalOpen(false)
        }}
      />
    </>
  )
}

/**
 * O documento FECHADO não se edita, e quem diz isso é o contrato: `PUT` em
 * pedido concluído ou cancelado é 409. O aviso chega antes da recusa — deixar o
 * operador preencher a folha inteira para o servidor negar no `Gravar` é fazê-lo
 * perder o trabalho para descobrir uma regra que a tela já sabia.
 */
function SituacaoDoDocumento() {
  const situacao = useWatch({ name: 'situacao' }) as PedidoDeVenda['situacao']
  if (situacao === 'active') return null

  return (
    <AvisoDeCobertura>
      <p>
        Pedido {situacao === 'cancelled' ? 'cancelado' : 'concluído'}. O contrato recusa alteração
        em documento fechado (409), e as duas situações são terminais.
      </p>
    </AvisoDeCobertura>
  )
}

function AbaPrincipal() {
  return (
    <div data-zonas className="flex flex-col gap-4">
      <SituacaoDoDocumento />

      <DocumentoBloco className="flex flex-col gap-4">
        <Cabecalho />
        <Secao
          numero="03"
          titulo="Desconto"
          cor="warn"
          icone={Percent}
          nota="a regra que os itens herdam"
        >
          <ControlesDesconto />
        </Secao>
      </DocumentoBloco>

      <Secao numero="04" titulo="Itens" cor="info" icone={List} nota="o que vai no pedido">
        <ItensDoOrcamento rotuloDoTotal="Total do pedido" />
      </Secao>

      <Secao numero="05" titulo="Totais" cor="money" icone={Calculator} nota="o que o cliente paga">
        <TotaisDoPedido />
      </Secao>

      {/* 06 fecha a folha DEPOIS dos totais, e a ordem é a da conversa: o
          parcelamento só faz sentido sobre um total que já existe. */}
      <Secao
        numero="06"
        titulo="Pagamento"
        cor="money"
        icone={CreditCard}
        nota="quando o cliente paga"
      >
        <BlocoPagamento />
      </Secao>
    </div>
  )
}

/**
 * Abas não capturadas na transcrição (§10) — e uma que é AUSÊNCIA de backend.
 *
 * `Serviços` tem DTO no contrato (`OrderServiceItemDto`) e a folha o preserva,
 * mas a grade que o edita não existe aqui. As outras seguem sem captura.
 */
const ABAS_SEM_CAPTURA = [
  ['servicos', 'Serviços'],
  ['cliente', 'Cliente'],
  ['outrosDados', 'Outros Dados'],
] as const

export function PedidoDeVendaForm({
  pedido,
  readOnly = false,
}: { pedido: PedidoDeVenda; readOnly?: boolean }) {
  const navigate = useNavigate()
  const gravar = useGravarPedidoDeVenda()

  function onGravar(values: PedidoDeVenda) {
    // O id decide POST ou PUT, e quem decide é a fronteira. A navegação é do
    // SUCESSO: sair da tela depois de uma recusa mostraria o mesmo desfecho de
    // uma gravação que deu certo.
    gravar.mutate(values, {
      // O DESTINO é a regra única da #405 (`components/cabinet/pos-gravar.ts`):
      // documento novo abre o pedido que nasceu, alteração permanece na tela.
      onSuccess: posGravar<OrderDetailDto>({
        eraNovo: !values.id,
        abrirDocumento: (pedidoId) =>
          void navigate({ to: '/vendas/pedidos/$pedidoId', params: { pedidoId }, replace: true }),
      }),
    })
  }

  // Documento fechado é somente-leitura pela mesma regra do contrato que o
  // aviso explica — e aqui ela vira comportamento, não só texto.
  const fechado = pedido.situacao !== 'active'

  return (
    <CadastroForm
      schema={pedidoDeVendaSchema}
      defaultValues={pedido}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/vendas/pedidos' })}
      readOnly={readOnly || fechado}
      gravando={gravar.isPending}
      gravou={gravar.isSuccess}
      familia="orders"
    >
      {/* A recusa do servidor em destaque, ANTES das abas: o `detail` do
          problem+json é a frase que o backend escolheu para o caso, e sem ela o
          operador não sabe POR QUE o documento não gravou. */}
      <ErroDeGravacao
        mutacao={gravar}
        erro={gravar.error}
        mensagem="Não foi possível gravar o pedido de venda."
      />
      {/* As ações do CICLO ficam fora das abas, e acima delas: concluir,
          registrar o retorno da demonstração e transferir a indicação valem
          para o documento inteiro, não para a aba aberta. Elas também não
          passam pelo `Gravar` — são caminhos próprios do contrato, e o
          documento fechado, que não se edita, continua tendo histórico. */}
      <AcoesDoCiclo pedido={pedido} somenteLeitura={readOnly} />
      <Tabs defaultValue="principal">
        <AbasSemCaptura
          capturada={['principal', 'Principal']}
          abas={ABAS_SEM_CAPTURA}
          // A PARTICIPAÇÃO é aba de verdade: sub-recurso do contrato, com grade
          // e `PUT` próprios. Ela não entra no corpo do documento e por isso não
          // pode viver dentro de `AbaPrincipal`, onde o `Gravar` do rodapé
          // prometeria levá-la.
          adicionais={[
            {
              aba: ['participacao', 'Participação'],
              conteudo: (
                <ParticipacaoDoPedido pedidoId={pedido.id || null} readOnly={readOnly || fechado} />
              ),
            },
          ]}
        >
          <AbaPrincipal />
        </AbasSemCaptura>
      </Tabs>
    </CadastroForm>
  )
}

/** Reexportado para a listagem montar o rótulo da situação sem repetir o mapa. */
export const ROTULO_DA_SITUACAO: Record<PedidoDeVenda['situacao'], string> = {
  active: 'Em andamento',
  concluded: 'Concluído',
  cancelled: 'Cancelado',
}

/** Ícone do tipo, para a listagem distinguir demonstração de venda de relance. */
export const IconeDeDemonstracao = Truck
