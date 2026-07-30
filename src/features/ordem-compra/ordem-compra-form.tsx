import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CadastroForm } from '@/components/vitra/cadastro-form'
import {
  DocumentoTotais,
  totalItemCentavos,
  useSubtotalCentavos,
} from '@/components/vitra/documento'
import { FormBlock } from '@/components/vitra/form-block'
import {
  DateField,
  MoneyField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/vitra/form-controls'
import { FormGrid, type FormGridRow } from '@/components/vitra/form-grid'
import { tabelas } from '@/data/tabelas'
import { formatMoneyBRL } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import type { OrdemCompra } from '@/mocks/ordens-compra'
import { useNavigate } from '@tanstack/react-router'
import { Package, Search } from 'lucide-react'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const ordemCompraSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  dataOrdem: z.string().nullable(),
  dataEnvio: z.string().nullable(),
  dataPrevista: z.string().nullable(),
  reagendamento: z.string().nullable(),
  codigoProduto: z.string().nullable(),
  filtroSobreVendaNumero: z.string(),
  empresaCompradora: z.string().nullable(),
  fornecedor: z.string().min(1, 'Fornecedor é obrigatório'),
  faturamentoMinimoCentavos: z.number(),
  itens: z.array(
    z.object({
      codigoProduto: z.string(),
      descricaoProduto: z.string(),
      acabamento: z.string(),
      tamanho: z.string(),
      quantidade: z.string(),
      unidade: z.string(),
      valorUnitarioCentavos: z.number().nullable(),
      pedCompra: z.string(),
      data: z.string().nullable(),
    }),
  ),
  descontoCentavos: z.number(),
  acrescimoCentavos: z.number(),
  transportadora: z.object({ nome: z.string(), municipio: z.string(), uf: z.string() }),
  observacao: z.string(),
})

function Cabecalho() {
  return (
    <div className="grid grid-cols-12 items-end gap-3">
      <TextField name="codigo" label="Código" className="col-span-6 sm:col-span-2" />
      <DateField name="dataOrdem" label="Data Ordem" className="col-span-6 sm:col-span-2" />
      <DateField name="dataEnvio" label="Data Envio" className="col-span-6 sm:col-span-2" />
      <DateField name="dataPrevista" label="Data Prevista" className="col-span-6 sm:col-span-2" />
      <DateField name="reagendamento" label="Reagendamento" className="col-span-6 sm:col-span-2" />
      <SelectField
        name="codigoProduto"
        label="Código do Produto"
        options={tabelas.codigoProduto}
        className="col-span-6 sm:col-span-2"
      />
      <TextField
        name="filtroSobreVendaNumero"
        label="Filtro Sobre Venda — Número"
        className="col-span-6 sm:col-span-3"
      />
      <SelectField
        name="empresaCompradora"
        label="Empresa Compradora"
        options={tabelas.empresasCompradoras}
        className="col-span-6 sm:col-span-3"
      />
      <SelectField
        name="fornecedor"
        label="Fornecedor"
        options={tabelas.fornecedoresDocumento}
        className="col-span-12 sm:col-span-4"
      />
      <MoneyField
        name="faturamentoMinimoCentavos"
        label="Faturamento mínimo"
        className="col-span-6 sm:col-span-2"
      />
    </div>
  )
}

/** Bloco `Transportadora` (§7.2) — busca era F4; aqui Alt+T (F3-F6 vetados). */
function BlocoTransportadora() {
  const { setValue } = useFormContext<OrdemCompra>()
  const transportadora = useWatch({ name: 'transportadora' }) as OrdemCompra['transportadora']

  function buscar() {
    // Mock da janela de busca de transportadora.
    setValue(
      'transportadora',
      { nome: 'TRANSPORTES CAMPINAS LTDA', municipio: 'CAMPINAS', uf: 'SP' },
      { shouldDirty: true },
    )
  }

  useEffect(() => bindShortcut(SHORTCUTS.transportadora, buscar))

  return (
    <FormBlock legend="Transportadora">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="text-muted-foreground">Nome:</span>{' '}
          <output aria-label="Nome da transportadora">{transportadora?.nome || '—'}</output>
        </span>
        <span>
          <span className="text-muted-foreground">Município:</span>{' '}
          <output aria-label="Município da transportadora">
            {transportadora?.municipio || '—'}
          </output>
        </span>
        <span>
          <span className="text-muted-foreground">UF:</span>{' '}
          <output aria-label="UF da transportadora">{transportadora?.uf || '—'}</output>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={buscar}>
          <Search /> Busca ({shortcutLabel(SHORTCUTS.transportadora)})
        </Button>
      </div>
    </FormBlock>
  )
}

