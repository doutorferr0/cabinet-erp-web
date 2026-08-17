import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { FichaDeCadastro } from '@/components/cabinet/ficha/ficha-de-cadastro'
import { cliente as esquema } from '@/features/cadastro/modulos'
import { ClienteForm } from '@/features/cliente/cliente-form'
import { CoberturaParceiro } from '@/features/parceiro/cobertura-parceiro'
import { HierarquiaParceiro } from '@/features/parceiro/hierarquia'
import { papelCliente } from '@/features/parceiro/papeis/cliente'
import { usarParceiro } from '@/features/parceiro/usar-parceiro'
import { PainelDeAtividades } from '@/features/tarefas/painel-atividades'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Cliente } from '@/mocks/clientes'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/clientes/$clienteId')({
  component: ClienteEditPage,
  validateSearch: validateModoSearch,
})

function ClienteEditPage() {
  const { clienteId } = Route.useParams()
  const { modulo: moduloEmFoco, ...search } = Route.useSearch()
  const readOnly = isConsulta(search)
  const navigate = useNavigate()
  const { query, isNovo, registro, gravar, incluir, vincular, jaExiste } = usarParceiro(
    papelCliente,
    clienteId,
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
        mensagem="Não foi possível carregar o cliente."
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  if (!registro) {
    return <p className="text-muted-foreground">Cliente não encontrado.</p>
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
        camposDeEdicao={papelCliente.camposDeEdicao}
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
    <PainelDeAtividades alvo={{ tipo: 'partner', id: clienteId }} />
  )

  // `Consul.` mostra a FICHA, não o formulário desabilitado (issue #103).
  if (readOnly && !isNovo) {
    return (
      <FichaDeCadastro
        entidade={esquema}
        registro={registro}
        titulo="Cadastro de Clientes"
        contexto={registro.nome}
        aviso={aviso}
        abaixo={atividades}
        aoFechar={() => void navigate({ to: '/cadastros/clientes' })}
        aoEditar={(moduloId) =>
          void navigate({
            to: '/cadastros/clientes/$clienteId',
            params: { clienteId },
            // Sem `modo`: sair da consulta É a ação. O `modulo` só viaja quando
            // veio do lápis de uma seção — é ele que abre o bloco na edição.
            search: moduloId ? { modulo: moduloId } : {},
          })
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ClienteForm
        cliente={registro}
        readOnly={readOnly}
        {...(moduloEmFoco ? { moduloEmFoco } : {})}
        contexto={isNovo ? 'Incluir' : registro.nome}
        aviso={aviso}
        onGravar={(v: Cliente) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
      />

      {atividades}
    </div>
  )
}
