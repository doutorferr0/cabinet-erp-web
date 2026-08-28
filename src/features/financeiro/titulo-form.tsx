import type { FinancialTitleDto, PartnerDto } from '@/api/gerado'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { DateField, TextField } from '@/components/cabinet/form-controls'
import { FormGrid } from '@/components/cabinet/form-grid'
import { Nome } from '@/components/cabinet/nome'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Secao } from '@/components/cabinet/secao'
import { Button } from '@/components/ui/button'
import { data } from '@/data'
import { type Direcao, useGravarTitulo } from '@/data/financeiro-api'
import { diaLocalISO } from '@/lib/datas'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Hash, User } from 'lucide-react'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'

/**
 * O FORMULÁRIO DO TÍTULO — a conta a pagar ou a receber, com as parcelas.
 *
 * `POST`/`PUT /api/financial-titles`, e o `PUT` substitui o registro INTEIRO,
 * parcelas junto: parcela ausente do corpo é parcela apagada. Por isso a grade
 * edita a lista completa e não um delta.
 *
 * ## As parcelas vêm da TELA, e não de um `paymentTermId` expandido no servidor
 *
 * A condição de pagamento sugere o plano; o que se grava é o que o operador
 * aceitou. No financeiro a parcela negociada quase nunca é a calculada — o
 * fornecedor concede mais um dia, o cliente pede a metade para a semana que vem
 * —, e um plano recalculado no servidor apagaria a negociação sem avisar.
 *
 * ## O que a tela NÃO oferece, e por quê
 *
 * **Espécie do documento, plano de contas e centro de custo.** Os três estão no
 * DTO e os três dependem de cadastro que o contrato ainda não publica
 * (`Tipo_documento`, `cost_centers`) ou que muda de significado entre as pontas
 * (`chartAccountId` referencia tabelas diferentes no título e no movimento —
 * dívida escrita na migração `0065` do api). Campo em branco que grava `null`
 * seria pior: o operador preencheria uma vez e não entenderia por que sumiu.
 *
 * **A situação e o número.** Os dois são do servidor — número é sequência POR
 * DIREÇÃO e situação muda por baixa e por `cancel`.
 */

const parcelaSchema = z.object({
  dueDate: z.string().min(1, 'Informe o vencimento.'),
  amountCents: z.number().nullable(),
  documentNumber: z.string(),
  /** Só leitura — o que já foi baixado nesta parcela. */
  settledCents: z.number(),
})

/**
 * A BAIXA como o formulário a carrega — leitura, nunca edição.
 *
 * Está no schema do form porque viaja com o documento: a tela abre o título uma
 * vez e mostra a conta E o extrato dela. Não se edita nem se apaga (o módulo não
 * tem `DELETE`), e por isso nenhum campo daqui vira controle.
 */
const baixaSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  settledOn: z.string(),
  amountCents: z.number(),
  paidCents: z.number(),
})

const tituloSchema = z.object({
  id: z.string(),
  direction: z.enum(['payable', 'receivable']),
  number: z.string(),
  status: z.string(),
  documentNumber: z.string(),
  partnerId: z.string().min(1, 'Escolha a parte do título.'),
  partnerName: z.string(),
  issuedAt: z.string().min(1, 'Informe a emissão.'),
  competenceMonth: z.string(),
  notes: z.string(),
  parcelas: z.array(parcelaSchema).min(1, 'O título tem ao menos uma parcela.'),
  baixas: z.array(baixaSchema),
})

export type TituloEmEdicao = z.infer<typeof tituloSchema>

/**
 * O DTO do servidor → a forma que o formulário edita.
 *
 * Não é tradução de vocabulário — os nomes continuam os do contrato. O que muda
 * é a FORMA: `null` vira `''` porque `<input>` controlado não aceita `null`, e
 * as parcelas viram linhas de grade com o que já foi baixado ao lado.
 */
export function paraEdicao(dto: FinancialTitleDto): TituloEmEdicao {
  return {
    id: dto.id,
    direction: dto.direction,
    number: dto.number,
    status: dto.status,
    documentNumber: dto.documentNumber ?? '',
    partnerId: dto.partnerId,
    partnerName: dto.partnerName,
    issuedAt: dto.issuedAt,
    competenceMonth: dto.competenceMonth ?? '',
    notes: dto.notes ?? '',
    parcelas: dto.installments.map((p) => ({
      dueDate: p.dueDate,
      amountCents: p.amountCents,
      documentNumber: p.documentNumber ?? '',
      settledCents: p.settledCents,
    })),
    baixas: dto.installments.flatMap((p) =>
      (p.settlements ?? []).map((b) => ({
        id: b.id,
        sequence: p.sequence,
        settledOn: b.settledOn,
        amountCents: b.amountCents,
        paidCents: b.paidCents,
      })),
    ),
  }
}

