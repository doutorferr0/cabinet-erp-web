import { EnderecoBlock } from '@/components/cabinet/blocks'
import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import {
  CamposDoModulo,
  Pendencias,
  ProgressoDeObrigatorios,
} from '@/components/cabinet/campos-do-modulo'
import { FormBlock } from '@/components/cabinet/form-block'
import { TextField } from '@/components/cabinet/form-controls'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Input } from '@/components/ui/input'
import { data } from '@/data'
import { camposDe, profissional as esquema, propsDoIcone } from '@/features/cadastro/modulos'
import { ContatosDoParceiro } from '@/features/parceiro/contatos-do-parceiro'
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
  observacao: z.string(),
})

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

/**
 * O bloco do banco tem janela de busca, então não sai do render genérico: o
 * `nomeBanco` é um `CampoComBusca` sobre `SearchDialog`, e o `numeroBanco` é
 * somente-leitura porque quem o preenche é a seleção da janela. Trocá-lo por
 * `TextField` perderia a busca que o §3 da transcrição pede.
 */
function BlocoBancario({ onBuscaBanco }: { onBuscaBanco: () => void }) {
  const { register } = useFormContext<Profissional>()
  return (
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
      <TextField name="numeroAgencia" label="Nº da agência" className="col-span-6 sm:col-span-3" />
      <TextField name="numeroConta" label="Nº da conta" className="col-span-6 sm:col-span-3" />
    </div>
  )
}

/**
 * OS MÓDULOS VIRAM BLOCOS — um `FormBlock` por módulo do schema, na ordem dele.
 *
 * As abas saíram. `Contatos/Observação` e `Participação` eram abas VAZIAS
 * (`AbasSemCaptura`), e a hierarquia por bloco recolhido responde melhor à
 * mesma pergunta: o que é opcional fica fechado, com o resumo à vista, em vez
 * de escondido atrás de uma aba que anuncia conteúdo e entrega aviso.
 *
 * `obrigatorio` vem do schema e é o único bloco sempre aberto — a invariante da
 * diretriz 3 (campo que trava o Gravar nunca mora em bloco recolhível) é
 * garantida pelo `FormBlock`, não pela disciplina de quem escreve a tela.
 */
function BlocosDoCadastro({
  onBuscaCidade,
  onBuscaBanco,
  readOnly,
  moduloEmFoco,
  partnerId,
}: {
  onBuscaCidade: (p: PrefixoCidade) => void
  onBuscaBanco: () => void
  readOnly: boolean
  moduloEmFoco: string | undefined
  partnerId: string | null
}) {
  return (
    <div className="flex flex-col gap-3">
      {esquema.modulos.map((modulo) => {
        const enderecoPrefixo: PrefixoCidade | null =
          modulo.id === 'endereco'
            ? 'endereco'
            : modulo.id === 'enderecoBanco'
              ? 'enderecoBanco'
              : null

        return (
          <FormBlock
            key={modulo.id}
            legend={modulo.titulo}
            colapsavel={!modulo.obrigatorio && !readOnly}
            {...(moduloEmFoco === modulo.id ? { iniciaAberto: true } : {})}
            {...(modulo.obrigatorio ? { obrigatorio: true } : {})}
            {...(modulo.cor ? { cor: modulo.cor } : {})}
            {...propsDoIcone(modulo.id)}
          >
            {/* Endereço mantém o bloco compartilhado: é ele que traz a busca de
                CEP e a janela de cidade, que o render genérico não tem. */}
            {enderecoPrefixo ? (
              <EnderecoBlock
                prefix={enderecoPrefixo}
                onBuscaCidade={() => onBuscaCidade(enderecoPrefixo)}
              />
            ) : modulo.id === 'bancario' ? (
              <BlocoBancario onBuscaBanco={onBuscaBanco} />
            ) : (
              <CamposDoModulo modulo={modulo} />
            )}
            {/* A GRADE de contatos (#293) entra no módulo que já é o lugar do
                assunto — `Outros contatos` reúne os telefones do cadastro, e a
                lista de quem ATENDE nele é o resto da mesma pergunta. Ela não
                sai de `CamposDoModulo` porque não é campo do registro: é o
                sub-recurso `/api/partners/{id}/contacts`, com gravação
                própria. */}
            {modulo.id === 'contatos' ? (
              <ContatosDoParceiro partnerId={partnerId} readOnly={readOnly} />
            ) : null}
            <Pendencias modulo={modulo} />
          </FormBlock>
        )
      })}
    </div>
  )
}

export function ProfissionalForm({
  profissional,
  readOnly = false,
  contexto,
  aviso,
  moduloEmFoco,
  partnerId = null,
  onGravar: gravarDeFora,
  gravou = false,
}: {
  profissional: Profissional
  readOnly?: boolean
  /**
   * O uuid do cadastro, para o sub-recurso de contatos. `null` no `Incluir`:
   * sem registro gravado não há a que pendurar contato.
   */
  partnerId?: string | null
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
  onGravar?: (values: Profissional) => void
  /**
   * Gravação que deu certo (#405) — a alteração PERMANECE na tela, e é este
   * sinal que devolve o formulário ao estado limpo. Ver `CadastroForm`.
   */
  gravou?: boolean
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
      gravou={gravou}
      titulo="Cadastro de Profissional Externo"
      familia="partners"
      {...(contexto ? { contexto } : {})}
      {...(aviso ? { aviso } : {})}
    >
      <ProgressoDeObrigatorios campos={camposDe(esquema)} />

      <BlocosDoCadastro
        onBuscaCidade={setBuscaCidadePrefix}
        onBuscaBanco={() => setBuscaBancoOpen(true)}
        readOnly={readOnly}
        moduloEmFoco={moduloEmFoco}
        partnerId={partnerId}
      />

      <BuscaCidade prefix={buscaCidadePrefix} onOpenChange={setBuscaCidadePrefix} />
      <BuscaBanco open={buscaBancoOpen} onOpenChange={setBuscaBancoOpen} />
    </CadastroForm>
  )
}
