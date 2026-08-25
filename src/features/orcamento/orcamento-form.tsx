import type { PartnerDto } from '@/api/gerado'
import { AbasSemCaptura } from '@/components/cabinet/abas-sem-captura'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { DocumentoBloco, fileirasTotais, totalItemCentavos } from '@/components/cabinet/documento'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import {
  DateField,
  LookupSelectField,
  RadioField,
  SelectField,
  TextField,
} from '@/components/cabinet/form-controls'
import { FormGrid, type FormGridRow } from '@/components/cabinet/form-grid'
import { Nome } from '@/components/cabinet/nome'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Secao } from '@/components/cabinet/secao'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { data } from '@/data'
import { useLookupOptions } from '@/data/lookups-api'
import { useGravarOrcamento } from '@/data/quotes-api'
import { tabelas } from '@/data/tabelas'
import { BlocoPagamento, useTotaisDoOrcamento } from '@/features/orcamento/bloco-pagamento'
import { formatMoneyBRL, formatPercent } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import type { Orcamento } from '@/mocks/orcamentos'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Calculator,
  CreditCard,
  FileText,
  Hash,
  Home,
  List,
  Lock,
  Package,
  Percent,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const orcamentoSchema = z.object({
  // Id de TEXTO desde a migração para `/api/quotes` (#134): o documento passou
  // a ter id de servidor. Era `z.number()`, e com string o `Gravar` reprovava
  // na validação sem dizer em qual campo — o id não aparece no formulário.
  id: z.string(),
  numero: z.string(),
  serie: z.string(),
  numeroPasta: z.string(),
  dataEmissao: z.string().nullable(),
  dataValidade: z.string().nullable(),
  dataFechamento: z.string().nullable(),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  // OS IDs PRECISAM ESTAR DECLARADOS, mesmo sem campo na tela: o Zod **remove**
  // o que não declara, e o que chega ao `onGravar` é o resultado do parse. Sem
  // esta linha o `PUT` — que é INTEGRAL — sairia com `customerId: undefined` e
  // apagaria o cliente do documento; a tela mostraria o nome o tempo todo,
  // porque o nome (`cliente`) está declarado e o id não estava. É a mesma regra
  // que o formulário da oportunidade escreve: todo campo do corpo de escrita
  // atravessa o formulário, inclusive o que ele não deixa editar.
  clienteId: z.string(),
  descricaoObra: z.string(),
  consultor: z.string().nullable(),
  consultorId: z.string().nullable(),
  profissionalExterno: z.string().nullable(),
  profissionalId: z.string().nullable(),
  // Situação do documento: não se edita aqui (muda por `/cancel`), mas some do
  // registro se não for declarada — e a ficha passaria a mostrar "aberto" para
  // um orçamento cancelado.
  cancelado: z.boolean(),
  // A CADEIA DE VERSÕES — declarada pela MESMA regra que `cancelado` logo
  // acima: todo campo do documento atravessa o formulário, inclusive o que ele
  // não deixa editar. Nenhum dos três sobe no corpo — `revision` e
  // `revisionOfId` não existem em `QuoteWriteRequest`, e quem move a cadeia é
  // `POST .../revise`.
  //
  // **MEDIDO: remover estas três linhas hoje não quebra nenhum caso.** A folha
  // exibe a revisão a partir da hidratação (`defaultValues`), e o parse do Zod
  // só roda no `submit` — depois do qual o `Gravar` navega de volta para a
  // listagem, então o registro podado nunca chega a ser desenhado. A declaração
  // fica porque é ela que segura o dia em que a folha PARAR de navegar no
  // sucesso: aí o registro pós-parse vira o que a tela mostra, e a revisão 2
  // reapareceria como original, com 200 e sem aviso. Escrever aqui que o
  // sintoma existe hoje seria afirmar o que a medição nega.
  revisao: z.number(),
  revisaoDeId: z.string().nullable(),
  revisaoDeNumero: z.string().nullable(),
  modoDesconto: z.enum(['PRODUTO', 'GERAL']),
  descontoPercentual: z.number(),
  // Os ambientes do documento — não se editam aqui, e ainda assim precisam ser
  // DECLARADOS, pela mesma razão de `cancelado` logo acima: o resolver estrai a
  // chave que o schema não conhece, e o que chega em `paraEscrita` é um
  // documento sem ambiente nenhum. Como o `PUT` é integral, gravar apagaria os
  // ambientes do orçamento a cada edição.
  ambientes: z.array(z.object({ codigo: z.string(), nome: z.string(), ordem: z.number() })),
  // O BLOCO PAGAMENTO inteiro, e os quatro campos pela MESMA razão de
  // `clienteId` acima — com um agravante MEDIDO: sem eles declarados, o Zod os
  // removia, e `paraEscrita` mandava `paymentTermId: undefined` num `PUT` que é
  // INTEGRAL. Abrir um documento com plano e clicar em `Gravar` sem editar nada
  // APAGAVA a condição de pagamento do documento, com 200 e sem aviso nenhum.
  //
  // Só o id é editável; os outros três são CARIMBO do servidor e voltam ao
  // formulário sem subirem no corpo (ver `paraEscrita`). Declará-los é o que os
  // mantém vivos entre a leitura e a gravação.
  condicaoPagamentoId: z.string().nullable(),
  condicaoPagamento: z.string().nullable(),
  parcelas: z.array(z.object({ number: z.number(), dueDate: z.string(), amountCents: z.number() })),
  // AUSENTE — e não `null` — no documento gravado antes de a política existir.
  // `.optional()` preserva a distinção que o contrato faz.
  politicaDeParcelamento: z
    .object({
      minTotalToInstallCents: z.number(),
      minInstallmentCents: z.number(),
      maxInstallments: z.number(),
    })
    .optional(),
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

const ITEM_VAZIO = {
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
 * Botões de inserção de item (§8.2). No legado são F5/F6; o CLAUDE.md veta
 * F3-F6 (conflito com browser), então valem Alt+A / Alt+P pelo registry.
 */
/**
 * A CADEIA DE VERSÕES do orçamento — de qual documento esta folha é revisão.
 *
 * O contrato resolve o NÚMERO do anterior no servidor (`revisionOfNumber`)
 * justamente para a tela dizer "revisão do orçamento 21653" sem uma segunda
 * consulta. Some no original: linha dizendo "Revisão 1, sem anterior" seria
 * ruído em todo orçamento comum, que é a esmagadora maioria deles.
 *
 * O elo é um LINK, e não texto: a pergunta que segue "esta é a revisão 2" é
 * sempre "e o que mudou da 1 para cá?", e a única resposta possível é abrir a
 * anterior. Escrever o número sem levar até lá obrigaria o operador a voltar
 * para a listagem e procurar um documento cujo número ele acabou de ler.
 */
function RevisaoDoOrcamento() {
  const revisao = useWatch({ name: 'revisao' }) as number
  const anteriorId = useWatch({ name: 'revisaoDeId' }) as string | null
  const anteriorNumero = useWatch({ name: 'revisaoDeNumero' }) as string | null
  if (!anteriorId) return null

  return (
    <p className="col-span-12 text-sm text-muted-foreground">
      <strong className="text-foreground">Revisão {revisao}</strong> — substitui o orçamento{' '}
      <Link
        to="/vendas/orcamentos/$orcamentoId"
        params={{ orcamentoId: anteriorId }}
        className="font-semibold underline underline-offset-2"
      >
        {anteriorNumero ?? anteriorId}
      </Link>
      , que continua na listagem como foi apresentado ao cliente.
    </p>
  )
}

function BotoesInsercao({ append }: { append: (row: FormGridRow) => void }) {
  const itens = (useWatch({ name: 'itens' }) ?? []) as unknown[]

  function inserirProduto() {
    append({ ...ITEM_VAZIO, item: String(itens.length + 1) })
  }

  function inserirAmbiente() {
    // Ambiente agrupa os itens da obra: entra como linha com ambiente definido.
    append({ ...ITEM_VAZIO, item: String(itens.length + 1), ambiente: tabelas.ambientes[0] })
  }

  useEffect(() => bindShortcut(SHORTCUTS.produto, inserirProduto))
  useEffect(() => bindShortcut(SHORTCUTS.ambiente, inserirAmbiente))
  useEffect(() =>
    bindShortcut(SHORTCUTS.imagemProduto, () => console.info('[mock] Mostrar imagem do produto')),
  )

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={inserirAmbiente}>
        <Home className="size-4" /> Ambiente <kbd>{shortcutLabel(SHORTCUTS.ambiente)}</kbd>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={inserirProduto}>
        <Package className="size-4" /> Produto <kbd>{shortcutLabel(SHORTCUTS.produto)}</kbd>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => console.info('[mock] Pré Produto (item fora do catálogo)')}
      >
        Pré Produto
      </Button>
    </>
  )
}

// Busca de cliente = `GET /api/partners?role=customer`. Chaves no nome do
// contrato porque viajam como `sortBy`.
/** Colunas de PARCEIRO — servem à busca de Cliente e à de Profissional Externo:
 * as duas são papéis do mesmo `GET /api/partners`, só o filtro `role` muda. */
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

function Cabecalho() {
  const { setValue } = useFormContext<Orcamento>()
  const [buscaClienteOpen, setBuscaClienteOpen] = useState(false)
  const [buscaProfissionalOpen, setBuscaProfissionalOpen] = useState(false)

  return (
    <>
      {/* FUSÃO v5 r4 (mockup): o formulário fala em SEÇÕES numeradas, e quem
          importa vem primeiro — Cliente & Obra antes da burocracia. */}
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
          {/* `[busca +...]` na transcrição (§8.2), não `[combo]` — ficou como
            `LookupSelectField kind="cargo"` por engano até esta correção: Cargo
            é a categoria de função trabalhista do Colaborador (§2), sem relação
            com "quem consultou a venda". O alvo certo segue sem tela própria
            identificável na transcrição (§10 não elucida), então o campo
            continua como estava até haver captura — só o TODO fica registrado. */}
          {/* TODO(transcricao): `Consultor(a)` é `[busca +...]` no legado; o
            cadastro que ela busca não foi identificado (§10). Não trocar por
            SearchDialog sem saber contra qual tabela. */}
          <LookupSelectField
            name="consultor"
            label="Consultor(a)"
            kind="cargo"
            className="col-span-6 sm:col-span-3"
          />
          {/* `Profissional Externo` é `[busca +...]` (§8.2), e o alvo É óbvio: o
            NOME bate literalmente com o cadastro já construído
            (`/cadastros/profissionais`). Estava como `LookupSelectField
            kind="profissional"` — a MESMA categoria genérica que o campo
            "Profissional" do Cliente usa (§5, "arquiteto"/"designer" como
            texto livre) — casando a PESSOA específica da obra com uma
            categoria solta. Corrigido para buscar a pessoa de verdade. */}
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
      </Secao>

      <Secao
        numero="02"
        titulo="Identificação"
        cor="info"
        icone={Hash}
        nota="números e datas do documento"
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
            name="dataValidade"
            label="Data Validade"
            className="col-span-6 sm:col-span-2"
          />
          <DateField
            name="dataFechamento"
            label="Data Fechamento"
            className="col-span-6 sm:col-span-2"
          />
          <RevisaoDoOrcamento />
        </div>
      </Secao>

      <SearchDialog
        open={buscaClienteOpen}
        onOpenChange={setBuscaClienteOpen}
        title="Busca de Cliente"
        columns={colunasParceiro}
        queryKey={['busca-cliente-orcamento']}
        fetcher={(state) => data.clientes.list(state, 0)}
        onSelect={(c) => {
          setValue('cliente', c.legalName, { shouldDirty: true })
          setBuscaClienteOpen(false)
        }}
      />
      <SearchDialog
        open={buscaProfissionalOpen}
        onOpenChange={setBuscaProfissionalOpen}
        title="Busca de Profissional Externo"
        columns={colunasParceiro}
        queryKey={['busca-profissional-orcamento']}
        fetcher={(state) => data.profissionais.list(state, 0)}
        onSelect={(p) => {
          setValue('profissionalExterno', p.legalName, { shouldDirty: true })
          setBuscaProfissionalOpen(false)
        }}
      />
    </>
  )
}

/** Desconto em 3 níveis (§8.2): por produto, por grupo e geral. */
function ControlesDesconto() {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <RadioField
        name="modoDesconto"
        label="Modo"
        options={[
          { value: 'PRODUTO', label: 'Desconto por Produto' },
          { value: 'GERAL', label: 'Desconto Geral' },
        ]}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => console.info('[mock] Desconto Grupo')}
      >
        Desconto Grupo
      </Button>
    </div>
  )
}

