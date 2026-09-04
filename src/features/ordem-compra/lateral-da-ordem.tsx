import { Andamento, type EventoDeAndamento } from '@/components/cabinet/andamento'
import { CartaoLateral } from '@/components/cabinet/cartao-lateral'
import { Nome } from '@/components/cabinet/nome'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { data } from '@/data'
import type { LinhaComCusto, OrdemDeCompra } from '@/data/compras-api'
import { faltaParaOMinimo } from '@/data/compras-api'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useCondicoesDePagamento } from '@/data/pagamento-api'
import { formatMoneyBRL } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import type { Transportadora } from '@/mocks/transportadoras'
import type { ColumnDef } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { OrdemNoFormulario } from './ordem-compra-form'

/**
 * A LATERAL da ordem de compra (Reface 2.0, D18).
 *
 * O que mudou de fato: o com-quem/como/quando-chega deixou de ser seção
 * numerada empilhada no meio do formulário e virou coluna de consulta. A ordem
 * de compra é o documento onde isso mais pesava — o operador que abre uma ordem
 * enviada não vai editar nada (o `PUT` é 409), ele quer saber se já foi, para
 * quando ficou e quem leva. Essas quatro respostas estavam espalhadas por
 * quatro seções e uma aba.
 *
 * Os quatro cartões e as quatro tintas são o mapa de assunto:
 * `lilac` de quem se compra · `mint` onde o documento está · `sky` quem leva ·
 * `sand` como se paga.
 *
 * ## O que saiu da coluna principal
 *
 * A aba `Pagamento` deixou de existir — condição de pagamento é UM campo, e uma
 * aba inteira para ele obrigava a trocar de tela para ler o que cabe num
 * cartão. Pelo mesmo motivo saíram a seção `Fornecedor & Compra` e o bloco
 * `Transportadora`: o formulário principal ficou com o que se PREENCHE (itens,
 * ajustes, datas do documento), a lateral com o que se CONSULTA.
 */

/**
 * O ANDAMENTO derivado do próprio documento — não há `audit_log` no contrato.
 *
 * E não é remendo à espera dele: a ordem de compra registra as três transições
 * que importam em campos próprios (`dataOrdem`, `dataEnvio`, `dataPrevista` /
 * `dataReagendada`), e `situacao` diz qual delas já aconteceu. Inventar um log
 * de eventos no mock ao lado desses campos criaria duas versões da mesma
 * verdade, e a do mock seria a bonita.
 *
 * **Exatamente UM evento é `atual`**, e é isso que a peça existe para dizer.
 * Ordem enviada para no `Chegada prevista`: o contrato da ordem não tem
 * situação de recebida (o recebimento é outro documento), então a etapa fica
 * aberta em vez de fingir conclusão.
 */
export function andamentoDaOrdem(ordem: OrdemDeCompra): EventoDeAndamento[] {
  // Ordem que ainda não foi gravada não tem passado nenhum: o próprio ato de
  // abrir é a etapa corrente.
  const nova = !ordem.id
  const eventos: EventoDeAndamento[] = [
    {
      id: 'aberta',
      titulo: 'Ordem aberta',
      data: ordem.dataOrdem,
      estado: nova ? 'atual' : 'feito',
    },
  ]

  if (ordem.situacao === 'cancelled') {
    if (ordem.dataEnvio) {
      eventos.push({
        id: 'enviada',
        titulo: 'Enviada ao fornecedor',
        data: ordem.dataEnvio,
        estado: 'feito',
      })
    }
    // A chegada some do cancelamento em vez de virar `futuro`: etapa apagada
    // que continua desenhada promete uma entrega que ninguém vai fazer.
    eventos.push({ id: 'cancelada', titulo: 'Ordem cancelada', estado: 'atual' })
    return eventos
  }

  const enviada = ordem.situacao === 'sent'
  eventos.push({
    id: 'enviada',
    titulo: 'Enviada ao fornecedor',
    data: ordem.dataEnvio,
    estado: enviada ? 'feito' : nova ? 'futuro' : 'atual',
  })

  // A REPROMETIDA vence a original na linha, e o motivo vai junto — sem ele a
  // data nova aparece como se sempre tivesse sido aquela.
  const reagendada = Boolean(ordem.dataReagendada)
  eventos.push({
    id: 'chegada',
    titulo: reagendada ? 'Chegada reprometida' : 'Chegada prevista',
    data: ordem.dataReagendada ?? ordem.dataPrevista,
    motivo: reagendada ? ordem.motivoDoReagendamento : null,
    estado: enviada ? 'atual' : 'futuro',
  })

  return eventos
}