/** Um título em branco do lado pedido — o `Incluir` não espera rede. */
export function tituloVazio(direction: Direcao): TituloEmEdicao {
  const hoje = diaLocalISO()
  return {
    id: '',
    direction,
    number: '',
    status: 'open',
    documentNumber: '',
    partnerId: '',
    partnerName: '',
    issuedAt: hoje,
    competenceMonth: '',
    notes: '',
    // Título à vista é título de UMA parcela, e não título sem parcela: sem
    // isso, quitar à vista precisaria de um caminho próprio.
    parcelas: [{ dueDate: hoje, amountCents: null, documentNumber: '', settledCents: 0 }],
    baixas: [],
  }
}

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

function Cabecalho({ direcao }: { direcao: Direcao }) {
  const { setValue } = useFormContext<TituloEmEdicao>()
  const [buscaAberta, setBuscaAberta] = useState(false)
  const partnerName = useWatch<TituloEmEdicao>({ name: 'partnerName' }) as string
  const rotuloDaParte = direcao === 'payable' ? 'Fornecedor' : 'Cliente'

  return (
    <>
      <Secao
        numero="01"
        titulo="A conta"
        cor="info"
        icone={User}
        nota="de quem se deve, ou quem deve"
      >
        <div className="grid grid-cols-12 items-end gap-3">
          <CampoComBusca
            label={rotuloDaParte}
            // O `ariaLabel` do `CampoComBusca` é o do BOTÃO da lupa — "Buscar
            // Fornecedor" diz o que ele faz; só "Fornecedor" nomearia a lupa
            // como se ela fosse o campo.
            ariaLabel={`Buscar ${rotuloDaParte}`}
            className="col-span-12 sm:col-span-6"
            onBuscar={() => setBuscaAberta(true)}
          >
            {/* O nome é só LEITURA aqui: quem manda é o `partnerId`, e um campo
                de texto livre deixaria o nome divergir do id escolhido — que é
                o par que o servidor confere contra o papel da direção. */}
            <output className="flex h-9 flex-1 items-center rounded-md border border-input px-3 text-sm">
              {partnerName || <span className="text-muted-foreground">Nenhum escolhido</span>}
            </output>
          </CampoComBusca>
          <TextField
            name="documentNumber"
            label="Nº do documento"
            className="col-span-6 sm:col-span-3"
          />
          <TextField name="notes" label="Observação" className="col-span-12 sm:col-span-9" />
        </div>
      </Secao>

      <Secao
        numero="02"
        titulo="Datas"
        cor="info"
        icone={CalendarDays}
        nota="emissão e competência"
      >
        <div className="grid grid-cols-12 items-end gap-3">
          <DateField name="issuedAt" label="Emissão" className="col-span-6 sm:col-span-3" />
          {/* Competência é o MÊS: o servidor recusa dia diferente de 1, porque
              a despesa de dezembro paga em janeiro pertence a dezembro no
              resultado — e duas linhas do mesmo mês competiriam. */}
          <TextField
            name="competenceMonth"
            label="Competência (AAAA-MM-01)"
            className="col-span-6 sm:col-span-3"
          />
        </div>
      </Secao>

      <SearchDialog
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title={`Busca de ${rotuloDaParte}`}
        columns={colunasParceiro}
        queryKey={['busca-parte-titulo', direcao]}
        fetcher={(state) =>
          direcao === 'payable' ? data.fornecedores.list(state, 0) : data.clientes.list(state, 0)
        }
        onSelect={(p) => {
          setValue('partnerId', p.id, { shouldDirty: true })
          setValue('partnerName', p.legalName, { shouldDirty: true })
          setBuscaAberta(false)
        }}
      />
    </>
  )
}

/**
 * A GRADE DE PARCELAS — padrão 6 (grade no formulário).
 *
 * O rodapé soma o LANÇADO, e a soma é derivada das linhas: um campo de total
 * paralelo divergiria da grade na primeira edição, e o servidor não arredonda
 * diferença.
 */