function TotaisOrcamento() {
  const percentual = (useWatch({ name: 'descontoPercentual' }) as number) ?? 0

  return (
    <Tabs defaultValue="venda">
      <TabsList className="flex-wrap">
        <TabsTrigger value="venda">Totais da Venda</TabsTrigger>
        <TabsTrigger value="impostos">Totais de Impostos</TabsTrigger>
        <TabsTrigger value="frete">Frete</TabsTrigger>
      </TabsList>
      <TabsContent value="venda">
        {/* Os totais em si são as últimas fileiras da grade (DESIGN.md
            §DocumentoTotais); aqui fica só o detalhe do desconto geral. */}
        <p className="text-sm text-muted-foreground">
          Desconto geral:{' '}
          <output aria-label="Desconto percentual">{formatPercent(percentual)}</output> %
        </p>
      </TabsContent>
      <TabsContent value="impostos">
        <p className="py-6 text-sm text-muted-foreground">
          Aba Totais de Impostos não capturada na transcrição do SoftLux (§10).
        </p>
      </TabsContent>
      <TabsContent value="frete">
        <p className="py-6 text-sm text-muted-foreground">
          Aba Frete não capturada na transcrição do SoftLux (§10).
        </p>
      </TabsContent>
    </Tabs>
  )
}

