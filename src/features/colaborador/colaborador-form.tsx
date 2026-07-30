import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RedesSociaisBlock } from '@/components/vitra/blocks'
import { CadastroForm } from '@/components/vitra/cadastro-form'
import { FormBlock } from '@/components/vitra/form-block'
import {
  CheckboxField,
  DateField,
  LookupField,
  MoneyField,
  RadioField,
  SelectField,
  TextField,
} from '@/components/vitra/form-controls'
import { SearchDialog } from '@/components/vitra/search-dialog'
import { data } from '@/data'
import { opcoesLookup } from '@/data/tabelas'
import { tabelas } from '@/data/tabelas'
import type { Cidade } from '@/mocks/cidades'
import type { Colaborador } from '@/mocks/colaboradores'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const colaboradorSchema = z.object({
  id: z.number(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  setor: z.string().nullable(),
  atendimentoCliente: z.boolean(),
  ativo: z.boolean(),
  sexo: z.string().nullable(),
  dtNascimento: z.string().nullable(),
  grauInstrucao: z.string().nullable(),
  profissao: z.string().nullable(),
  racaCor: z.string().nullable(),
  estadoCivil: z.string().nullable(),
  nomeConjuge: z.string(),
  dtNascConjuge: z.string().nullable(),
  nomePai: z.string(),
  nomeMae: z.string(),
  naturalidade: z.object({
    cidadeCodigo: z.string().nullable(),
    cidadeNome: z.string(),
    uf: z.string().nullable(),
  }),
  nacionalidade: z.string().nullable(),
  anoChegada: z.string(),
  cargo: z.string().nullable(),
  salario: z.number().nullable(),
  vinculo: z.string().nullable(),
  dataAdmissao: z.string().nullable(),
  dataDemissao: z.string().nullable(),
  redesSociais: z.object({
    facebook: z.string(),
    instagram: z.string(),
  }),
  empresa: z.string().nullable(),
})

/** Abas da transcrição §2: só `Geral` foi capturada. */
const ABAS_SEM_CAPTURA = [
  ['endereco', 'Endereço'],
  ['documentacao', 'Documentação'],
  ['contatos', 'Contatos'],
  ['financeiro', 'Financeiro'],
] as const

const cidadeColumns: ColumnDef<Cidade>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nome', header: 'Cidade' },
  { accessorKey: 'uf', header: 'UF' },
]

/** Moldura de foto + botões (visual apenas — sem upload real na fase mock). */
function FotoFrame() {
  return (
    <div className="flex w-36 shrink-0 flex-col gap-2">
      <div className="flex h-36 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Foto
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => console.info('[mock] Incluir Foto')}
      >
        Incluir Foto
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => console.info('[mock] Retirar Foto')}
      >
        Retirar Foto
      </Button>
    </div>
  )
}

function BuscaNaturalidade({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setValue } = useFormContext<Colaborador>()
  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca de Naturalidade"
      columns={cidadeColumns}
      queryKey={['cidades']}
      fetcher={(state) => data.cidades.list(state, 0)}
      onSelect={(c) => {
        setValue('naturalidade.cidadeCodigo', c.codigo, { shouldDirty: true })
        setValue('naturalidade.cidadeNome', c.nome, { shouldDirty: true })
        setValue('naturalidade.uf', c.uf, { shouldDirty: true })
      }}
    />
  )
}

