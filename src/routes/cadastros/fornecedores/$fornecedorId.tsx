import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { FichaDeCadastro } from '@/components/cabinet/ficha/ficha-de-cadastro'
import { useRotulosDeApoio } from '@/data/lookups-api'
import { camposDoContrato, fornecedor as esquema } from '@/features/cadastro/modulos'
import { FornecedorForm } from '@/features/fornecedor/fornecedor-form'
import { CoberturaParceiro } from '@/features/parceiro/cobertura-parceiro'
import { HierarquiaParceiro } from '@/features/parceiro/hierarquia'
import { papelFornecedor } from '@/features/parceiro/papeis/fornecedor'
import { usarParceiro } from '@/features/parceiro/usar-parceiro'
import { PainelDeAtividades } from '@/features/tarefas/painel-atividades'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Fornecedor } from '@/mocks/fornecedores'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/fornecedores/$fornecedorId')({
  component: FornecedorEditPage,
  validateSearch: validateModoSearch,
})

function FornecedorEditPage() {
  const { fornecedorId } = Route.useParams()
  const { modulo: moduloEmFoco, ...search } = Route.useSearch()
  const readOnly = isConsulta(search)
  // A outra metade da #94: traduz o id de lista de apoio no nome, na leitura.
  const { carregando: carregandoApoio, rotulos } = useRotulosDeApoio()
  const navigate = useNavigate()
  const { query, isNovo, registro, gravar, incluir, vincular, jaExiste } = usarParceiro(
    papelFornecedor,
    fornecedorId,
  )

  if ((!isNovo && query.isPending) || carregandoApoio) {
    return <EsqueletoDeCarregamento />
  }

  // Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra
  // falha chega como erro — 409 é "nenhuma empresa ativa na sessão". Tratar os
  // dois como "não encontrado" mandaria procurar um registro que existe.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o fornecedor."
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  if (!registro) {
    return <p className="text-muted-foreground">Fornecedor não encontrado.</p>
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
        camposDeEdicao={papelFornecedor.camposDeEdicao}
        // O `fields[]` da recusa LEVA ao campo: o mapa sai do mesmo schema
        // que desenha o formulário, então não há tabela paralela para envelhecer.
        campos={camposDoContrato(esquema)}
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
    <PainelDeAtividades alvo={{ tipo: 'partner', id: fornecedorId }} />
  )

  // `Consul.` mostra a FICHA, não o formulário desabilitado (issue #103).

  if (readOnly && !isNovo) {
    return (
      <FichaDeCadastro
        entidade={esquema}
        {...(rotulos ? { rotulos } : {})}
        registro={registro}
        titulo="Cadastro de Fornecedores"
        contexto={registro.nomeFantasia}
        aviso={aviso}
        abaixo={atividades}
        aoFechar={() => void navigate({ to: '/cadastros/fornecedores' })}
        aoEditar={(moduloId) =>
          void navigate({
            to: '/cadastros/fornecedores/$fornecedorId',
            params: { fornecedorId },
            search: moduloId ? { modulo: moduloId } : {},
          })
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <FornecedorForm
        fornecedor={registro}
        readOnly={readOnly}
        {...(moduloEmFoco ? { moduloEmFoco } : {})}
        contexto={isNovo ? 'Incluir' : registro.nomeFantasia}
        aviso={aviso}
        onGravar={(v: Fornecedor) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
      />

      {atividades}
    </div>
  )
}
