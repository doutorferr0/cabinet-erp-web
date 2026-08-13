import { AbasSemCaptura } from '@/components/cabinet/abas-sem-captura'
import { EnderecoBlock, RedesSociaisBlock } from '@/components/cabinet/blocks'
import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { FormBlock } from '@/components/cabinet/form-block'
import {
  CheckboxField,
  DateField,
  LookupField,
  RadioField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/cabinet/form-controls'
import { Tabs } from '@/components/ui/tabs'
import { SHORTCUTS, bindShortcut } from '@/lib/shortcuts'
import type { Cliente } from '@/mocks/clientes'
import { useNavigate } from '@tanstack/react-router'
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

function BuscaCidade({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { setValue } = useFormContext<Cliente>()
  return (
    <BuscaDeCidade
      open={open}
      onOpenChange={onOpenChange}
      titulo="Busca de Cidade"
      onSelect={(cidade) => {
        setValue('endereco.cidadeCodigo', cidade.codigo, { shouldDirty: true })
        setValue('endereco.cidadeNome', cidade.nome, { shouldDirty: true })
        setValue('endereco.uf', cidade.uf, { shouldDirty: true })
      }}
    />
  )
}

function ClientePrincipal({ onBuscaCidade }: { onBuscaCidade: () => void }) {
  return (
    // Compartimentos irmãos: caixa própria + goteira de `{spacing.md}`, nunca
    // parede compartilhada (DESIGN.md §Shapes).
    <div className="flex flex-col gap-3">
      {/* TODO(transcricao): `Identificação` é legenda INFERIDA. A transcrição §5
          lista os campos da aba `Principal` em sequência plana e não registra
          groupbox nenhum — conferir contra nova captura do SoftLux. */}
      <FormBlock legend="Identificação">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="nome" label="Nome" voz="nome" className="col-span-12 sm:col-span-6" />
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
          <DateField
            name="dtNascimento"
            label="Dt. de Nasc."
            className="col-span-6 sm:col-span-3"
          />
        </div>
      </FormBlock>

      {/* `Endereço` não é inferência: a transcrição §10 trata o conjunto
          (Endereço…CEP) como bloco reutilizável, com esse nome. */}
      <FormBlock legend="Endereço">
        <EnderecoBlock prefix="endereco" onBuscaCidade={onBuscaCidade} />
      </FormBlock>

      {/* TODO(transcricao): `Telefones e E-mail` é legenda INFERIDA. A §10 nomeia
          "telefone" como bloco (4 variações fixas), mas não o conjunto com e-mail. */}
      <FormBlock legend="Telefones e E-mail">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField
            name="foneComercial"
            label="Fone Comer."
            className="col-span-6 sm:col-span-3"
          />
          <TextField name="fax" label="FAX" className="col-span-6 sm:col-span-3" />
          <TextField
            name="foneResidencial"
            label="Fone Resid."
            className="col-span-6 sm:col-span-3"
          />
          <TextField name="celular" label="Celular" className="col-span-6 sm:col-span-3" />
          <TextField name="email" label="Email" className="col-span-12 sm:col-span-6" />
        </div>
      </FormBlock>

      {/* Moldura sem legenda: a transcrição não agrupa estes três e nenhum nome
          plausível sobrevive sem colidir com aba existente (`Cobrança\Comercial`).
          Compartimento sem nome continua sendo compartimento. */}
      <FormBlock>
        <div className="grid grid-cols-12 items-end gap-3">
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
      </FormBlock>

      {/* TODO(transcricao): `Redes Sociais` é legenda INFERIDA — a transcrição
          lista FaceBook e Instagram soltos, sem moldura. */}
      <FormBlock legend="Redes Sociais">
        <RedesSociaisBlock prefix="redesSociais" />
      </FormBlock>

      {/* Campo único não ganha caixa: compartimento com um controle é decoração. */}
      <TextareaField name="observacao" label="Observação" rows={3} />
    </div>
  )
}

export function ClienteForm({
  cliente,
  readOnly = false,
  contexto,
  aviso,
  onGravar: gravarDeFora,
}: {
  cliente: Cliente
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
  onGravar?: (values: Cliente) => void
}) {
  const navigate = useNavigate()
  const [buscaCidadeOpen, setBuscaCidadeOpen] = useState(false)

  // Ctrl+K abre a janela de busca (registry único — src/lib/shortcuts.ts).
  useEffect(() => bindShortcut(SHORTCUTS.busca, () => setBuscaCidadeOpen(true)), [])

  function onGravar(values: Cliente) {
    if (gravarDeFora) {
      gravarDeFora(values)
      return
    }
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
      titulo="Cadastro de Clientes"
      {...(contexto ? { contexto } : {})}
      {...(aviso ? { aviso } : {})}
    >
      <Tabs defaultValue="principal">
        <AbasSemCaptura capturada={['principal', 'Principal']} abas={ABAS_SEM_CAPTURA}>
          <ClientePrincipal onBuscaCidade={() => setBuscaCidadeOpen(true)} />
        </AbasSemCaptura>
      </Tabs>

      <BuscaCidade open={buscaCidadeOpen} onOpenChange={setBuscaCidadeOpen} />
    </CadastroForm>
  )
}
