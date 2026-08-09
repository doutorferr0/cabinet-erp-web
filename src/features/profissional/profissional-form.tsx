import { AbasSemCaptura } from '@/components/cabinet/abas-sem-captura'
import {
  ComunicadoresBlock,
  EnderecoBlock,
  RedesSociaisBlock,
  TelefonesBlock,
} from '@/components/cabinet/blocks'
import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import { FormBlock } from '@/components/cabinet/form-block'
import {
  CheckboxField,
  DateField,
  LookupField,
  LookupSelectField,
  RadioField,
  TextField,
} from '@/components/cabinet/form-controls'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { data } from '@/data'
import type { Banco } from '@/mocks/bancos'
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

function BuscaCidade({
  prefix,
  onOpenChange,
}: { prefix: PrefixoCidade | null; onOpenChange: (p: PrefixoCidade | null) => void }) {
  const { setValue } = useFormContext<Profissional>()
  return (
    <BuscaDeCidade
      open={prefix !== null}
      onOpenChange={(o) => {
        if (!o) onOpenChange(null)
      }}
      titulo="Busca de Cidade"
      onSelect={(cidade) => {
        if (!prefix) return
        setValue(`${prefix}.cidadeCodigo`, cidade.codigo, { shouldDirty: true })
        setValue(`${prefix}.cidadeNome`, cidade.nome, { shouldDirty: true })
        setValue(`${prefix}.uf`, cidade.uf, { shouldDirty: true })
      }}
    />
  )
}

const bancoColumns: ColumnDef<Banco>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nome', header: 'Banco' },
]

/**
 * Busca de Banco (§3, §9 padrão 3) — estava como `TextField` livre, sem busca
 * nenhuma (nem mockada): o único dos 10 `[busca +...]` da transcrição que não
 * tinha janela alguma por trás. Mesma `SearchDialog` das outras, contra
 * `data.bancos` (código COMPE, dado público).
 */
function BuscaBanco({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setValue } = useFormContext<Profissional>()
  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca de Banco"
      columns={bancoColumns}
      queryKey={['bancos']}
      fetcher={(state) => data.bancos.list(state)}
      onSelect={(b) => {
        setValue('numeroBanco', b.codigo, { shouldDirty: true })
        setValue('nomeBanco', b.nome, { shouldDirty: true })
      }}
    />
  )
}

function AbaDadosCadastrais({
  onBuscaCidade,
  onBuscaBanco,
}: { onBuscaCidade: (p: PrefixoCidade) => void; onBuscaBanco: () => void }) {
  const { register } = useFormContext<Profissional>()
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
          <div className="col-span-4 sm:col-span-2">
            <TextField name="numeroBanco" label="Nº do banco" readOnly />
          </div>
          <CampoComBusca
            label="Nome do banco"
            inputId="nomeBanco"
            ariaLabel="Buscar banco"
            onBuscar={onBuscaBanco}
            className="col-span-8 sm:col-span-4"
          >
            <Input id="nomeBanco" {...register('nomeBanco')} readOnly className="flex-1" />
          </CampoComBusca>
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
  contexto,
  aviso,
  onGravar: gravarDeFora,
}: {
  profissional: Profissional
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
  onGravar?: (values: Profissional) => void
}) {
  const navigate = useNavigate()
  const [buscaCidadePrefix, setBuscaCidadePrefix] = useState<PrefixoCidade | null>(null)
  const [buscaBancoOpen, setBuscaBancoOpen] = useState(false)

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
      titulo="Cadastro de Profissional Externo"
      {...(contexto ? { contexto } : {})}
      {...(aviso ? { aviso } : {})}
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
        <AbasSemCaptura capturada={['dadosCadastrais', 'Dados Cadastrais']} abas={ABAS_SEM_CAPTURA}>
          <AbaDadosCadastrais
            onBuscaCidade={setBuscaCidadePrefix}
            onBuscaBanco={() => setBuscaBancoOpen(true)}
          />
        </AbasSemCaptura>
      </Tabs>

      <BuscaCidade prefix={buscaCidadePrefix} onOpenChange={setBuscaCidadePrefix} />
      <BuscaBanco open={buscaBancoOpen} onOpenChange={setBuscaBancoOpen} />
    </CadastroForm>
  )
}
