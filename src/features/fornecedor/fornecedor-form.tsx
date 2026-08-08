import { ComunicadoresBlock, EnderecoBlock, RedesSociaisBlock } from '@/components/cabinet/blocks'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { FormBlock } from '@/components/cabinet/form-block'
import {
  CheckboxField,
  LookupField,
  SelectField,
  TextField,
} from '@/components/cabinet/form-controls'
import { FormGrid } from '@/components/cabinet/form-grid'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { data } from '@/data'
import { tabelas } from '@/data/tabelas'
import type { Cidade } from '@/mocks/cidades'
import type { Fornecedor } from '@/mocks/fornecedores'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

const enderecoSchema = z.object({
  cep: z.string(),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string(),
  bairro: z.string(),
  cidadeCodigo: z.string().nullable(),
  cidadeNome: z.string(),
  uf: z.string().nullable(),
})

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const fornecedorSchema = z.object({
  id: z.number(),
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  sigla: z.string(),
  nomeFantasia: z.string(),
  cnpjCpf: z.string(),
  inscEst: z.string(),
  endereco: enderecoSchema,
  fone1: z.string(),
  fone2: z.string(),
  fax: z.string(),
  email: z.string(),
  site: z.string(),
  comunicadores: z.object({
    comunicador1Tipo: z.string().nullable(),
    comunicador1Valor: z.string(),
    comunicador2Tipo: z.string().nullable(),
    comunicador2Valor: z.string(),
  }),
  forneceRevenda: z.boolean(),
  materiais: z.string().nullable(),
  prazoEntregaDias: z.string(),
  prazoPagamentoDias: z.string(),
  ativo: z.boolean(),
  redesSociais: z.object({
    facebook: z.string(),
    instagram: z.string(),
  }),
  empresaCompradora: z.string().nullable(),
  contatos: z.array(
    z.object({
      nome: z.string(),
      vinculo: z.string(),
      fone: z.string(),
      fax: z.string(),
    }),
  ),
})

/** Abas inferiores capturadas na transcrição §4: só `Contatos`. */
const ABAS_SEM_CAPTURA = [
  ['dadosBancarios', 'Dados Bancários'],
  ['faturamento', 'Faturamento'],
  ['observacao', 'Observação'],
  ['outrosDados', 'Outros Dados'],
  ['comissao', 'Comissão\\Premiação'],
  ['participacao', 'Participação'],
  ['historico', 'Histórico Emp. Comp.'],
] as const

function ConsultaCnpjButton() {
  const { getValues, setValue } = useFormContext<Fornecedor>()

  function consultar() {
    // Mock da "consulta externa" do botão CNPJ (transcrição §4).
    const cnpj = getValues('cnpjCpf').replace(/\D/g, '')
    if (!cnpj) return
    const base = getValues()
    if (!base.razaoSocial) {
      setValue('razaoSocial', `EMPRESA CNPJ ${cnpj.slice(0, 8)} LTDA`, { shouldDirty: true })
      setValue('nomeFantasia', `CNPJ ${cnpj.slice(0, 8)}`, { shouldDirty: true })
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={consultar}>
      CNPJ
    </Button>
  )
}

const cidadeColumns: ColumnDef<Cidade>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nome', header: 'Cidade' },
  { accessorKey: 'uf', header: 'UF' },
]

/**
 * Busca de Cidade (§4, §9 padrão 3) — `EnderecoBlock` já suporta a busca
 * (prop `onBuscaCidade`, usada por Cliente/Colaborador/Profissional), mas
 * Fornecedor nunca passava a prop: a cidade ficava em digitação livre, ao
 * contrário do que a transcrição documenta ("Cidade `[busca +...]`").
 */
function BuscaCidade({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setValue } = useFormContext<Fornecedor>()
  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca de Cidade"
      columns={cidadeColumns}
      queryKey={['cidades']}
      fetcher={(state) => data.cidades.list(state, 0)}
      onSelect={(c) => {
        setValue('endereco.cidadeCodigo', c.codigo, { shouldDirty: true })
        setValue('endereco.cidadeNome', c.nome, { shouldDirty: true })
        setValue('endereco.uf', c.uf, { shouldDirty: true })
      }}
    />
  )
}

