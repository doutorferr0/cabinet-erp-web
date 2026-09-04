import type { ActivityDto } from '@/api/gerado'
import { Monograma } from '@/components/cabinet/monograma'
import { CabecalhoDeCard, MarcaDeCard } from '@/components/cabinet/painel'
import { Skeleton } from '@/components/ui/skeleton'
import { useAtividadesRecentes } from '@/data/atividades-api'
import { horaLocal } from '@/lib/datas'
import { Link } from '@tanstack/react-router'

/**
 * O FEED DE ATIVIDADE — a segunda metade do card largo do Dashboard.
 *
 * Responde "o que ANDOU": as últimas atividades concluídas da empresa, da mais
 * recente para a mais antiga, com quem fez, o que fez e a hora. O que ainda
 * espera alguém já tem duas casas nesta tela (`Agenda` e `A fazer`) — uma
 * terceira lista de pendência seria a mesma fila contada de novo.
 *
 * O recorte e a ordem são decisão da FRONTEIRA (`useAtividadesRecentes`, em
 * `src/data/atividades-api.ts`), não desta tela: ordenar seis linhas aqui
 * ordenaria só a página que veio.
 *
 * ## O que o mockup pede e o contrato não dá
 *
 * O mockup escreve a linha como *"Lívia enviou o orçamento **ORC-2314** ao
 * cliente"*, com o número do documento em mono e clicável. `ActivityDto`
 * publica `entityType` + `entityId` (uuid) e não o NÚMERO do documento — e uuid
 * não é identificador que o operador reconheça, nem coisa que ele copie para
 * comparar. Então:
 *
 * - o mono da linha é a **hora** (`.t-dado-meta`), que o mockup também tem;
 * - o clique é da LINHA INTEIRA, e leva à ficha do alvo;
 * - **não há número inventado.** Escrever "ORC-…" a partir do uuid daria um
 *   código que não existe em lugar nenhum do sistema.
 *
 * Quando o contrato publicar o número (é acréscimo em `ActivityDto`, não rota
 * nova), ele entra aqui como o mono da frase e a hora vai para a direita.
 */

/**
 * Para onde a linha leva — e por que `partner` não leva a lugar nenhum.
 *
 * Três dos quatro tipos de alvo têm ficha com endereço inequívoco. `partner` não
 * tem: o mesmo `partner` é Cliente, Fornecedor ou Profissional conforme o
 * `role`, cada papel com rota própria, e o `ActivityDto` não publica o papel.
 * Escolher um dos três no chute mandaria o operador para a ficha errada uma vez
 * em cada três.
 *
 * Devolver `null` é a MESMA regra que os KPIs seguem: vira link só quando existe
 * tela que mostra AQUELE registro. Some o clique, não o dado.
 */
export function rotaDaAtividade(atividade: ActivityDto): string | null {
  switch (atividade.entityType) {
    case 'quote':
      return `/vendas/orcamentos/${atividade.entityId}`
    case 'opportunity':
      return `/crm/oportunidades/${atividade.entityId}`
    case 'purchaseOrder':
      return `/compras/pedidos/${atividade.entityId}`
    default:
      return null
  }
}

/**
 * O PRIMEIRO nome, como no mockup ("Lívia enviou…", não "LÍVIA MORAES SILVA
 * enviou…").
 *
 * Não é preferência de estilo: o `assigneeName` vem do cadastro de colaborador,
 * onde nome é razão civil completa e às vezes em caixa alta. Medido na tela, um
 * "LUIZ FERNANDO RIBEIRO" comia a largura toda e a frase — que é o dado da
 * linha — saía truncada em "Enviar a lista de ac…". Quem desambigua homônimo é o
 * monograma ao lado (que usa as iniciais do nome INTEIRO) e o `title` da linha.
 */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome
}