/** Grade de itens com os totais nas últimas fileiras (DESIGN.md §DocumentoTotais). */
function GradeItens() {
  // A coluna `Tipo de Peça` é um kind do servidor; as demais são tabelas locais
  // que o contrato não expõe como lista de apoio.
  // A célula da GRADE continua guardando o NOME, e é a única exceção à
  // migração para id da issue #94: o `select` da `FormGrid` recebe
  // `readonly string[]` e é compartilhado com colunas de lista estática. Passar
  // id ali exigiria a grade inteira aprender pares valor/rótulo — mudança de
  // componente compartilhado, não desta tela. O item do orçamento é mock e não
  // viaja para o contrato, então nada se traduz no submit; fica anotado.
  const { options: opcoesDeTipoDePeca } = useLookupOptions('tipoPeca')
  const tiposDePeca = opcoesDeTipoDePeca.map((o) => o.nome)
  // A conta dos totais mora em `useTotaisDoOrcamento` (bloco-pagamento.tsx)
  // porque DUAS partes da tela dependem dela: o pé desta grade e o combo de
  // condição de pagamento, que decide quais condições cabem no total. Em duas
  // cópias, o dia em que o desconto mudar de fórmula deixa o combo oferecendo
  // parcelamento sobre um total que a grade não mostra mais.
  const { subtotalCentavos: subtotal, descontoGeralCentavos: descontoGeral } =
    useTotaisDoOrcamento()

  return (
    <FormGrid
      name="itens"
      hideAdd
      actions={(append) => <BotoesInsercao append={append} />}
      columns={[
        { key: 'item', label: 'Item' },
        { key: 'codigoFornecedor', label: 'Código Fornecedor' },
        { key: 'descricaoFornecedor', label: 'Descrição do Fornecedor', voz: 'produto' },
        { key: 'ambiente', label: 'Ambiente', type: 'select', options: tabelas.ambientes },
        { key: 'acabamento', label: 'Acabamento', type: 'select', options: tabelas.acabamentos },
        { key: 'tamanho', label: 'Tamanho' },
        { key: 'quantidade', label: 'Quant.' },
        { key: 'unidade', label: 'Und.', type: 'select', options: tabelas.unidades },
        { key: 'valorUnitarioCentavos', label: 'Valor Unit.', type: 'money' },
        { key: 'descontoPercentual', label: 'Desc. %', type: 'percent' },
        {
          key: 'valorItem',
          label: 'Valor Item',
          type: 'computed',
          compute: (row: FormGridRow) => formatMoneyBRL(totalItemCentavos(row)),
        },
        { key: 'grupoProduto', label: 'Grupo Produto' },
        {
          key: 'tipoPeca',
          label: 'Tipo de Peça',
          type: 'select',
          options: tiposDePeca,
        },
        { key: 'fornecedor', label: 'Fornecedor', voz: 'nome' },
      ]}
      newRow={ITEM_VAZIO}
      totals={{
        valueColumnKey: 'valorItem',
        rows: fileirasTotais(subtotal, [
          { label: 'Desconto', valorCentavos: descontoGeral, sinal: -1 },
        ]),
      }}
    />
  )
}

