import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ComunicadoresBlock,
  EnderecoBlock,
  RedesSociaisBlock,
  TelefonesBlock,
} from '@/components/vitra/blocks'
import { CadastroForm } from '@/components/vitra/cadastro-form'
import { FormBlock } from '@/components/vitra/form-block'
import {
  CheckboxField,
  DateField,
  LookupField,
  LookupSelectField,
  RadioField,
  TextField,
} from '@/components/vitra/form-controls'
import { SearchDialog } from '@/components/vitra/search-dialog'
import { data } from '@/data'
import type { Cidade } from '@/mocks/cidades'
import type { Profissional } from '@/mocks/profissionais'
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
export const profissionalSchema = z.object({
  id: z.number(),
  nomeApresentacao: z.string().min(1, 'Nome de Apresentação é obrigatório'),
  ativo: z.boolean(),
  tipoPessoa: z.enum(['FISICA', 'JURIDICA']),
  nome: z.string(),
  dtNascimento: z.string().nullable(),
  cpf: z.string(),
  rg: z.string(),
  estadoCivil: z.string().nullable(),
  profissao: z.string().nullable(),
  nomeConjuge: z.string(),
  dtNascConjuge: z.string().nullable(),
  endereco: enderecoSchema,
  telefones: z.object({
    foneComercial: z.string(),
    foneResidencial: z.string(),
    fax: z.string(),
    celular: z.string(),
  }),
  email: z.string(),
  comunicadores: z.object({
    comunicador1Tipo: z.string().nullable(),
    comunicador1Valor: z.string(),
    comunicador2Tipo: z.string().nullable(),
    comunicador2Valor: z.string(),
  }),
  numeroBanco: z.string(),
  nomeBanco: z.string(),
  numeroAgencia: z.string(),
  numeroConta: z.string(),
  enderecoBanco: enderecoSchema,
  pisPasepNis: z.string(),
  registroProfissional: z.string(),
  redesSociais: z.object({
    facebook: z.string(),
    instagram: z.string(),
  }),
})

/** Abas da transcrição §3: só `Dados Cadastrais` foi capturada. */
const ABAS_SEM_CAPTURA = [
  ['contatosObservacao', 'Contatos/Observação'],
  ['participacao', 'Participação'],
] as const

type PrefixoCidade = 'endereco' | 'enderecoBanco'

const cidadeColumns: ColumnDef<Cidade>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nome', header: 'Cidade' },
  { accessorKey: 'uf', header: 'UF' },
]

function BuscaCidade({
  prefix,
  onOpenChange,
}: { prefix: PrefixoCidade | null; onOpenChange: (p: PrefixoCidade | null) => void }) {
  const { setValue } = useFormContext<Profissional>()
  return (
    <SearchDialog
      open={prefix !== null}
      onOpenChange={(o) => {
        if (!o) onOpenChange(null)
      }}
      title="Busca de Cidade"
      columns={cidadeColumns}
      queryKey={['cidades']}
      fetcher={(state) => data.cidades.list(state, 0)}
      onSelect={(c) => {
        if (!prefix) return
        setValue(`${prefix}.cidadeCodigo`, c.codigo, { shouldDirty: true })
        setValue(`${prefix}.cidadeNome`, c.nome, { shouldDirty: true })
        setValue(`${prefix}.uf`, c.uf, { shouldDirty: true })
      }}
    />
  )
}

