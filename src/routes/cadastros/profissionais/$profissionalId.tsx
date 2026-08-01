import type { PartnerDto } from '@/api/gerado'
import { Button } from '@/components/ui/button'
import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
import {
  atualizarParceiro,
  corpoDeEscrita,
  corpoDeInclusao,
  idDoParceiroExistente,
  incluirParceiro,
  vincularParceiro,
} from '@/data/parceiros-api'
import { ProfissionalForm } from '@/features/profissional/profissional-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { type Profissional, profissionalVazio } from '@/mocks/profissionais'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/cadastros/profissionais/$profissionalId')({
  component: ProfissionalEditPage,
  validateSearch: validateModoSearch,
})

/**
 * Linha da listagem → registro do formulário.
 *
 * Base em `fornecedorVazio`: o que o `PartnerDto` não cobre nasce em branco, e é
 * assim que deve ficar. Herdar de mock daria dado de mentira com cara de dado do
 * servidor. O `id` numérico do mock fica em 0 — a chave real é o uuid, e quem o
 * guarda é a rota, não o formulário.
 */
function profissionalDoParceiro(dto: PartnerDto): Profissional {
  return {
    ...profissionalVazio(0),
    nome: dto.legalName,
    nomeApresentacao: dto.tradeName ?? '',
    cpf: dto.document ?? '',
    email: dto.email ?? '',
    ativo: dto.active,
  }
}

function ProfissionalEditPage() {
  const { profissionalId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = profissionalId === 'novo'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Capturado UMA vez: a linha veio da listagem pelo cache, e o cache pode ser
  // recolhido enquanto o formulário está aberto. O corpo do PUT precisa dela
  // inteira até o fim da edição (`code` e `paymentTerms` viajam de volta sem
  // passar por campo nenhum da tela).
  const [linha] = useState<PartnerDto | null>(
    () => queryClient.getQueryData<PartnerDto>(['parceiro', profissionalId]) ?? null,
  )

  const gravar = useMutation({
    mutationFn: (values: Profissional) => {
      if (!linha) throw new Error('Sem a linha da listagem não há o que gravar.')
      return atualizarParceiro(
        linha.id,
        corpoDeEscrita(linha, {
          legalName: values.nome,
          tradeName: values.nomeApresentacao,
          document: values.cpf,
          email: values.email,
          active: values.ativo,
        }),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profissionais'] })
      void navigate({ to: '/cadastros/profissionais' })
    },
  })

  const incluir = useMutation({
    mutationFn: (values: Profissional) =>
      incluirParceiro(
        corpoDeInclusao('professional', {
          legalName: values.nome,
          tradeName: values.nomeApresentacao,
          document: values.cpf,
          email: values.email,
          active: values.ativo,
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profissionais'] })
      void navigate({ to: '/cadastros/profissionais' })
    },
  })

  // O 409 de documento repetido não é beco: o cadastro existe no GRUPO e só falta
  // esta empresa se ligar a ele. Criar outro geraria duplicata do mesmo CNPJ.
  const jaExiste = idDoParceiroExistente(incluir.error)

  const vincular = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => vincularParceiro(id, ativo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profissionais'] })
      void navigate({ to: '/cadastros/profissionais' })
    },
  })

  const registro = isNovo
    ? data.profissionais.empty(0)
    : linha
      ? profissionalDoParceiro(linha)
      : null

  if (!registro) {
    return (
      <p className="max-w-prose text-muted-foreground">
        Abra o profissional pela listagem. O contrato tem <code>PUT /api/partners/{'{id}'}</code>{' '}
        mas não tem leitura por id, então é a linha selecionada que traz o registro — link direto e
        recarga ficam sem ele.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de Fornecedores{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${registro.nomeApresentacao}`}
      </h1>
      <AvisoDeCobertura
        isNovo={isNovo}
        erro={isNovo ? (vincular.error ?? incluir.error) : gravar.error}
        {...(jaExiste && !vincular.error
          ? {
              vincular: () =>
                vincular.mutate({ id: jaExiste, ativo: incluir.variables?.ativo ?? true }),
              vinculando: vincular.isPending,
            }
          : {})}
      />
      <ProfissionalForm
        profissional={registro}
        readOnly={readOnly}
        onGravar={(v: Profissional) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
      />
    </div>
  )
}

/**
 * O contrato cobre 5 campos de um cadastro que tem dezenas. Sem este aviso, aba
 * em branco se lê como cadastro incompleto e `Gravar` parece ter guardado tudo.
 */
function AvisoDeCobertura({
  isNovo,
  erro,
  vincular,
  vinculando,
}: {
  isNovo: boolean
  erro: unknown
  /** Presente quando o 409 trouxe o cadastro que já existe no grupo. */
  vincular?: () => void
  vinculando?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="max-w-prose text-[0.75rem] text-muted-foreground">
        {isNovo ? (
          <>
            <strong>Gravar</strong> cria o cadastro com {'{'}nome, documento, e-mail e situação{'}'}{' '}
            e o papel desta tela. Os demais campos não são enviados — o contrato ainda não os tem.
          </>
        ) : (
          <>
            <strong>Gravar</strong> envia ao servidor apenas Nome, Nome de Apresentação, CPF/CNPJ,
            E-mail e Ativo. Os demais campos aparecem em branco e não são enviados.
          </>
        )}
      </p>
      {erro ? (
        <div role="alert" className="flex max-w-prose flex-col items-start gap-2">
          <p className="text-[0.75rem] text-destructive">
            Não foi possível gravar. {erro instanceof ErroDaApi && erro.detail ? erro.detail : null}
          </p>
          {/* Vincular NÃO edita o cadastro do grupo: liga esta empresa a ele. O
              que a empresa vizinha cadastrou fica como está — ajustar depois é o
              Alterar, que é explícito. */}
          {vincular ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={vincular}
              disabled={vinculando}
            >
              {vinculando ? 'Vinculando…' : 'Vincular esta empresa ao cadastro existente'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