function AbaPrincipal() {
  return (
    <div data-zonas className="flex flex-col gap-4">
      {/* Card agrupador (mockup `.card`): o CABEÇALHO do documento — para quem,
          que números, que regra de desconto — vive num pano só. Itens e Totais
          ficam de fora porque são os dois blocos que o operador olha sozinhos. */}
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

        {/* r5: nota de rodapé fala na voz editorial (serifa itálica) — degrau
            tipográfico das referências para o que é conselho, não dado. */}
        <p className="font-[family-name:var(--font-nome)] text-[0.9375rem] text-muted-foreground italic">
          Tecle {shortcutLabel(SHORTCUTS.imagemProduto)} para mostrar imagem do produto.
        </p>
      </DocumentoBloco>

      {/* 04 e 05 fecham a numeração do mockup (01–05). A cor é de ZONA, não de
          módulo: o mockup tem cinco matizes e o repo tem quatro empregos fixos
          (`id`/`info`/`warn`/`money`), então quem separa Identificação de Itens
          é o ORDINAL, não um quinto tom inventado para a ocasião. */}
      <Secao numero="04" titulo="Itens" cor="info" icone={List} nota="o que vai no orçamento">
        <GradeItens />
      </Secao>

      <Secao numero="05" titulo="Totais" cor="money" icone={Calculator} nota="o que o cliente paga">
        <TotaisOrcamento />
      </Secao>

      {/* 06 fecha a folha DEPOIS dos totais, e a ordem é a da conversa: o
          parcelamento só faz sentido sobre um total que já existe — é também a
          ordem da aba `Pagamento` do legado, que vem depois de `Itens`. Zona
          `money` porque o assunto é quanto e quando o cliente paga. */}
      <Secao
        numero="06"
        titulo="Pagamento"
        cor="money"
        icone={CreditCard}
        nota="quando o cliente paga"
      >
        <BlocoPagamento />
      </Secao>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Imprimir Orçamento')}
        >
          <FileText className="size-4" /> Orçamento
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Estoque')}
        >
          <Package className="size-4" /> Estoque
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Alterar Limites')}
        >
          Alterar Limites
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Permissões')}
        >
          <Lock className="size-4" /> Permissões
        </Button>
      </div>
    </div>
  )
}