function AbaDadosCadastrais({ onBuscaCidade }: { onBuscaCidade: (p: PrefixoCidade) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 items-end gap-3">
        <RadioField
          name="tipoPessoa"
          label="Tipo de Pessoa"
          options={[
            { value: 'FISICA', label: 'Física' },
            { value: 'JURIDICA', label: 'Jurídica' },
          ]}
          className="col-span-12 sm:col-span-3"
        />
        <TextField name="nome" label="Nome" className="col-span-12 sm:col-span-5" />
        <DateField name="dtNascimento" label="Dt Nascimento" className="col-span-6 sm:col-span-2" />
        <TextField
          name="cpf"
          label="CPF"
          placeholder="___.___.___-__"
          className="col-span-6 sm:col-span-2"
        />
        <TextField name="rg" label="RG" className="col-span-6 sm:col-span-2" />
        <LookupSelectField
          name="estadoCivil"
          label="Est. Civil"
          kind="estadoCivil"
          className="col-span-6 sm:col-span-3"
        />
        <LookupField
          name="profissao"
          label="Profissão"
          kind="profissao"
          className="col-span-12 sm:col-span-3"
        />
        <TextField name="nomeConjuge" label="Nome Cônjuge" className="col-span-12 sm:col-span-4" />
        <DateField
          name="dtNascConjuge"
          label="Dt. Nasc. Cônjuge"
          className="col-span-6 sm:col-span-2"
        />
      </div>

      <EnderecoBlock prefix="endereco" onBuscaCidade={() => onBuscaCidade('endereco')} />

      <TelefonesBlock prefix="telefones" />

      <div className="grid grid-cols-12 items-end gap-3">
        <TextField name="email" label="Email" className="col-span-12 sm:col-span-6" />
      </div>

      <ComunicadoresBlock prefix="comunicadores" />

      <FormBlock legend="Dados Bancários" className="flex flex-col gap-3">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="numeroBanco" label="Nº do banco" className="col-span-4 sm:col-span-2" />
          <TextField name="nomeBanco" label="Nome do banco" className="col-span-8 sm:col-span-4" />
          <TextField
            name="numeroAgencia"
            label="Nº da agência"
            className="col-span-6 sm:col-span-3"
          />
          <TextField name="numeroConta" label="Nº da conta" className="col-span-6 sm:col-span-3" />
        </div>
        <EnderecoBlock
          prefix="enderecoBanco"
          onBuscaCidade={() => onBuscaCidade('enderecoBanco')}
        />
      </FormBlock>

      <div className="grid grid-cols-12 items-end gap-3">
        <TextField name="pisPasepNis" label="PIS\PASEP\NIS" className="col-span-6 sm:col-span-3" />
        <TextField
          name="registroProfissional"
          label="Registro Profissional (CREA, CAU, CFT)"
          className="col-span-6 sm:col-span-3"
        />
      </div>

      <RedesSociaisBlock prefix="redesSociais" />
    </div>
  )
}

export function ProfissionalForm({
  profissional,
  readOnly = false,
  onGravar: gravarDeFora,
}: {
  profissional: Profissional
  readOnly?: boolean
  /**
   * Quem grava, quando há endpoint. Sem isto o formulário cai no comportamento
   * antigo (sem efeito no servidor) — é o caso do "Incluir", que o contrato
   * ainda não atende.
   */
  onGravar?: (values: Profissional) => void
}) {
  const navigate = useNavigate()
  const [buscaCidadePrefix, setBuscaCidadePrefix] = useState<PrefixoCidade | null>(null)

  function onGravar(values: Profissional) {
    if (gravarDeFora) {
      gravarDeFora(values)
      return
    }
    // Mock only: sem backend. Na integração, mutation do TanStack Query.
    console.info('[mock] Gravar profissional', values)
    void navigate({ to: '/cadastros/profissionais' })
  }

  return (
    <CadastroForm
      schema={profissionalSchema}
      defaultValues={profissional}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/cadastros/profissionais' })}
      readOnly={readOnly}
    >
      <div className="grid grid-cols-12 items-end gap-3">
        <TextField
          name="nomeApresentacao"
          label="Nome de Apresentação"
          className="col-span-12 sm:col-span-6"
        />
        <CheckboxField name="ativo" label="Ativo" className="col-span-6 sm:col-span-2" />
      </div>

      <Tabs defaultValue="dadosCadastrais">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dadosCadastrais">Dados Cadastrais</TabsTrigger>
          {ABAS_SEM_CAPTURA.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="dadosCadastrais">
          <AbaDadosCadastrais onBuscaCidade={setBuscaCidadePrefix} />
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

      <BuscaCidade prefix={buscaCidadePrefix} onOpenChange={setBuscaCidadePrefix} />
    </CadastroForm>
  )
}
