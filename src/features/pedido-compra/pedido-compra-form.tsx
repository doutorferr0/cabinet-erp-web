import { Button } from '@/components/ui/button'
import { CadastroForm } from '@/components/vitra/cadastro-form'
import {
  DocumentoTotais,
  totalItemCentavos,
  useSubtotalCentavos,
} from '@/components/vitra/documento'
import { FormBlock } from '@/components/vitra/form-block'
import { DateField, SelectField, TextField, TextareaField } from '@/components/vitra/form-controls'
import { FormGrid, type FormGridRow } from '@/components/vitra/form-grid'
import { tabelas } from '@/data/tabelas'
import { formatMoneyBRL } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import type { PedidoCompra } from '@/mocks/pedidos-compra'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { z } from 'zod'

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const pedidoCompraSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  pedVenda: z.string(),
  serie: z.string(),
  data: z.string().nullable(),
  fornecedores: z.array(z.string()),
  codigoProduto: z.string().nullable(),
  itens: z.array(
    z.object({
      codigoFornecedor: z.string(),
      descricaoFornecedor: z.string(),
      acabamento: z.string(),
      quantidade: z.string(),
      destino: z.string(),
      tamanho: z.string(),
      unidade: z.string(),
      valorUnitarioCentavos: z.number().nullable(),
    }),
  ),
  observacao: z.string(),
})

const ITEM_VAZIO = {
  codigoFornecedor: '',
  descricaoFornecedor: '',
  acabamento: '',
  quantidade: '',
  destino: 'ESTOQUE',
  tamanho: '',
  unidade: 'UN',
  valorUnitarioCentavos: null,
}

/** `Produto F6` no legado → Alt+P (CLAUDE.md veta F3-F6). */
function BotaoProduto({ onInserir }: { onInserir: () => void }) {
  useEffect(() => bindShortcut(SHORTCUTS.produto, onInserir))

  return (
    <Button type="button" variant="outline" size="sm" onClick={onInserir}>
      📦 Produto ({shortcutLabel(SHORTCUTS.produto)})
    </Button>
  )
}

function Totais() {
  return <DocumentoTotais subtotalCentavos={useSubtotalCentavos('itens')} />
}

export function PedidoCompraForm({
  pedido,
  readOnly = false,
}: { pedido: PedidoCompra; readOnly?: boolean }) {
  const navigate = useNavigate()

  function onGravar(values: PedidoCompra) {
    // Mock only: sem backend. Na integração, mutation do TanStack Query.
    console.info('[mock] Gravar pedido de compra', values)
    void navigate({ to: '/compras/pedidos' })
  }

  return (
    <CadastroForm
      schema={pedidoCompraSchema}
      defaultValues={pedido}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/compras/pedidos' })}
      readOnly={readOnly}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="codigo" label="Código" className="col-span-6 sm:col-span-2" />
          <TextField name="pedVenda" label="Ped. Venda" className="col-span-6 sm:col-span-2" />
          <TextField name="serie" label="Série" className="col-span-4 sm:col-span-1" />
          <DateField name="data" label="Data" className="col-span-8 sm:col-span-2" />
          <SelectField
            name="codigoProduto"
            label="Código do Produto"
            options={tabelas.codigoProduto}
            className="col-span-6 sm:col-span-2"
          />
        </div>

        {/* Um pedido tem N fornecedores (§7.3): grade própria, não combo único. */}
        <FormBlock legend="Fornecedores" className="flex flex-col gap-2">
          <FornecedoresPedido />
        </FormBlock>

        <FormGrid
          name="itens"
          hideAdd
          actions={(append) => <BotaoProduto onInserir={() => append(ITEM_VAZIO)} />}
          columns={[
            { key: 'codigoFornecedor', label: 'Código Fornecedor' },
            { key: 'descricaoFornecedor', label: 'Descrição do Fornecedor' },
            { key: 'acabamento', label: 'Acab.', type: 'select', options: tabelas.acabamentos },
            { key: 'quantidade', label: 'Quantidade' },
            { key: 'destino', label: 'Destino', type: 'select', options: tabelas.destinos },
            { key: 'tamanho', label: 'Tamanho' },
            { key: 'unidade', label: 'Unidade', type: 'select', options: tabelas.unidades },
            { key: 'valorUnitarioCentavos', label: 'Valor Unit.', type: 'money' },
            {
              key: 'valorTotal',
              label: 'Valor Total',
              type: 'computed',
              compute: (row: FormGridRow) => formatMoneyBRL(totalItemCentavos(row)),
            },
          ]}
          newRow={ITEM_VAZIO}
        />

        <TextareaField name="observacao" label="Observação" rows={3} />

        <Totais />

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void navigate({ to: '/compras/ordens' })}
          >
            Ordem de Compra
          </Button>
        </div>
      </div>
    </CadastroForm>
  )
}

/** Lista de fornecedores do pedido — array de strings, não de objetos. */
function FornecedoresPedido() {
  const { control, register } = useFormContext<PedidoCompra>()
  const { fields, append, remove } = useFieldArray({
    control,
    // Array de strings: RHF exige o cast, o campo é registrado pelo índice.
    name: 'fornecedores' as never,
  })

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => append('' as never)}>
          Incluir fornecedor
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum fornecedor no pedido.</p>
      ) : (
        fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <select
              aria-label={`Fornecedor ${index + 1}`}
              className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
              {...register(`fornecedores.${index}`)}
            >
              <option value="">Selecione…</option>
              {tabelas.fornecedoresDocumento.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Excluir fornecedor ${index + 1}`}
              onClick={() => remove(index)}
            >
              Excluir
            </Button>
          </div>
        ))
      )}
    </div>
  )
}
