import { AbasSemCaptura } from '@/components/cabinet/abas-sem-captura'
import { RedesSociaisBlock } from '@/components/cabinet/blocks'
import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import { FormBlock } from '@/components/cabinet/form-block'
import {
  CheckboxField,
  DateField,
  LookupField,
  LookupSelectField,
  MoneyField,
  RadioField,
  SelectField,
  TextField,
} from '@/components/cabinet/form-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs } from '@/components/ui/tabs'
import { tabelas } from '@/data/tabelas'
import type { Colaborador } from '@/mocks/colaboradores'
import { useNavigate } from '@tanstack/react-router'
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
    <BuscaDeCidade
      open={open}
      onOpenChange={onOpenChange}
      titulo="Busca de Naturalidade"
      onSelect={(cidade) => {
        setValue('naturalidade.cidadeCodigo', cidade.codigo, { shouldDirty: true })
        setValue('naturalidade.cidadeNome', cidade.nome, { shouldDirty: true })
        setValue('naturalidade.uf', cidade.uf, { shouldDirty: true })
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
    <CampoComBusca
      label="Naturalidade"
      inputId="naturalidade.cidadeNome"
      ariaLabel="Buscar naturalidade"
      onBuscar={onBusca}
      className={className}
    >
      {codigo && <span className="w-12 shrink-0 text-sm text-muted-foreground">{codigo}</span>}
      <Input id="naturalidade.cidadeNome" value={nome ?? ''} readOnly />
    </CampoComBusca>
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
        <LookupSelectField
          name="grauInstrucao"
          label="Grau de Instrução"
          kind="grauInstrucao"
          className="col-span-12 sm:col-span-3"
        />
        <LookupField
          name="profissao"
          label="Profissão"
          kind="profissao"
          className="col-span-12 sm:col-span-4"
        />
        <LookupSelectField
          name="racaCor"
          label="Raça/Cor"
          kind="racaCor"
          className="col-span-6 sm:col-span-3"
        />
        <LookupSelectField
          name="estadoCivil"
          label="Estado Civil"
          kind="estadoCivil"
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
          <LookupSelectField
            name="vinculo"
            label="Vínculo"
            kind="vinculo"
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
  contexto,
}: { colaborador: Colaborador; readOnly?: boolean; contexto?: string }) {
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
      titulo="Cadastro de Colaboradores"
      {...(contexto ? { contexto } : {})}
    >
      {/* FotoFrame (~224px) é coluna lateral do bloco campos+abas, não sibling
          de só uma fileira — assim a altura da linha vem do conteúdo da aba
          (bem mais alto que a foto), sem vão vazio nem sobreposição. */}
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="grid grid-cols-12 items-end gap-3">
            <TextField name="nome" label="Nome" voz="nome" className="col-span-12 sm:col-span-5" />
            <LookupField
              name="setor"
              label="Setor"
              kind="setor"
              className="col-span-8 sm:col-span-3"
            />
            <CheckboxField
              name="atendimentoCliente"
              label="Atendimento ao cliente"
              className="col-span-6 sm:col-span-3"
            />
            <CheckboxField name="ativo" label="Ativo" className="col-span-6 sm:col-span-1" />
          </div>

          <Tabs defaultValue="geral">
            <AbasSemCaptura capturada={['geral', 'Geral']} abas={ABAS_SEM_CAPTURA}>
              <AbaGeral onBuscaNaturalidade={() => setBuscaNaturalidadeOpen(true)} />
            </AbasSemCaptura>
          </Tabs>
        </div>

        <FotoFrame />
      </div>

      <BuscaNaturalidade open={buscaNaturalidadeOpen} onOpenChange={setBuscaNaturalidadeOpen} />
    </CadastroForm>
  )
}
