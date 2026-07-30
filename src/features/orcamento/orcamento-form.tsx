import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CadastroForm } from '@/components/vitra/cadastro-form'
import {
  DocumentoTotais,
  totalItemCentavos,
  useSubtotalCentavos,
} from '@/components/vitra/documento'
import { DateField, RadioField, SelectField, TextField } from '@/components/vitra/form-controls'
import { FormGrid, type FormGridRow } from '@/components/vitra/form-grid'
import { SearchDialog } from '@/components/vitra/search-dialog'
import { PERCENT_ESCALA, formatMoneyBRL, formatPercent } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { type Cliente, fetchClientes } from '@/mocks/clientes'
import { lookupOptions } from '@/mocks/lookups'
import { AMBIENTES, type Orcamento } from '@/mocks/orcamentos'
import { ACABAMENTOS, UNIDADES } from '@/mocks/produtos'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const orcamentoSchema = z.object({
  id: z.number(),
  numero: z.string(),
  serie: z.string(),
  numeroPasta: z.string(),
  dataEmissao: z.string().nullable(),
  dataValidade: z.string().nullable(),
  dataFechamento: z.string().nullable(),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  descricaoObra: z.string(),
  consultor: z.string().nullable(),
  profissionalExterno: z.string().nullable(),
  modoDesconto: z.enum(['PRODUTO', 'GERAL']),
  descontoPercentual: z.number(),
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
function BotoesInsercao({ append }: { append: (row: FormGridRow) => void }) {
  const itens = (useWatch({ name: 'itens' }) ?? []) as unknown[]

  function inserirProduto() {
    append({ ...ITEM_VAZIO, item: String(itens.length + 1) })
  }

  function inserirAmbiente() {
    // Ambiente agrupa os itens da obra: entra como linha com ambiente definido.
    append({ ...ITEM_VAZIO, item: String(itens.length + 1), ambiente: AMBIENTES[0] })
  }

  useEffect(() => bindShortcut(SHORTCUTS.produto, inserirProduto))
  useEffect(() => bindShortcut(SHORTCUTS.ambiente, inserirAmbiente))
  useEffect(() =>
    bindShortcut(SHORTCUTS.imagemProduto, () => console.info('[mock] Mostrar imagem do produto')),
  )

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={inserirAmbiente}>
        🏠 Ambiente ({shortcutLabel(SHORTCUTS.ambiente)})
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={inserirProduto}>
        📦 Produto ({shortcutLabel(SHORTCUTS.produto)})
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

const colunasCliente: ColumnDef<Cliente>[] = [
  { accessorKey: 'id', header: 'Código' },
  { accessorKey: 'nome', header: 'Nome' },
]

function Cabecalho() {
  const { setValue } = useFormContext<Orcamento>()
  const [buscaClienteOpen, setBuscaClienteOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-12 items-end gap-3">
        <TextField name="numero" label="Código" className="col-span-6 sm:col-span-2" />
        <SelectField
          name="serie"
          label="Série"
          options={['1', '2', '3']}
          className="col-span-6 sm:col-span-1"
        />
        <TextField name="numeroPasta" label="Nº Pasta" className="col-span-6 sm:col-span-2" />
        <DateField name="dataEmissao" label="Data Emissão" className="col-span-6 sm:col-span-2" />
        <DateField name="dataValidade" label="Data Validade" className="col-span-6 sm:col-span-2" />
        <DateField
          name="dataFechamento"
          label="Data Fechamento"
          className="col-span-6 sm:col-span-2"
        />
        <div className="col-span-12 sm:col-span-5">
          <div className="flex items-end gap-1">
            <TextField name="cliente" label="Cliente" className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBuscaClienteOpen(true)}
            >
              👤 Cliente
            </Button>
          </div>
        </div>
        <SelectField
          name="consultor"
          label="Consultor(a)"
          options={lookupOptions('cargo')}
          className="col-span-6 sm:col-span-3"
        />
        <SelectField
          name="profissionalExterno"
          label="Profissional Externo"
          options={lookupOptions('profissional')}
          className="col-span-6 sm:col-span-4"
        />
        <TextField
          name="descricaoObra"
          label="Descrição da Obra"
          className="col-span-12 sm:col-span-6"
        />
      </div>

      <SearchDialog
        open={buscaClienteOpen}
        onOpenChange={setBuscaClienteOpen}
        title="Busca de Cliente"
        columns={colunasCliente}
        queryKey={['busca-cliente-orcamento']}
        fetcher={(state) => fetchClientes(state, 0)}
        onSelect={(c) => {
          setValue('cliente', c.nome, { shouldDirty: true })
          setBuscaClienteOpen(false)
        }}
      />
    </>
  )
}

/** Desconto em 3 níveis (§8.2): por produto, por grupo e geral. */
function ControlesDesconto() {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <RadioField
        name="modoDesconto"
        label="Desconto"
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
  const subtotal = useSubtotalCentavos('itens')
  const modo = useWatch({ name: 'modoDesconto' }) as Orcamento['modoDesconto']
  const percentual = (useWatch({ name: 'descontoPercentual' }) as number) ?? 0
  // Desconto geral incide sobre o subtotal; por produto já saiu na linha.
  const descontoGeral =
    modo === 'GERAL' ? Math.round((subtotal * percentual) / (PERCENT_ESCALA * 100)) : 0

  return (
    <Tabs defaultValue="venda">
      <TabsList className="flex-wrap">
        <TabsTrigger value="venda">Totais da Venda</TabsTrigger>
        <TabsTrigger value="impostos">Totais de Impostos</TabsTrigger>
        <TabsTrigger value="frete">Frete</TabsTrigger>
      </TabsList>
      <TabsContent value="venda">
        <div className="flex flex-col gap-2 pt-3">
          <p className="text-sm text-muted-foreground">
            Desconto geral:{' '}
            <output aria-label="Desconto percentual">{formatPercent(percentual)}</output> %
          </p>
          <DocumentoTotais
            subtotalCentavos={subtotal}
            ajustes={[{ label: 'Desconto', valorCentavos: descontoGeral, sinal: -1 }]}
          />
        </div>
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

function AbaPrincipal() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <Cabecalho />
      <ControlesDesconto />

      <p className="text-sm text-muted-foreground">
        Tecle {shortcutLabel(SHORTCUTS.imagemProduto)} para mostrar imagem do produto.
      </p>

      <FormGrid
        name="itens"
        hideAdd
        actions={(append) => <BotoesInsercao append={append} />}
        columns={[
          { key: 'item', label: 'Item' },
          { key: 'codigoFornecedor', label: 'Código Fornecedor' },
          { key: 'descricaoFornecedor', label: 'Descrição do Fornecedor' },
          { key: 'ambiente', label: 'Ambiente', type: 'select', options: AMBIENTES },
          { key: 'acabamento', label: 'Acabamento', type: 'select', options: ACABAMENTOS },
          { key: 'tamanho', label: 'Tamanho' },
          { key: 'quantidade', label: 'Quant.' },
          { key: 'unidade', label: 'Und.', type: 'select', options: UNIDADES },
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
            options: lookupOptions('tipoPeca'),
          },
          { key: 'fornecedor', label: 'Fornecedor' },
        ]}
        newRow={ITEM_VAZIO}
      />

      <TotaisOrcamento />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Imprimir Orçamento')}
        >
          📄 Orçamento
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Estoque')}
        >
          📦 Estoque
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
          🔒 Permissões
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

export function OrcamentoForm({ orcamento }: { orcamento: Orcamento }) {
  const navigate = useNavigate()

  function onGravar(values: Orcamento) {
    // Mock only: sem backend. Na integração, mutation do TanStack Query.
    console.info('[mock] Gravar orçamento', values)
    void navigate({ to: '/vendas/orcamentos' })
  }

  return (
    <CadastroForm
      schema={orcamentoSchema}
      defaultValues={orcamento}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/vendas/orcamentos' })}
    >
      <Tabs defaultValue="principal">
        <TabsList className="flex-wrap">
          <TabsTrigger value="principal">Principal</TabsTrigger>
          {ABAS_SEM_CAPTURA.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="principal">
          <AbaPrincipal />
        </TabsContent>
        {ABAS_SEM_CAPTURA.map(([value, label]) => (
          <TabsContent key={value} value={value}>
            <p className="py-6 text-sm text-muted-foreground">
              Aba {label} não capturada na transcrição do SoftLux — aguardando nova rodada de prints
              (transcrição §10).
            </p>
          </TabsContent>
        ))}
      </Tabs>
    </CadastroForm>
  )
}
