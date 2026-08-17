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
import {
  type ModuloCadastro,
  cliente as entidadeCliente,
  propsDoIcone,
} from '@/features/cadastro/modulos'
import { SHORTCUTS, bindShortcut } from '@/lib/shortcuts'
import type { Cliente } from '@/mocks/clientes'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { ProgressoObrigatorios } from './progresso-obrigatorios'

/**
 * CADASTRO DE CLIENTE — a hierarquia vem do SCHEMA, os controles não.
 *
 * ## O que mudou, e o que deliberadamente não mudou
 *
 * Antes: onze `FormBlock` montados à mão, quatro com nome, nenhum recolhível,
 * nada dizendo o que trava o `Gravar`. A ordem e o agrupamento eram decisão
 * desta tela, e por isso divergiam do Fornecedor — 13 blocos, 6 nomeados, sobre
 * a mesma base de código (diretriz 3, `docs/direcao-visual/DIRETRIZES-UI.md`).
 *
 * Agora **quais** blocos existem, em que ordem, com que cor, qual é obrigatório
 * e o que cada um resume sai de `ENTIDADES.cliente` (issue #100). Uma fonte, e
 * as quatro telas param de divergir.
 *
 * **O que NÃO saiu do schema: os controles.** O CLAUDE.md veta form-generator
 * declarativo, e a razão aparece aqui: o CEP busca endereço, a cidade abre
 * janela de busca, `profissional` e `categoria` são `LookupCombo` com cadastro
 * rápido, CPF tem máscara. Um renderizador genérico de `CampoCadastro` teria de
 * reinventar esses comportamentos como configuração — e o primeiro campo que
 * não coubesse na configuração voltaria a ser escrito à mão, do lado de fora.
 * O schema descreve a ESTRUTURA; a tela compõe o miolo.
 *
 * ## Obrigatório fora de accordion — invariante, não estilo
 *
 * `Identificação` é o único módulo `obrigatorio` e nunca colapsa. Os demais
 * nascem fechados, com resumo e contador. Bloco fechado escondendo campo que
 * trava o `Gravar` é o defeito que a diretriz 3 nomeia; o `FormBlock` derruba o
 * render em desenvolvimento se acontecer.
 *
 * ## As abas saíram
 *
 * A transcrição §5 lista cinco abas não capturadas, e o `AbasSemCaptura` as
 * mostrava desabilitadas. Com módulos recolhíveis, a mesma informação cabe na
 * coluna: `Documentos`, `Fiscal` e `Comercial` são exatamente o que aquelas
 * abas prometiam, e agora existem de verdade em vez de existirem apagadas. O
 * que a transcrição não cobre continua sem existir — nenhum campo foi inventado.
 */

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

const UFS = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'ES', 'GO', 'DF'] as const
const SEXOS = ['MASCULINO', 'FEMININO'] as const

/** O módulo pelo `id` — se o schema o renomear, o erro é de compilação aqui. */
function modulo(id: string): ModuloCadastro {
  const achado = entidadeCliente.modulos.find((m) => m.id === id)
  if (!achado) throw new Error(`Módulo "${id}" saiu do schema do cliente`)
  return achado
}

/**
 * O bloco de um módulo do schema: título, resumo, cor e obrigatoriedade vêm de
 * lá; o miolo vem de quem chama. É o ponto exato em que a estrutura é
 * declarativa e o conteúdo não.
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

function ClienteCorpo({
  onBuscaCidade,
  moduloEmFoco,
}: { onBuscaCidade: () => void; moduloEmFoco: string | undefined }) {
  return (
    <div className="flex flex-col gap-3">
      <ProgressoObrigatorios entidade={entidadeCliente} />

      {/* Tudo que trava o Gravar mora aqui, e este bloco não colapsa. */}
      <BlocoDoModulo emFoco={moduloEmFoco} id="identificacao">
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
          <TextField name="celular" label="Celular" className="col-span-6 sm:col-span-3" />
          <TextField name="email" label="Email" className="col-span-12 sm:col-span-6" />
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="documentos">
        <div className="grid grid-cols-12 items-end gap-3">
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
          <SelectField
            name="sexo"
            label="Sexo"
            options={SEXOS}
            className="col-span-6 sm:col-span-3"
          />
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="endereco">
        <EnderecoBlock prefix="endereco" onBuscaCidade={onBuscaCidade} />
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="contatos">
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
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="fiscal">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField
            name="inscEstProdutorRural"
            label="Inscrição Estadual Produtor Rural"
            className="col-span-12 sm:col-span-6"
          />
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="comercial">
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
        </div>
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="redes">
        <RedesSociaisBlock prefix="redesSociais" />
      </BlocoDoModulo>

      <BlocoDoModulo emFoco={moduloEmFoco} id="observacao">
        <TextareaField name="observacao" label="Observação" rows={3} />
      </BlocoDoModulo>
    </div>
  )
}

export function ClienteForm({
  cliente,
  readOnly = false,
  contexto,
  aviso,
  moduloEmFoco,
  onGravar: gravarDeFora,
}: {
  cliente: Cliente
  readOnly?: boolean
  /**
   * Módulo que o lápis da ficha mandou editar (issue #103): o bloco dele nasce
   * aberto em vez de recolhido. Ausente, todos os opcionais nascem fechados.
   */
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
      <ClienteCorpo onBuscaCidade={() => setBuscaCidadeOpen(true)} moduloEmFoco={moduloEmFoco} />

      <BuscaCidade open={buscaCidadeOpen} onOpenChange={setBuscaCidadeOpen} />
    </CadastroForm>
  )
}