/**
 * O corpo de uma linha. Vive fora de `LinhaDoFeed` porque a linha é `<a>` ou
 * `<div>` conforme haja rota, e duplicar o conteúdo nos dois ramos é como as
 * duas metades divergem depois.
 */
function CorpoDaLinha({ atividade }: { atividade: ActivityDto }) {
  const quem = atividade.assigneeName?.trim()

  return (
    <>
      {/* Monograma só com nome. Sem responsável a linha começa na frase — um
          monograma de "—" seria uma caixa colorida sem informação nenhuma. */}
      {quem ? <Monograma nome={quem} /> : <span aria-hidden="true" className="size-[26px]" />}
      <span className="t-corpo min-w-0 truncate" {...(quem ? { title: quem } : {})}>
        {quem ? (
          <>
            <b style={{ fontWeight: 500 }}>{primeiroNome(quem)}</b>{' '}
          </>
        ) : null}
        {atividade.title}
      </span>
      {/* `doneAt` é instante carimbado pelo servidor; a lista é de concluídas, e
          por isso a hora existe de verdade em toda linha. */}
      <span className="t-dado-meta shrink-0">
        {atividade.doneAt ? horaLocal(atividade.doneAt) : '—'}
      </span>
    </>
  )
}

const GRADE_DA_LINHA = {
  display: 'grid',
  gridTemplateColumns: '26px minmax(0, 1fr) auto',
  gap: 'var(--s-2)',
  padding: 'var(--s-2) var(--s-4)',
  alignItems: 'center',
} as const

function LinhaDoFeed({ atividade }: { atividade: ActivityDto }) {
  const rota = rotaDaAtividade(atividade)

  if (!rota) {
    return (
      <li
        data-slot="feed-linha"
        className="border-[var(--hairline)] border-b last:border-b-0"
        style={GRADE_DA_LINHA}
      >
        <CorpoDaLinha atividade={atividade} />
      </li>
    )
  }

  return (
    <li className="border-[var(--hairline)] border-b last:border-b-0">
      <Link
        to={rota}
        data-slot="feed-linha"
        className="no-underline hover:bg-[var(--n-50)]"
        style={GRADE_DA_LINHA}
      >
        <CorpoDaLinha atividade={atividade} />
      </Link>
    </li>
  )
}

export function FeedDeAtividade() {
  const query = useAtividadesRecentes()
  const linhas = query.data?.rows ?? []

  return (
    <>
      {/* `divisor`: a linha vem por CIMA, porque a agenda acima já fechou com a
          hairline da última linha dela. Duas hairlines encostadas na mesma
          fronteira é o defeito que §Hierarquia nomeia palavra por palavra. */}
      <CabecalhoDeCard
        divisor
        marca={<MarcaDeCard cor="var(--main)" />}
        nota={query.isPending || query.isError ? undefined : 'concluídas'}
      >
        Atividade
      </CabecalhoDeCard>

      {query.isPending ? (
        <div className="flex flex-col" style={{ gap: 'var(--s-2)', padding: 'var(--s-4)' }}>
          {['f1', 'f2', 'f3'].map((chave) => (
            <Skeleton key={chave} className="h-6 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        // Erro do feed NÃO leva `FalhaDoPainel`: ele é a segunda seção de um
        // card cuja primeira metade (a agenda) carregou, e um bloco de falha com
        // botão de repetir ali competiria com o card inteiro. O feed é leitura
        // acessória — a próxima consulta do Query já o traz.
        <p className="t-meta" style={{ padding: 'var(--s-3) var(--s-4)' }}>
          A atividade não carregou.
        </p>
      ) : linhas.length === 0 ? (
        <p className="t-meta" style={{ padding: 'var(--s-3) var(--s-4)' }}>
          Nada concluído por aqui ainda.
        </p>
      ) : (
        <ul className="flex flex-col">
          {linhas.map((atividade) => (
            <LinhaDoFeed key={atividade.id} atividade={atividade} />
          ))}
        </ul>
      )}
    </>
  )
}