const colunasDeFornecedor: ColumnDef<{
  id: string
  code?: string | null
  legalName?: string | null
  minimumBillingCents?: number | null
}>[] = [
  { accessorKey: 'code', header: 'Código' },
  {
    accessorKey: 'legalName',
    header: 'Fornecedor',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'minimumBillingCents',
    header: 'Faturamento mínimo',
    cell: ({ getValue }) => {
      const centavos = getValue<number | null>()
      return centavos === null || centavos === undefined ? '—' : formatMoneyBRL(centavos)
    },
  },
]

const colunasDeTransportadora: ColumnDef<Transportadora>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  {
    accessorKey: 'nome',
    header: 'Transportadora',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  { accessorKey: 'municipio', header: 'Município' },
  { accessorKey: 'uf', header: 'UF' },
]

/**
 * FORNECEDOR (lilac) — de quem se compra, por qual empresa, e a régua do mínimo.
 *
 * O mínimo é ECOADO na emissão (`minimumBillingCents`) e a partir daí é cópia
 * congelada: mudar o cadastro do fornecedor amanhã não muda a régua desta
 * ordem. Enquanto a ordem não existe, a tela usa o do cadastro — é a única
 * forma de avisar ANTES de gravar, que é quando o aviso ainda serve.
 *
 * Trocar o fornecedor com linhas na grade não é permitido: as linhas vieram de
 * pedidos DAQUELE fornecedor, e a ordem de outro com as mesmas linhas seria
 * recusada pelo servidor com uma frase que não fala de fornecedor nenhum.
 */