/** Abas superiores não capturadas — §10. */
const ABAS_SEM_CAPTURA = [
  ['servicos', 'Serviços'],
  ['cliente', 'Cliente'],
  ['pagamento', 'Pagamento'],
  ['outrosDados', 'Outros Dados'],
] as const

export function OrcamentoForm({
  orcamento,
  readOnly = false,
}: { orcamento: Orcamento; readOnly?: boolean }) {
  const navigate = useNavigate()
  const gravar = useGravarOrcamento()

  function onGravar(values: Orcamento) {
    // O id decide POST ou PUT, e quem decide é a fronteira — ver
    // `useGravarOrcamento`. A navegação é do SUCESSO: sair da tela depois de uma
    // recusa mostraria o mesmo desfecho de uma gravação que deu certo, que é
    // exatamente o defeito que este trecho tinha (`console.info` + navigate).
    gravar.mutate(values, {
      onSuccess: () => void navigate({ to: '/vendas/orcamentos' }),
    })
  }

  return (
    <CadastroForm
      schema={orcamentoSchema}
      defaultValues={orcamento}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/vendas/orcamentos' })}
      readOnly={readOnly}
      gravando={gravar.isPending}
      familia="quotes"
    >
      {/* A recusa do servidor em destaque, ANTES das abas (#138): o `detail` do
          problem+json é a frase que o backend escolheu para o caso, e sem ela o
          operador não sabe POR QUE o documento não gravou. Sem mapa de campos —
          o orçamento não tem, no contrato, validação por campo que a tela saiba
          apontar; inventar o mapa daria link para campo que o formulário não
          registra, que é link morto sem aviso. */}
      <ErroDeGravacao
        mutacao={gravar}
        erro={gravar.error}
        mensagem="Não foi possível gravar o orçamento."
      />
      <Tabs defaultValue="principal">
        <AbasSemCaptura capturada={['principal', 'Principal']} abas={ABAS_SEM_CAPTURA}>
          <AbaPrincipal />
        </AbasSemCaptura>
      </Tabs>
    </CadastroForm>
  )
}
