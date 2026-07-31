import type { PartnerDto } from '@/api/gerado'
import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
import { atualizarParceiro, corpoDeEscrita } from '@/data/parceiros-api'
import { ClienteForm } from '@/features/cliente/cliente-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { type Cliente, clienteVazio } from '@/mocks/clientes'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/cadastros/clientes/$clienteId')({
  component: ClienteEditPage,
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
function clienteDoParceiro(dto: PartnerDto): Cliente {
  return {
    ...clienteVazio(0),
    nome: dto.legalName,
    cpf: dto.document ?? '',
    email: dto.email ?? '',
    ativo: dto.active,
  }
}

function ClienteEditPage() {
  const { clienteId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = clienteId === 'novo'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Capturado UMA vez: a linha veio da listagem pelo cache, e o cache pode ser
  // recolhido enquanto o formulário está aberto. O corpo do PUT precisa dela
  // inteira até o fim da edição (`code` e `paymentTerms` viajam de volta sem
  // passar por campo nenhum da tela).
  const [linha] = useState<PartnerDto | null>(
    () => queryClient.getQueryData<PartnerDto>(['parceiro', clienteId]) ?? null,
  )

  const gravar = useMutation({
    mutationFn: (values: Cliente) => {
      if (!linha) throw new Error('Sem a linha da listagem não há o que gravar.')
      return atualizarParceiro(
        linha.id,
        // `tradeName` volta como veio: a tela de Clientes não tem Nome Fantasia,
        // e mandar `null` apagaria o que outra tela gravou.
        corpoDeEscrita(linha, {
          legalName: values.nome,
          tradeName: linha.tradeName,
          document: values.cpf,
          email: values.email,
          active: values.ativo,
        }),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientes'] })
      void navigate({ to: '/cadastros/clientes' })
    },
  })

  const registro = isNovo ? data.clientes.empty(0) : linha ? clienteDoParceiro(linha) : null

  if (!registro) {
    return (
      <p className="max-w-prose text-muted-foreground">
        Abra o cliente pela listagem. O contrato tem <code>PUT /api/partners/{'{id}'}</code> mas não
        tem leitura por id, então é a linha selecionada que traz o registro — link direto e recarga
        ficam sem ele.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de Fornecedores{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${registro.nome}`}
      </h1>
      <AvisoDeCobertura isNovo={isNovo} erro={gravar.error} />
      <ClienteForm
        cliente={registro}
        readOnly={readOnly}
        {...(isNovo ? {} : { onGravar: (v: Cliente) => gravar.mutate(v) })}
      />
    </div>
  )
}

/**
 * O contrato cobre 5 campos de um cadastro que tem dezenas. Sem este aviso, aba
 * em branco se lê como cadastro incompleto e `Gravar` parece ter guardado tudo.
 */
function AvisoDeCobertura({ isNovo, erro }: { isNovo: boolean; erro: unknown }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="max-w-prose text-[0.75rem] text-muted-foreground">
        {isNovo ? (
          <>
            O contrato ainda não atende a inclusão de parceiro por esta tela —{' '}
            <strong>Gravar não envia nada ao servidor</strong>.
          </>
        ) : (
          <>
            <strong>Gravar</strong> envia ao servidor apenas Nome, CPF/CNPJ, E-mail e Ativo. Os
            demais campos aparecem em branco e não são enviados.
          </>
        )}
      </p>
      {erro ? (
        <p role="alert" className="max-w-prose text-[0.75rem] text-destructive">
          Não foi possível gravar. {erro instanceof ErroDaApi && erro.detail ? erro.detail : null}
        </p>
      ) : null}
    </div>
  )
}
