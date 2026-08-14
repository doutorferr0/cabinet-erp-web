import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { CoberturaParceiro } from '@/features/parceiro/cobertura-parceiro'
import { HierarquiaParceiro } from '@/features/parceiro/hierarquia'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { usarParceiro } from '@/features/parceiro/usar-parceiro'
import { ProfissionalForm } from '@/features/profissional/profissional-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Profissional } from '@/mocks/profissionais'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/profissionais/$profissionalId')({
  component: ProfissionalEditPage,
  validateSearch: validateModoSearch,
})

function ProfissionalEditPage() {
  const { profissionalId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const { query, isNovo, registro, gravar, incluir, vincular, jaExiste } = usarParceiro(
    papelProfissional,
    profissionalId,
  )

  if (!isNovo && query.isPending) {
    return <EsqueletoDeCarregamento />
  }

  // Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra
  // falha chega como erro — 409 é "nenhuma empresa ativa na sessão". Tratar os
  // dois como "não encontrado" mandaria procurar um registro que existe.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o profissional."
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  if (!registro) {
    return <p className="text-muted-foreground">Profissional não encontrado.</p>
  }

  return (
    <ProfissionalForm
      profissional={registro}
      readOnly={readOnly}
      contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : registro.nomeApresentacao}
      aviso={
        // O vínculo pai/filho vale para a tela inteira e não pertence a aba
        // nenhuma: entra aqui, acima das abas, junto do aviso de cobertura.
        // Fica FORA do `<fieldset disabled>` — em consulta ele mostra o
        // vínculo e o `readOnly` é que tira as ações.
        <>
          <CoberturaParceiro
            isNovo={isNovo}
            erro={isNovo ? (vincular.error ?? incluir.error) : gravar.error}
            camposDeEdicao={papelProfissional.camposDeEdicao}
            {...(jaExiste && !vincular.error
              ? {
                  vincular: () =>
                    vincular.mutate({ id: jaExiste, ativo: incluir.variables?.ativo ?? true }),
                  vinculando: vincular.isPending,
                }
              : {})}
          />
          <HierarquiaParceiro parceiro={query.data ?? null} readOnly={readOnly} />
        </>
      }
      onGravar={(v: Profissional) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
    />
  )
}
