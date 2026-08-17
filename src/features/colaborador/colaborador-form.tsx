import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import { FormBlock } from '@/components/cabinet/form-block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { camposDe, colaborador as esquema, propsDoIcone } from '@/features/cadastro/modulos'
import {
  CamposDoModulo,
  Pendencias,
  ProgressoDeObrigatorios,
} from '@/features/colaborador/campos-do-modulo'
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

/**
 * OS MÓDULOS VIRAM BLOCOS — mesma gramática do Profissional (#101).
 *
 * As abas saíram: `Documentos`, `Financeiro` e `Ocorrências` eram
 * `AbasSemCaptura`, isto é, promessas de conteúdo que entregavam aviso. Bloco
 * recolhido com resumo à vista diz a mesma coisa sem prometer.
 *
 * A naturalidade continua com janela própria: é o único campo do cadastro com
 * busca, e o render genérico não tem como saber disso.
 */
function BlocosDoCadastro({
  onBuscaNaturalidade,
  readOnly,
}: { onBuscaNaturalidade: () => void; readOnly: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {esquema.modulos.map((modulo) => (
        <FormBlock
          key={modulo.id}
          legend={modulo.titulo}
          colapsavel={!modulo.obrigatorio && !readOnly}
          {...(modulo.obrigatorio ? { obrigatorio: true } : {})}
          {...(modulo.cor ? { cor: modulo.cor } : {})}
          {...propsDoIcone(modulo.id)}
        >
          {/* Naturalidade e UF saem do render genérico: a primeira tem janela
              de busca e a segunda é rótulo derivado dela, não campo digitável. */}
          <CamposDoModulo
            modulo={modulo}
            {...(modulo.id === 'documentos' ? { omitir: ['cidadeNatal', 'ufNatal'] } : {})}
          />
          {modulo.id === 'documentos' ? (
            <div className="mt-3 grid grid-cols-12 items-end gap-3">
              <NaturalidadeField
                onBusca={onBuscaNaturalidade}
                className="col-span-12 sm:col-span-6"
              />
              <UfNaturalidade className="col-span-6 sm:col-span-2" />
            </div>
          ) : null}
          <Pendencias modulo={modulo} />
        </FormBlock>
      ))}
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
      <ProgressoDeObrigatorios campos={camposDe(esquema)} />

      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <BlocosDoCadastro
            onBuscaNaturalidade={() => setBuscaNaturalidadeOpen(true)}
            readOnly={readOnly}
          />
        </div>

        <FotoFrame />
      </div>

      <BuscaNaturalidade open={buscaNaturalidadeOpen} onOpenChange={setBuscaNaturalidadeOpen} />
    </CadastroForm>
  )
}
