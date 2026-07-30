import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnderecoBlock, RedesSociaisBlock } from '@/components/vitra/blocks'
import { CadastroForm } from '@/components/vitra/cadastro-form'
import {
  CheckboxField,
  DateField,
  LookupField,
  RadioField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/vitra/form-controls'
import { SearchDialog } from '@/components/vitra/search-dialog'
import { data } from '@/data'
import { SHORTCUTS, bindShortcut } from '@/lib/shortcuts'
import type { Cidade } from '@/mocks/cidades'
import type { Cliente } from '@/mocks/clientes'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const clienteSchema = z.object({
  id: z.number(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipoPessoa: z.enum(['FISICA', 'JURIDICA']),
  cpf: z.string(),
  sexo: z.string().nullable(),
  rg: z.string(),
  orgaoExpedicao: z.string(),
  ufRg: z.string().nullable(),
  endereco: z.object({
    cep: z.string(),
    logradouro: z.string(),
    numero: z.string(),
    complemento: z.string(),
    bairro: z.string(),
    cidadeCodigo: z.string().nullable(),
    cidadeNome: z.string(),
    uf: z.string().nullable(),
  }),
  foneComercial: z.string(),
  fax: z.string(),
  foneResidencial: z.string(),
  celular: z.string(),
  email: z.string(),
  ativo: z.boolean(),
  profissional: z.string().nullable(),
  categoria: z.string().nullable(),
  dtNascimento: z.string().nullable(),
  redesSociais: z.object({
    facebook: z.string(),
    instagram: z.string(),
  }),
  inscEstProdutorRural: z.string(),
  observacao: z.string(),
})

/** Abas da transcrição §5: só `Principal` foi capturada. */
const ABAS_SEM_CAPTURA = [
  ['pessoais', 'Pessoais'],
  ['cobranca', 'Cobrança\\Comercial'],
  ['obra', 'Obra'],
  ['contato', 'Contato'],
  ['financeiro', 'Financeiro\\Tributário'],
] as const

const UFS = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'ES', 'GO', 'DF'] as const
const SEXOS = ['MASCULINO', 'FEMININO'] as const

const cidadeColumns: ColumnDef<Cidade>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nome', header: 'Cidade' },
  { accessorKey: 'uf', header: 'UF' },
]

function BuscaCidade({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setValue } = useFormContext()
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

function ClientePrincipal({ onBuscaCidade }: { onBuscaCidade: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 items-end gap-3">
        <TextField name="nome" label="Nome" className="col-span-12 sm:col-span-6" />
        <RadioField
          name="tipoPessoa"
          label="Tipo de pessoa"
          options={[
            { value: 'FISICA', label: 'FÍSICA' },
            { value: 'JURIDICA', label: 'JURÍDICA' },
          ]}
          className="col-span-12 sm:col-span-4"
        />
        <CheckboxField name="ativo" label="Ativo" className="col-span-6 sm:col-span-2" />
        <TextField
          name="cpf"
          label="CPF"
          placeholder="___.___.___-__"
          className="col-span-6 sm:col-span-3"
        />
        <SelectField
          name="sexo"
          label="Sexo"
          options={SEXOS}
          className="col-span-6 sm:col-span-3"
        />
        <TextField name="rg" label="RG" className="col-span-4 sm:col-span-2" />
        <TextField
          name="orgaoExpedicao"
          label="Órgão Expedição"
          className="col-span-4 sm:col-span-2"
        />
        <SelectField name="ufRg" label="UF" options={UFS} className="col-span-4 sm:col-span-2" />
      </div>

      <EnderecoBlock prefix="endereco" onBuscaCidade={onBuscaCidade} />

      <div className="grid grid-cols-12 items-end gap-3">
        <TextField name="foneComercial" label="Fone Comer." className="col-span-6 sm:col-span-3" />
        <TextField name="fax" label="FAX" className="col-span-6 sm:col-span-3" />
        <TextField
          name="foneResidencial"
          label="Fone Resid."
          className="col-span-6 sm:col-span-3"
        />
        <TextField name="celular" label="Celular" className="col-span-6 sm:col-span-3" />
        <TextField name="email" label="Email" className="col-span-12 sm:col-span-6" />
        <DateField name="dtNascimento" label="Dt. de Nasc." className="col-span-6 sm:col-span-3" />
        <LookupField
          name="profissional"
          label="Profissional"
          kind="profissional"
          className="col-span-12 sm:col-span-4"
        />
        <LookupField
          name="categoria"
          label="Categoria"
          kind="categoria"
          className="col-span-12 sm:col-span-4"
        />
        <TextField
          name="inscEstProdutorRural"
          label="Inscrição Estadual Produtor Rural"
          className="col-span-12 sm:col-span-4"
        />
      </div>

      <RedesSociaisBlock prefix="redesSociais" />

      <TextareaField name="observacao" label="Observação" rows={3} />
    </div>
  )
}

export function ClienteForm({
  cliente,
  readOnly = false,
}: { cliente: Cliente; readOnly?: boolean }) {
  const navigate = useNavigate()
  const [buscaCidadeOpen, setBuscaCidadeOpen] = useState(false)

  // Ctrl+K abre a janela de busca (registry único — src/lib/shortcuts.ts).
  useEffect(() => bindShortcut(SHORTCUTS.busca, () => setBuscaCidadeOpen(true)), [])

  function onGravar(values: Cliente) {
    console.info('[mock] Gravar cliente', values)
    void navigate({ to: '/cadastros/clientes' })
  }

  return (
    <CadastroForm
      schema={clienteSchema}
      defaultValues={cliente}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/cadastros/clientes' })}
      readOnly={readOnly}
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
          <ClientePrincipal onBuscaCidade={() => setBuscaCidadeOpen(true)} />
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
