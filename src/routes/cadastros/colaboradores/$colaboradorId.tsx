import { AvisoDadosDeExemplo } from '@/components/cabinet/aviso-dados-de-exemplo'
import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { data } from '@/data'
import { useRotulosDeApoio } from '@/data/lookups-api'
import { FichaDeRegistro } from '@/features/cadastro/ficha-de-registro'
import { colaborador as esquema } from '@/features/cadastro/modulos'
import { CoberturaDoColaborador } from '@/features/colaborador/cobertura-do-colaborador'
import { ColaboradorForm } from '@/features/colaborador/colaborador-form'
import { resumoDoColaborador } from '@/features/colaborador/ficha-resumo'
import { usarColaborador } from '@/features/colaborador/usar-colaborador'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Colaborador } from '@/mocks/colaboradores'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/colaboradores/$colaboradorId')({
  component: ColaboradorEditPage,
  validateSearch: validateModoSearch,
})

function ColaboradorEditPage() {
  const { colaboradorId } = Route.useParams()
  const { modulo: moduloEmFoco, ...search } = Route.useSearch()
  const readOnly = isConsulta(search)
  // A outra metade da #94: traduz o id de lista de apoio no nome, na leitura.
  const { carregando: carregandoApoio, rotulos } = useRotulosDeApoio()
  const navigate = useNavigate()
  // A ficha CRUA do servidor fica na query, e não só o `Colaborador` derivado:
  // o corpo do `PUT` devolve `document` e `photoUrl` como vieram, e eles não
  // têm campo no formulário (#402). Ver `usar-colaborador.ts`.
  const { query, isNovo, registro, incluir, gravar } = usarColaborador(colaboradorId)

  if ((!isNovo && query.isPending) || carregandoApoio) {
    return <EsqueletoDeCarregamento />
  }

  // Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra
  // falha chega como erro — 403 é papel insuficiente, 409 é "nenhuma empresa
  // ativa na sessão". Tratar os dois como "não encontrado" mandaria procurar um
  // registro que existe.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o colaborador."
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  if (!registro) {
    return <p className="text-muted-foreground">Colaborador não encontrado.</p>
  }

  // `Consul.` mostra a FICHA, não o formulário desabilitado (issue #103): ler é
  // o uso mais frequente do cadastro, e o caminho de volta à edição é o lápis
  // por módulo. `Incluir` nunca cai aqui — não há o que ler num registro que
  // ainda não existe.

  // Este detalhe NÃO passa por `TelaDeDocumento` (a ficha e o formulário são
  // duas telas, escolhidas pelo modo), então o aviso é montado à mão nos dois
  // braços — é a exceção que `dados-de-exemplo-avisado.test.tsx` conhece pelo
  // nome.
  if (readOnly && !isNovo) {
    return (
      <div className="flex flex-col gap-4">
        <AvisoDadosDeExemplo origem={data.colaboradores.origem} />
        <FichaDeRegistro
          entidade={esquema}
          {...(rotulos ? { rotulos } : {})}
          registro={registro}
          titulo="Colaborador"
          nome={registro.nome}
          {...(query.data?.jobTitle ? { meta: query.data.jobTitle } : {})}
          ativo={registro.ativo}
          // `PUT /api/employees/{id}` com o `active` invertido. Continua o
          // caminho do Gravar — e continua `admin` no contrato: quem opera com
          // `operator-full` recebe 403, e o erro sai no diálogo em vez de a
          // tela fingir que gravou.
          aoAlternarAtivo={() => gravar.mutate({ ...registro, ativo: !registro.ativo })}
          alternando={gravar.isPending}
          resumo={resumoDoColaborador(query.data)}
          aoEditar={(moduloId) =>
            void navigate({
              to: '/cadastros/colaboradores/$colaboradorId',
              params: { colaboradorId },
              search: moduloId ? { modulo: moduloId } : {},
            })
          }
        />
      </div>
    )
  }

  return (
    // O título deixou de ser montado aqui: quem o diz é a banda do CadastroForm.
    // A rota só informa o CONTEXTO, que é o que ela sabe (modo e registro).
    <div className="flex flex-col gap-4">
      <AvisoDadosDeExemplo origem={data.colaboradores.origem} />
      <ColaboradorForm
        colaborador={registro}
        readOnly={readOnly}
        contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : registro.nome}
        {...(moduloEmFoco ? { moduloEmFoco } : {})}
        gravando={incluir.isPending || gravar.isPending}
        aviso={
          <CoberturaDoColaborador isNovo={isNovo} erro={isNovo ? incluir.error : gravar.error} />
        }
        // `POST` em `/novo`, `PUT` em edição — quem sabe disso é a ROTA, que lê
        // o id da URL. O formulário não tem como distinguir "id em branco
        // porque é novo" de "id em branco porque a ficha não chegou".
        onGravar={(v: Colaborador) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
      />
    </div>
  )
}