function Parcelas() {
  const parcelas = (useWatch({ name: 'parcelas' }) ?? []) as {
    amountCents: number | null
    settledCents: number
  }[]
  const total = parcelas.reduce((soma, p) => soma + (p.amountCents ?? 0), 0)
  const baixado = parcelas.reduce((soma, p) => soma + (p.settledCents ?? 0), 0)

  return (
    <Secao numero="03" titulo="Parcelas" cor="money" icone={Hash} nota="o que vence, e quando">
      <FormGrid
        name="parcelas"
        addLabel="Incluir parcela"
        newRow={{
          dueDate: diaLocalISO(),
          amountCents: null,
          documentNumber: '',
          settledCents: 0,
        }}
        columns={[
          // Sem coluna `Nº`: a sequência da parcela é a POSIÇÃO da linha, e o
          // submit a atribui por índice. Como campo, ela custou caro — o
          // `<input>` da célula devolve TEXTO, o Zod recusava
          // `expected number, received string` e o formulário parava de gravar
          // em silêncio, porque erro de linha de grade não tem onde aparecer.
          // Número que o operador não digita não é campo.
          { key: 'dueDate', label: 'Vencimento', type: 'date' },
          { key: 'amountCents', label: 'Valor', type: 'money' },
          { key: 'documentNumber', label: 'Documento' },
          {
            key: 'settledCents',
            label: 'Baixado',
            type: 'computed',
            compute: (linha) => formatMoneyBRL(Number(linha.settledCents ?? 0)),
          },
        ]}
        totals={{
          valueColumnKey: 'amountCents',
          rows: [
            ...(baixado > 0 ? [{ label: 'Já baixado', valorCentavos: baixado }] : []),
            { label: 'Total do título', valorCentavos: total, destaque: true },
          ],
        }}
      />
    </Secao>
  )
}

/**
 * As BAIXAS já lançadas — só leitura, e é o extrato do título.
 *
 * Fica FORA da grade de parcelas de propósito: a grade é o que se edita, e a
 * baixa não se edita nem se apaga (não há `DELETE` no módulo). Misturar as duas
 * ofereceria uma linha de dinheiro andado com cara de campo.
 */
function BaixasDoTitulo({ baixas }: { baixas: TituloEmEdicao['baixas'] }) {
  if (baixas.length === 0) return null

  return (
    <section className="flex flex-col gap-2 rounded-card border border-border p-4">
      <h2 className="font-medium text-sm">Baixas lançadas</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b text-left text-muted-foreground text-xs">
            <th className="py-1.5 font-medium">Parcela</th>
            <th className="py-1.5 font-medium">Data</th>
            <th className="py-1.5 text-right font-medium">Abatido</th>
            <th className="py-1.5 text-right font-medium">Saiu da conta</th>
          </tr>
        </thead>
        <tbody>
          {baixas.map((b) => (
            <tr key={b.id} className="border-border/60 border-b last:border-0">
              <td className="py-1.5 tabular-nums">{b.sequence}</td>
              <td className="py-1.5 tabular-nums">{formatDateBR(b.settledOn)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatMoneyBRL(b.amountCents)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatMoneyBRL(b.paidCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function TituloForm({
  titulo,
  readOnly = false,
}: { titulo: TituloEmEdicao; readOnly?: boolean }) {
  const navigate = useNavigate()
  const gravar = useGravarTitulo()
  const raiz = titulo.direction === 'payable' ? '/financeiro/pagar' : '/financeiro/receber'
  const voltar = () => void navigate({ to: `${raiz}/titulos` })

  function onGravar(valores: TituloEmEdicao) {
    gravar.mutate(
      {
        ...(valores.id ? { id: valores.id } : {}),
        corpo: {
          direction: valores.direction,
          partnerId: valores.partnerId,
          documentNumber: valores.documentNumber || null,
          issuedAt: valores.issuedAt,
          competenceMonth: valores.competenceMonth || null,
          notes: valores.notes || null,
          // A sequência é reatribuída por POSIÇÃO: o servidor exige 1..N sem
          // buraco, e quem excluiu a linha do meio na grade não deveria ter de
          // renumerar à mão o que a ordem já diz.
          installments: valores.parcelas.map((p, i) => ({
            sequence: i + 1,
            dueDate: p.dueDate,
            amountCents: p.amountCents ?? 0,
            documentNumber: p.documentNumber || null,
          })),
        },
      },
      { onSuccess: voltar },
    )
  }

  return (
    <CadastroForm
      schema={tituloSchema}
      defaultValues={titulo}
      onGravar={onGravar}
      onCancelar={voltar}
      readOnly={readOnly}
      gravando={gravar.isPending}
      // Sem `familia`: a matriz de papéis do front é por PAPEL, e a do
      // financeiro é por AÇÃO nomeada (`financeiro:editar`, `financeiro:quitar`,
      // e a fina `financeiro:quitacao-a-menor`) — nenhum template de fábrica do
      // api concede as três. Declarar aqui um papel mínimo inventaria uma linha
      // que o servidor não tem; quem decide continua sendo ele, e a recusa chega
      // como 403 tratado.
    >
      <ErroDeGravacao
        mutacao={gravar}
        erro={gravar.error}
        mensagem="Não foi possível gravar o título."
      />
      <Cabecalho direcao={titulo.direction} />
      <Parcelas />
      <BaixasDoTitulo baixas={titulo.baixas} />
      {titulo.status === 'cancelled' ? (
        <p className="text-muted-foreground text-sm">
          Este título está <strong>cancelado</strong> — ele não se reescreve. Para retomar a conta,
          lance um título novo.
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={voltar}>
          Voltar à listagem
        </Button>
      </div>
    </CadastroForm>
  )
}
