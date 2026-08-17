import { ComunicadoresBlock, EnderecoBlock, RedesSociaisBlock } from '@/components/cabinet/blocks'
import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { FormBlock } from '@/components/cabinet/form-block'
import {
  CheckboxField,
  LookupField,
  SelectField,
  TextField,
} from '@/components/cabinet/form-controls'
import { FormGrid } from '@/components/cabinet/form-grid'
import { Button } from '@/components/ui/button'
import { tabelas } from '@/data/tabelas'
import {
  type ModuloCadastro,
  fornecedor as entidadeFornecedor,
  propsDoIcone,
} from '@/features/cadastro/modulos'
import { ProgressoObrigatorios } from '@/features/cliente/progresso-obrigatorios'
import type { Fornecedor } from '@/mocks/fornecedores'
import { useNavigate } from '@tanstack/react-router'
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

/**
 * Busca de Cidade (§4, §9 padrão 3) — `EnderecoBlock` já suporta a busca
 * (prop `onBuscaCidade`, usada por Cliente/Colaborador/Profissional), mas
 * Fornecedor nunca passava a prop: a cidade ficava em digitação livre, ao
 * contrário do que a transcrição documenta ("Cidade `[busca +...]`").
 */
function BuscaCidade({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { setValue } = useFormContext<Fornecedor>()
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

/** O módulo pelo `id` — se o schema o renomear, o erro é de compilação aqui. */
function modulo(id: string): ModuloCadastro {
  const achado = entidadeFornecedor.modulos.find((m) => m.id === id)
  if (!achado) throw new Error(`Módulo "${id}" saiu do schema do fornecedor`)
  return achado
}

/**
 * O bloco de um módulo do schema: título, resumo, cor e obrigatoriedade vêm de
 * lá; o miolo vem de quem chama.
 */
function BlocoDoModulo({
  id,
  emFoco,
  children,
}: { id: string; emFoco: string | undefined; children: React.ReactNode }) {
  const m = modulo(id)
  return (
    <FormBlock
      legend={m.titulo}
      {...(m.obrigatorio ? { obrigatorio: true } : { colapsavel: true })}
      {...(emFoco === id ? { iniciaAberto: true } : {})}
      {...(m.cor ? { cor: m.cor } : {})}
      {...propsDoIcone(id)}
    >
      {children}
    </FormBlock>
  )
}

function FornecedorCorpo({
  onBuscaCidade,
  moduloEmFoco,
}: { onBuscaCidade: () => void; moduloEmFoco: string | undefined }) {
  return (
    <div className="flex flex-col gap-3">
      <ProgressoObrigatorios entidade={entidadeFornecedor} />

      <BlocoDoModulo emFoco={moduloEmFoco} id="identificacao">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField
            name="razaoSocial"
            label="Razão Social"
            voz="nome"
            className="col-span-12 sm:col-span-6"
          />
          <TextField name="sigla" label="Sigla" className="col-span-4 sm:col-span-2" />
          <TextField
            name="nomeFantasia"
            label="Nome Fantasia"
            voz="nome"
            className="col-span-8 sm:col-span-4"
          />
          <div className="col-span-8 flex items-end gap-1 sm:col-span-4">
            <TextField name="cnpjCpf" label="CNPJ/CPF" className="flex-1" />
            <ConsultaCnpjButton />
          </div>
          <TextField name="fone1" label="Fone 1" className="col-span-6 sm:col-span-2" />
          <TextField name="email" label="E-mail" className="col-span-12 sm:col-span-6" />
          <CheckboxField name="ativo" label="Ativo" className="col-span-6 sm:col-span-2" />
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="fiscal">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="inscEst" label="Insc. Est." className="col-span-6 sm:col-span-3" />
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="comercial">
        <div className="grid grid-cols-12 items-end gap-3">
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
          <SelectField
            name="empresaCompradora"
            label="Empresa compradora"
            options={tabelas.empresasCompradoras}
            className="col-span-12 sm:col-span-4"
          />
        </div>

        {/* DECISÃO DO USER (2026-08-14): perfil de custo e índice de valor de
            venda ficam OPCIONAIS, mesmo sendo deles que sai o preço de venda.
            A tela AVISA e não trava — travar o cadastro de um fornecedor
            porque o preço ainda não foi negociado impediria de registrar quem
            já está fornecendo. O aviso mora aqui, no bloco onde os dois
            campos vão nascer, e não no topo: no topo ele seria mais uma linha
            que ninguém associa a nada. */}
        <p className="text-[0.75rem] text-muted-foreground">
          Sem perfil de custo e índice de valor de venda, o produto deste fornecedor não tem preço
          de venda calculado. Os dois campos ainda não existem no cadastro — quando entrarem,
          continuam opcionais.
        </p>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="representante">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-12 items-end gap-3">
            <TextField name="fone2" label="Fone 2" className="col-span-6 sm:col-span-2" />
            <TextField name="fax" label="FAX" className="col-span-6 sm:col-span-2" />
            <TextField name="site" label="Site" className="col-span-12 sm:col-span-6" />
          </div>

          <ComunicadoresBlock prefix="comunicadores" />

          {/* A grade de contatos era a única aba capturada da §4, e vivia numa
              tira de abas com sete irmãs desabilitadas. O schema a coloca em
              `Representante e contatos`, que é onde ela sempre pertenceu —
              e as sete abas mortas deixam de ocupar a tela. */}
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
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="endereco">
        <EnderecoBlock prefix="endereco" onBuscaCidade={onBuscaCidade} />
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="redes">
        <RedesSociaisBlock prefix="redesSociais" />
      </BlocoDoModulo>
    </div>
  )
}

export function FornecedorForm({
  fornecedor,
  readOnly = false,
  contexto,
  aviso,
  moduloEmFoco,
  onGravar: gravarDeFora,
}: {
  fornecedor: Fornecedor
  readOnly?: boolean
  /** Módulo que o lápis da ficha mandou editar (issue #103) — nasce aberto. */
  moduloEmFoco?: string | undefined
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
      <FornecedorCorpo onBuscaCidade={() => setBuscaCidadeOpen(true)} moduloEmFoco={moduloEmFoco} />

      <BuscaCidade open={buscaCidadeOpen} onOpenChange={setBuscaCidadeOpen} />
    </CadastroForm>
  )
}