function Totais() {
  const subtotal = useSubtotalCentavos('itens')
  const desconto = (useWatch({ name: 'descontoCentavos' }) as number) ?? 0
  const acrescimo = (useWatch({ name: 'acrescimoCentavos' }) as number) ?? 0

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-12 items-end gap-3">
        <MoneyField name="descontoCentavos" label="Desconto" className="col-span-6 sm:col-span-2" />
        <MoneyField
          name="acrescimoCentavos"
          label="Acréscimo"
          className="col-span-6 sm:col-span-2"
        />
      </div>
      <DocumentoTotais
        subtotalCentavos={subtotal}
        ajustes={[
          { label: 'Desconto', valorCentavos: desconto, sinal: -1 },
          { label: 'Acréscimo', valorCentavos: acrescimo, sinal: 1 },
        ]}
      />
    </div>
  )
}

function AbaPrincipal() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <Cabecalho />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Excluir Produtos Selecionado')}
        >
          Excluir Produtos Selecionado
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Produtos Estoque')}
        >
          <Package className="size-4" /> Produtos Estoque
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info('[mock] Produtos Pedidos')}
        >
          <Package className="size-4" /> Produtos Pedidos
        </Button>
      </div>

      <FormGrid
        name="itens"
        columns={[
          { key: 'codigoProduto', label: 'Código do Produto' },
          { key: 'descricaoProduto', label: 'Descrição do Produto' },
          { key: 'acabamento', label: 'Acab.' },
          { key: 'tamanho', label: 'Tamanho' },
          { key: 'quantidade', label: 'Quantidade' },
          { key: 'unidade', label: 'Unidade', type: 'select', options: tabelas.unidades },
          { key: 'valorUnitarioCentavos', label: 'Vl. Unitário', type: 'money' },
          {
            key: 'valorTotal',
            label: 'Valor Total',
            type: 'computed',
            compute: (row: FormGridRow) => formatMoneyBRL(totalItemCentavos(row)),
          },
          { key: 'pedCompra', label: 'Ped. Compra' },
          { key: 'data', label: 'Data' },
        ]}
        newRow={{
          codigoProduto: '',
          descricaoProduto: '',
          acabamento: '',
          tamanho: '',
          quantidade: '',
          unidade: 'UN',
          valorUnitarioCentavos: null,
          pedCompra: '',
          data: null,
        }}
      />

      <Totais />

      <BlocoTransportadora />

      <TextareaField name="observacao" label="Observação" rows={3} />
    </div>
  )
}

export function OrdemCompraForm({
  ordem,
  readOnly = false,
}: { ordem: OrdemCompra; readOnly?: boolean }) {
  const navigate = useNavigate()

  function onGravar(values: OrdemCompra) {
    // Mock only: sem backend. Na integração, mutation do TanStack Query.
    console.info('[mock] Gravar ordem de compra', values)
    void navigate({ to: '/compras/ordens' })
  }

  return (
    <CadastroForm
      schema={ordemCompraSchema}
      defaultValues={ordem}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/compras/ordens' })}
      readOnly={readOnly}
    >
      <Tabs defaultValue="principal">
        <TabsList className="flex-wrap">
          <TabsTrigger value="principal">Principal</TabsTrigger>
          <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
        </TabsList>
        <TabsContent value="principal">
          <AbaPrincipal />
        </TabsContent>
        <TabsContent value="pagamento">
          <p className="py-6 text-sm text-muted-foreground">
            Aba Pagamento não capturada na transcrição do SoftLux — aguardando nova rodada de prints
            (transcrição §10).
          </p>
        </TabsContent>
      </Tabs>

      <div className="pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void navigate({ to: '/compras/pedidos' })}
        >
          Pedido de Compra
        </Button>
      </div>
    </CadastroForm>
  )
}
