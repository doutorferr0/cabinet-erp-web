import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { FichaDeCadastro } from '@/components/cabinet/ficha/ficha-de-cadastro'
import { profissional as esquema } from '@/features/cadastro/modulos'
import { CoberturaParceiro } from '@/features/parceiro/cobertura-parceiro'
import { HierarquiaParceiro } from '@/features/parceiro/hierarquia'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { usarParceiro } from '@/features/parceiro/usar-parceiro'
import { ProfissionalForm } from '@/features/profissional/profissional-form'
import { PainelDeAtividades } from '@/features/tarefas/painel-atividades'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Profissional } from '@/mocks/profissionais'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/profissionais/$profissionalId')({
  component: ProfissionalEditPage,
  validateSearch: validateModoSearch,
})

function ProfissionalEditPage() {
  const { profissionalId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const navigate = useNavigate()
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

  // O vínculo pai/filho vale para a tela inteira e não pertence a aba nenhuma:
  // entra acima das abas, junto do aviso de cobertura. Fica FORA do
  // `<fieldset disabled>` — em consulta ele mostra o vínculo e o `readOnly` é
  // que tira as ações. **A ficha recebe o mesmo bloco**: cobertura e vínculo
  // dizem respeito ao registro, não ao ato de editar.
  const aviso = (
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
  )

  // O painel monta FORA do `<form>` do cadastro: atividade é registro próprio,
  // com gravação própria, e dentro do formulário os botões dele disputariam o
  // submit. Em `Incluir` não há id a que pendurar atividade — por isso só
  // aparece no registro que já existe.
  const atividades = isNovo ? null : (
    <PainelDeAtividades alvo={{ tipo: 'partner', id: profissionalId }} />
  )

  // `Consul.` mostra a FICHA, não o formulário desabilitado (issue #103).
  if (readOnly && !isNovo) {
    return (
      <FichaDeCadastro
        entidade={esquema}
        registro={registro}
        titulo="Cadastro de Profissional Externo"
        contexto={registro.nomeApresentacao}
        aviso={aviso}
        abaixo={atividades}
        aoFechar={() => void navigate({ to: '/cadastros/profissionais' })}
        aoEditar={() =>
          void navigate({
            to: '/cadastros/profissionais/$profissionalId',
            params: { profissionalId },
            search: {},
          })
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfissionalForm
        profissional={registro}
        readOnly={readOnly}
        contexto={isNovo ? 'Incluir' : registro.nomeApresentacao}
        aviso={aviso}
        onGravar={(v: Profissional) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
      />

      {atividades}
    </div>
  )
}