function CartaoDoFornecedor({ bloqueado }: { bloqueado: boolean }) {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const { empresas, ativa } = useEmpresasDaSessao()
  const fornecedor = useWatch({ name: 'fornecedor' }) as string
  const empresaEscolhida = useWatch({ name: 'empresaCompradoraId' }) as string
  const itens = (useWatch({ name: 'itens' }) as { linha: number }[] | undefined) ?? []
  const minimo = useWatch({ name: 'faturamentoMinimoCentavos' }) as number | null
  const [buscaAberta, setBuscaAberta] = useState(false)

  const temLinhas = itens.length > 0

  // Ordem nova nasce comprando pela empresa ATIVA — é o caso comum, e deixar o
  // campo vazio faria toda ordem começar com um 400 esperando o operador.
  useEffect(() => {
    if (!empresaEscolhida && ativa) {
      setValue('empresaCompradoraId', ativa.tenantId, { shouldDirty: false })
      setValue('empresaCompradora', ativa.name ?? '', { shouldDirty: false })
    }
  }, [empresaEscolhida, ativa, setValue])

  return (
    <CartaoLateral
      titulo="Fornecedor"
      tint="lilac"
      pares={[
        {
          rotulo: 'Nome',
          valor: (
            <output aria-label="Fornecedor da ordem">
              {fornecedor ? <Nome>{fornecedor}</Nome> : '—'}
            </output>
          ),
        },
        ...(minimo === null || minimo === undefined
          ? []
          : [
              {
                rotulo: 'Faturamento mínimo',
                valor: (
                  <output aria-label="Faturamento mínimo" className="t-dado">
                    {formatMoneyBRL(minimo)}
                  </output>
                ),
              },
            ]),
      ]}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="empresa-compradora">Empresa Compradora</Label>
        <select
          id="empresa-compradora"
          className="flex h-9 w-full border-2 border-input px-2.5 py-1 t-ui outline-none focus-visible:focus-ring"
          value={empresaEscolhida ?? ''}
          onChange={(evento) => {
            const empresa = empresas.find((e) => e.tenantId === evento.target.value)
            setValue('empresaCompradoraId', evento.target.value, { shouldDirty: true })
            setValue('empresaCompradora', empresa?.name ?? '', { shouldDirty: true })
          }}
        >
          <option value="">Selecione…</option>
          {empresas.map((e) => (
            <option key={e.tenantId} value={e.tenantId}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={bloqueado || temLinhas}
        title={
          temLinhas
            ? 'A ordem já tem linhas de pedidos deste fornecedor. Remova as linhas para trocar.'
            : undefined
        }
        onClick={() => setBuscaAberta(true)}
      >
        <Search className="size-4" /> Escolher fornecedor
      </Button>

      {/* O aviso do mínimo continua ao lado do número que ele julga — a versão
          anterior o deixava numa seção e o valor noutra, e o operador tinha de
          juntar os dois de memória. A conta é a MESMA do contrato (§7.1): soma
          das linhas, sem o acréscimo — frete e taxa não contam para o mínimo, e
          somá-los liberaria uma ordem que o servidor recusa com 409. */}
      <FaltaParaOMinimo />

      <SearchDialog
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="Busca de Fornecedor"
        columns={colunasDeFornecedor}
        queryKey={['fornecedores', 'ordem-de-compra']}
        fetcher={(state) => data.fornecedores.list(state)}
        onSelect={(f) => {
          setValue('fornecedorId', f.id, { shouldDirty: true })
          setValue('fornecedor', f.legalName ?? '', { shouldDirty: true })
          // O mínimo do CADASTRO enquanto a ordem não tem o seu; depois da
          // emissão o servidor devolve o congelado e este valor é sobrescrito.
          setValue('faturamentoMinimoCentavos', f.minimumBillingCents ?? null, {
            shouldDirty: true,
          })
        }}
      />
    </CartaoLateral>
  )
}

/**
 * Quanto FALTA para o mínimo — peça própria porque é uma REGIÃO VIVA: ela
 * muda a cada linha somada na grade, e um `<output>` que anuncia sozinho é o
 * que faz o leitor de tela ouvir a mudança sem varrer o cartão inteiro.
 *
 * Devolve `null` quando não há mínimo, em vez de o chamador perguntar: o
 * fornecedor sem faturamento mínimo é o caso comum, e a pergunta repetida no
 * cartão já tinha duplicado a conta uma vez.
 */
function FaltaParaOMinimo() {
  const minimo = useWatch({ name: 'faturamentoMinimoCentavos' }) as number | null
  const itens = (useWatch({ name: 'itens' }) as LinhaComCusto[] | undefined) ?? []

  if (minimo === null || minimo === undefined) return null
  const falta = faltaParaOMinimo({ faturamentoMinimoCentavos: minimo, itens })

  return falta === null ? (
    <p className="t-meta">Mínimo atingido.</p>
  ) : (
    // `<output>` e não `<span role="status">`: o elemento semântico já É a
    // região viva, e o biome recusa o papel posto à mão.
    <output className="t-meta text-warn" aria-label="Falta para o mínimo">
      Faltam {formatMoneyBRL(falta)} para o mínimo — o fornecedor recusa a ordem abaixo dele.
    </output>
  )
}

/** ANDAMENTO (mint) — onde este documento parou. */
function CartaoDoAndamento({ ordem }: { ordem: OrdemDeCompra }) {
  return (
    <CartaoLateral titulo="Andamento" tint="mint">
      <Andamento eventos={andamentoDaOrdem(ordem)} />
    </CartaoLateral>
  )
}

/** TRANSPORTADORA (sky) — quem leva. */
function CartaoDaTransportadora() {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const transportadora = useWatch({ name: 'transportadora' }) as string | null
  const [buscaAberta, setBuscaAberta] = useState(false)

  useEffect(() => bindShortcut(SHORTCUTS.transportadora, () => setBuscaAberta(true)))

  return (
    <CartaoLateral
      titulo="Transportadora"
      tint="sky"
      pares={[
        {
          rotulo: 'Nome',
          valor: (
            <output aria-label="Nome da transportadora">
              {transportadora ? <Nome>{transportadora}</Nome> : '—'}
            </output>
          ),
        },
      ]}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setBuscaAberta(true)}
      >
        <Search /> Busca <kbd>{shortcutLabel(SHORTCUTS.transportadora)}</kbd>
      </Button>
      <SearchDialog
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="Busca de Transportadora"
        columns={colunasDeTransportadora}
        queryKey={['transportadoras']}
        fetcher={(state) => data.transportadoras.list(state)}
        onSelect={(t) => {
          // A transportadora é PARCEIRO no contrato (`carrierId`), e a tabela de
          // apoio daqui não tem o id dele. Enquanto o cadastro de
          // transportadoras não existir como parceiro, o nome viaja para a tela
          // e o `carrierId` continua nulo: id inventado casaria com parceiro
          // que não existe, e o servidor recusaria a ordem inteira por causa da
          // transportadora.
          setValue('transportadora', t.nome, { shouldDirty: true })
        }}
      />
    </CartaoLateral>
  )
}

/**
 * PAGAMENTO (sand) — só a escolha da condição.
 *
 * O parcelamento do documento de COMPRA não está no contrato (a ordem não
 * publica `paymentInstallments`), e desenhar parcelas aqui seria inventar do
 * lado do cliente uma conta que ninguém decidiu.
 */
function CartaoDoPagamento() {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const { condicoes, carregando } = useCondicoesDePagamento()
  const escolhida = useWatch({ name: 'condicaoPagamentoId' }) as string | null
  const nomeCarimbado = useWatch({ name: 'condicaoPagamento' }) as string | null

  return (
    <CartaoLateral titulo="Pagamento" tint="sand">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="condicao-pagamento">Condição de pagamento</Label>
        <select
          id="condicao-pagamento"
          className="flex h-9 w-full border-2 border-input px-2.5 py-1 t-ui outline-none focus-visible:focus-ring"
          value={escolhida ?? ''}
          disabled={carregando}
          onChange={(evento) => {
            const condicao = condicoes.find((c) => c.id === evento.target.value)
            setValue('condicaoPagamentoId', evento.target.value || null, { shouldDirty: true })
            setValue('condicaoPagamento', condicao?.name ?? null, { shouldDirty: true })
          }}
        >
          <option value="">Sem condição definida</option>
          {condicoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {/* A condição CARIMBADA continua legível mesmo se tiver sido desativada
          depois — o combo só oferece as ativas, e sem esta linha o documento
          antigo pareceria estar sem condição nenhuma. */}
      {nomeCarimbado && !condicoes.some((c) => c.id === escolhida) ? (
        <p className="t-meta">
          Condição carimbada no documento: <Nome>{nomeCarimbado}</Nome>
        </p>
      ) : null}
    </CartaoLateral>
  )
}

export function LateralDaOrdem({ ordem }: { ordem: OrdemDeCompra }) {
  const enviada = ordem.situacao === 'sent'

  return (
    // Irmãos separados por `gap` (`--s-4`), nunca por linha: entre cartões de
    // assunto a fronteira já é o tint de cada um.
    <aside aria-label="Apoio da ordem" className="flex flex-col gap-4">
      <CartaoDoFornecedor bloqueado={enviada} />
      <CartaoDoAndamento ordem={ordem} />
      <CartaoDaTransportadora />
      <CartaoDoPagamento />
    </aside>
  )
}
