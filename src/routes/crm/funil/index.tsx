import { ErroDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { useFunis } from '@/data/crm-api'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/crm/funil/')({
  component: EscolheFunil,
})

/**
 * `/crm/funil` sem id: manda para o funil PADRÃO da empresa e sai da frente.
 *
 * O menu lateral aponta para cá porque não pode conhecer o id de um funil da
 * empresa ativa — ele é a mesma barra para todas. Quem sabe qual é o padrão é o
 * servidor (`isDefault`), e o `replace` mantém o histórico limpo: voltar leva à
 * tela anterior, não a este desvio.
 *
 * ## O desvio não usa mais o esqueleto de CADASTRO (D22)
 *
 * Ele desenhava `EsqueletoDeCarregamento` — título, tira de abas e oito pares
 * rótulo+campo, a forma da FOLHA de cadastro. O que vem depois deste desvio é
 * um QUADRO de colunas, e essa forma nunca chega: o operador via um formulário
 * fantasma se montar e, no frame seguinte, um kanban. Esqueleto serve para
 * reservar o lugar do que vem; quando o lugar não bate, ele não evita o salto —
 * anuncia o errado.
 *
 * **E era o que fazia o desvio parecer travado.** O último ramo desta função é
 * o instante entre escolher o funil e a rota trocar, e um esqueleto de oito
 * campos ali é indistinguível de uma tela que ficou carregando para sempre —
 * não há nada escrito que diga o contrário. Agora ele DIZ para onde está indo e
 * deixa o link à mão: se por qualquer razão o desvio não acontecer, existe um
 * clique que resolve, em vez de uma mancha cinza sem saída.
 */
function EscolheFunil() {
  const navigate = useNavigate()
  const funis = useFunis()
  const escolhido = funis.data?.find((funil) => funil.isDefault) ?? funis.data?.[0]

  useEffect(() => {
    if (!escolhido) return
    void navigate({
      to: '/crm/funil/$funilId',
      params: { funilId: escolhido.id },
      replace: true,
    })
  }, [escolhido, navigate])

  // Antes do `!escolhido`, e é por isso que o ramo existe: a consulta que falha também
  // não escolhe funil nenhum, e caía na frase abaixo — mandando cadastrar um funil que
  // está lá. "Não há" e "não consegui ver" pedem gestos opostos.
  if (funis.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível consultar os funis."
        erro={funis.error}
        refazer={() => funis.refetch()}
      />
    )
  }

  if (funis.isPending) {
    return (
      <output className="t-corpo flex flex-col gap-[var(--s-2)]" aria-busy="true">
        <span className="t-pagina">Funil</span>
        <span className="t-meta">Procurando o funil padrão da empresa…</span>
      </output>
    )
  }

  if (!escolhido) {
    // Nenhum funil ativo é estado legítimo de empresa que ainda não configurou
    // o CRM. A saída é o cadastro, e a tela diz qual — em branco não diz nada.
    return (
      <div className="flex flex-col items-start gap-[var(--s-3)]">
        <p className="t-pagina">Funil</p>
        <p className="t-corpo max-w-[60ch]">
          Nenhum funil ativo nesta empresa. O quadro de oportunidades precisa de um funil com etapas
          configuradas.
        </p>
        <Link
          to="/crm/funis"
          style={{ color: 'var(--primary-text)' }}
          className="t-ui underline underline-offset-2"
        >
          Ir para o Cadastro de Funis
        </Link>
      </div>
    )
  }

  return (
    <output className="flex flex-col items-start gap-[var(--s-2)]" aria-busy="true">
      <span className="t-pagina">{escolhido.name}</span>
      <span className="t-meta">Abrindo o quadro…</span>
      {/* A saída manual do último frame: se o desvio não acontecer, existe um
          clique que resolve. É o que separa "está indo" de "travou". */}
      <Link
        to="/crm/funil/$funilId"
        params={{ funilId: escolhido.id }}
        replace
        style={{ color: 'var(--primary-text)' }}
        className="t-ui underline underline-offset-2"
      >
        Abrir {escolhido.name}
      </Link>
    </output>
  )
}