function FornecedorCorpo({ onBuscaCidade }: { onBuscaCidade: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      {/* TODO(transcricao): `Identificação` é legenda INFERIDA. A transcrição §4
          lista o corpo do cadastro em sequência plana, sem groupbox — conferir
          contra nova captura do SoftLux. */}
      <FormBlock legend="Identificação">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField
            name="razaoSocial"
            label="Razão Social"
            className="col-span-12 sm:col-span-6"
          />
          <TextField name="sigla" label="Sigla" className="col-span-4 sm:col-span-2" />
          <TextField
            name="nomeFantasia"
            label="Nome Fantasia"
            className="col-span-8 sm:col-span-4"
          />
          <div className="col-span-8 flex items-end gap-1 sm:col-span-4">
            <TextField name="cnpjCpf" label="CNPJ/CPF" className="flex-1" />
            <ConsultaCnpjButton />
          </div>
          <TextField name="inscEst" label="Insc. Est." className="col-span-4 sm:col-span-2" />
        </div>
      </FormBlock>

      {/* TODO(transcricao): `Telefones e E-mail` é legenda INFERIDA. */}
      <FormBlock legend="Telefones e E-mail">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="fone1" label="Fone 1" className="col-span-6 sm:col-span-2" />
          <TextField name="fone2" label="Fone 2" className="col-span-6 sm:col-span-2" />
          <TextField name="fax" label="FAX" className="col-span-6 sm:col-span-2" />
          <TextField name="email" label="E-mail" className="col-span-12 sm:col-span-6" />
          <TextField name="site" label="Site" className="col-span-12 sm:col-span-6" />
        </div>
      </FormBlock>

      {/* `Endereço` e `Comunicadores` são nomes da própria transcrição (§10 e §3). */}
      <FormBlock legend="Endereço">
        <EnderecoBlock prefix="endereco" onBuscaCidade={onBuscaCidade} />
      </FormBlock>

      <FormBlock legend="Comunicadores">
        <ComunicadoresBlock prefix="comunicadores" />
      </FormBlock>

      {/* TODO(transcricao): `Fornecimento` é legenda INFERIDA. */}
      <FormBlock legend="Fornecimento">
        <div className="grid grid-cols-12 items-end gap-3">
          <CheckboxField
            name="forneceRevenda"
            label="Fornece produto para revenda"
            className="col-span-12 sm:col-span-3"
          />
          <LookupField
            name="materiais"
            label="Materiais"
            kind="materiais"
            className="col-span-12 sm:col-span-3"
          />
          <TextField
            name="prazoEntregaDias"
            label="Prazo de entrega (dias)"
            className="col-span-6 sm:col-span-3"
          />
          <TextField
            name="prazoPagamentoDias"
            label="Prazo de pagamento (dias)"
            className="col-span-6 sm:col-span-3"
          />
          <SelectField
            name="empresaCompradora"
            label="Empresa compradora"
            options={tabelas.empresasCompradoras}
            className="col-span-12 sm:col-span-4"
          />
          <CheckboxField name="ativo" label="Ativo" className="col-span-6 sm:col-span-2" />
        </div>
      </FormBlock>

      {/* TODO(transcricao): `Redes Sociais` é legenda INFERIDA. */}
      <FormBlock legend="Redes Sociais">
        <RedesSociaisBlock prefix="redesSociais" />
      </FormBlock>
    </div>
  )
}

export function FornecedorForm({
  fornecedor,
  readOnly = false,
  contexto,
  aviso,
  onGravar: gravarDeFora,
}: {
  fornecedor: Fornecedor
  readOnly?: boolean
  /** Modo ou registro aberto, ao lado do título na banda. */
  contexto?: string
  /** Aviso da tela — vai sob o título, acima dos campos. */
  aviso?: React.ReactNode
  /**
   * Quem grava, quando há endpoint. Sem isto o formulário cai no comportamento
   * antigo (sem efeito no servidor) — é o caso do "Incluir", que o contrato
   * ainda não atende.
   */
  onGravar?: (values: Fornecedor) => void
}) {
  const navigate = useNavigate()
  const [buscaCidadeOpen, setBuscaCidadeOpen] = useState(false)

  function onGravar(values: Fornecedor) {
    if (gravarDeFora) {
      gravarDeFora(values)
      return
    }
    // Mock only: sem backend. Na integração, mutation do TanStack Query.
    console.info('[mock] Gravar fornecedor', values)
    void navigate({ to: '/cadastros/fornecedores' })
  }

  return (
    <CadastroForm
      schema={fornecedorSchema}
      defaultValues={fornecedor}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/cadastros/fornecedores' })}
      readOnly={readOnly}
      titulo="Cadastro de Fornecedores"
      {...(contexto ? { contexto } : {})}
      {...(aviso ? { aviso } : {})}
    >
      <FornecedorCorpo onBuscaCidade={() => setBuscaCidadeOpen(true)} />

      <Tabs defaultValue="contatos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          {ABAS_SEM_CAPTURA.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="contatos">
          <FormGrid
            name="contatos"
            columns={[
              { key: 'nome', label: 'Nome' },
              { key: 'vinculo', label: 'Vínculo' },
              { key: 'fone', label: 'Fone' },
              { key: 'fax', label: 'FAX' },
            ]}
            newRow={{ nome: '', vinculo: '', fone: '', fax: '' }}
          />
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

      <BuscaCidade open={buscaCidadeOpen} onOpenChange={setBuscaCidadeOpen} />
    </CadastroForm>
  )
}