/** Naturalidade `[busca +...]` + UF rótulo derivado (transcrição §2). */
function NaturalidadeField({ onBusca, className }: { onBusca: () => void; className?: string }) {
  const { watch } = useFormContext<Colaborador>()
  const codigo = watch('naturalidade.cidadeCodigo')
  const nome = watch('naturalidade.cidadeNome')
  return (
    <div className={className}>
      <Label htmlFor="naturalidade.cidadeNome">Naturalidade</Label>
      <div className="flex items-center gap-1">
        {codigo && <span className="w-12 shrink-0 text-sm text-muted-foreground">{codigo}</span>}
        <Input id="naturalidade.cidadeNome" value={nome ?? ''} readOnly />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Buscar naturalidade"
          onClick={onBusca}
        >
          <Search className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function UfNaturalidade({ className }: { className?: string }) {
  const { watch } = useFormContext<Colaborador>()
  const uf = watch('naturalidade.uf')
  return (
    <div className={className}>
      <Label>UF</Label>
      <p className="flex h-9 items-center text-sm">{uf ?? '—'}</p>
    </div>
  )
}

function AbaGeral({ onBuscaNaturalidade }: { onBuscaNaturalidade: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 items-end gap-3">
        <RadioField
          name="sexo"
          label="Sexo"
          options={[
            { value: 'MASCULINO', label: 'Masculino' },
            { value: 'FEMININO', label: 'Feminino' },
          ]}
          className="col-span-12 sm:col-span-3"
        />
        <DateField name="dtNascimento" label="Dt Nascimento" className="col-span-6 sm:col-span-2" />
        <SelectField
          name="grauInstrucao"
          label="Grau de Instrução"
          options={opcoesLookup('grauInstrucao')}
          className="col-span-12 sm:col-span-3"
        />
        <LookupField
          name="profissao"
          label="Profissão"
          kind="profissao"
          className="col-span-12 sm:col-span-4"
        />
        <SelectField
          name="racaCor"
          label="Raça/Cor"
          options={opcoesLookup('racaCor')}
          className="col-span-6 sm:col-span-3"
        />
        <SelectField
          name="estadoCivil"
          label="Estado Civil"
          options={opcoesLookup('estadoCivil')}
          className="col-span-6 sm:col-span-3"
        />
        <TextField
          name="nomeConjuge"
          label="Nome do Cônjuge"
          className="col-span-12 sm:col-span-4"
        />
        <DateField
          name="dtNascConjuge"
          label="Dt.Nasc.Cônjuge"
          className="col-span-6 sm:col-span-2"
        />
        <TextField name="nomePai" label="Nome do Pai" className="col-span-12 sm:col-span-6" />
        <TextField name="nomeMae" label="Nome da Mãe" className="col-span-12 sm:col-span-6" />
        <NaturalidadeField onBusca={onBuscaNaturalidade} className="col-span-12 sm:col-span-4" />
        <UfNaturalidade className="col-span-4 sm:col-span-1" />
        <LookupField
          name="nacionalidade"
          label="Nacionalidade"
          kind="nacionalidade"
          className="col-span-8 sm:col-span-5"
        />
        <TextField name="anoChegada" label="Ano de Chegada" className="col-span-6 sm:col-span-2" />
      </div>

      <FormBlock legend="Dados Trabalhistas">
        <div className="grid grid-cols-12 items-end gap-3">
          <LookupField
            name="cargo"
            label="Cargo"
            kind="cargo"
            className="col-span-12 sm:col-span-4"
          />
          <MoneyField name="salario" label="Salário" className="col-span-6 sm:col-span-2" />
          <SelectField
            name="vinculo"
            label="Vínculo"
            options={opcoesLookup('vinculo')}
            className="col-span-6 sm:col-span-2"
          />
          <DateField
            name="dataAdmissao"
            label="Data de Admissão"
            className="col-span-6 sm:col-span-2"
          />
          <DateField
            name="dataDemissao"
            label="Data de Demissão"
            className="col-span-6 sm:col-span-2"
          />
        </div>
      </FormBlock>

      <div className="grid grid-cols-12 items-end gap-3">
        <div className="col-span-12 sm:col-span-8">
          <RedesSociaisBlock prefix="redesSociais" />
        </div>
        <SelectField
          name="empresa"
          label="Empresa"
          options={tabelas.empresas}
          className="col-span-12 sm:col-span-4"
        />
      </div>
    </div>
  )
}

export function ColaboradorForm({
  colaborador,
  readOnly = false,
}: { colaborador: Colaborador; readOnly?: boolean }) {
  const navigate = useNavigate()
  const [buscaNaturalidadeOpen, setBuscaNaturalidadeOpen] = useState(false)

  function onGravar(values: Colaborador) {
    // Mock only: sem backend. Na integração, mutation do TanStack Query.
    console.info('[mock] Gravar colaborador', values)
    void navigate({ to: '/cadastros/colaboradores' })
  }

  return (
    <CadastroForm
      schema={colaboradorSchema}
      defaultValues={colaborador}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/cadastros/colaboradores' })}
      readOnly={readOnly}
    >
      <div className="flex items-start gap-4">
        <div className="grid flex-1 grid-cols-12 items-end gap-3">
          <TextField name="nome" label="Nome" className="col-span-12 sm:col-span-6" />
          <LookupField
            name="setor"
            label="Setor"
            kind="setor"
            className="col-span-8 sm:col-span-3"
          />
          <CheckboxField
            name="atendimentoCliente"
            label="Atendimento ao cliente"
            className="col-span-6 sm:col-span-2"
          />
          <CheckboxField name="ativo" label="Ativo" className="col-span-6 sm:col-span-1" />
        </div>
        <FotoFrame />
      </div>

      <Tabs defaultValue="geral" className="mt-2">
        <TabsList className="flex-wrap">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          {ABAS_SEM_CAPTURA.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="geral">
          <AbaGeral onBuscaNaturalidade={() => setBuscaNaturalidadeOpen(true)} />
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

      <BuscaNaturalidade open={buscaNaturalidadeOpen} onOpenChange={setBuscaNaturalidadeOpen} />
    </CadastroForm>
  )
}
