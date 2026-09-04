import type { TaskDto } from '@/api/gerado'
import { FaixaDeKpi, KpiTile } from '@/components/cabinet/kpi-tile'
import { type CargaDaPessoa, cargaPorPessoa } from '@/data/dashboard-api'
import { type ApuracaoDoQuadro, apurarQuadro, hojeISO } from './apuracao'

/**
 * A FAIXA DO QUADRO (`bstrip` do mockup) — três KPIs à esquerda, carga por
 * responsável à direita, entre o cabeçalho da página e o quadro.
 *
 * Substitui o painel `Progresso das Tarefas` do 1.x, que dizia a mesma coisa em
 * outra forma: três grandezas separadas por divisor vertical dentro de um card
 * de contorno grosso, mais um segundo card com as barras. O que muda não é o
 * dado — é a leitura. Os três números viram tiles TINTADOS pelo assunto
 * (concluídas mint, em aberto sky, atrasadas sand), que é o que permite achar o
 * problema sem ler os rótulos, e a barra de progresso agregada sai: ela somava
 * o quadro inteiro numa porcentagem que ninguém aciona, enquanto a carga por
 * pessoa responde a pergunta que se aciona ("quem está segurando o quê").
 *
 * ## Atrasadas é o KPI novo, e é o motivo da faixa existir
 *
 * O 1.x não contava atraso em lugar nenhum: prazo vencido era uma data igual às
 * outras dentro do cartão. O mockup põe o atraso na faixa, com o nome da pior —
 * resumo antes do detalhe (Stripe), anomalia ao lado do total (Ramp).
 *
 * ## Separação (§Hierarquia)
 *
 * Entre os dois blocos, ESPAÇO (`--s-3`): o tile e o card já se separam do
 * plano por conta própria, e uma linha entre eles seria a segunda ferramenta na
 * mesma fronteira. A quebra é por `flex-wrap` com base em `flex-basis`, nunca
 * por `@media` — quem decide se cabem lado a lado é a largura disponível, que
 * muda com a sidebar recolhida e não só com a janela.
 */
export function FaixaDoQuadro({
  tarefas,
  hoje = hojeISO(),
}: { tarefas: readonly TaskDto[]; hoje?: string }) {
  const apuracao = apurarQuadro(tarefas, hoje)
  const carga = cargaPorPessoa([...tarefas])

  return (
    <div
      data-slot="faixa-do-quadro"
      // `items-start`, não `stretch`: os dois blocos crescem com o que têm
      // dentro, e o tile do KPI é três linhas fixas. Esticado até a altura da
      // carga (que cresce com o número de pessoas), ele ganharia um vazio do
      // tamanho da diferença — o mesmo defeito que `items-start` já resolveu
      // nas colunas do quadro.
      className="flex flex-wrap items-start"
      style={{ gap: 'var(--s-3)' }}
    >
      {/* As proporções do mockup (1.1fr / 1.6fr) viram `flex-grow`: mesma
          divisão quando cabem na linha, e cada um ocupa a largura inteira
          quando não cabem. */}
      <div className="min-w-0 flex-[1.1_1_320px]">
        <Kpis apuracao={apuracao} />
      </div>
      <div className="min-w-0 flex-[1.6_1_320px]">
        <CargaPorResponsavel carga={carga} />
      </div>
    </div>
  )
}

function Kpis({ apuracao }: { apuracao: ApuracaoDoQuadro }) {
  return (
    <FaixaDeKpi
      // Os TRÊS lado a lado, como no mockup (`repeat(3,1fr)`). O padrão da
      // peça pede 220px por tile, largura pensada para os quatro de uma
      // listagem ocupando a página inteira; aqui a faixa divide a linha com a
      // carga, e com 220px o terceiro tile caía para uma segunda fileira —
      // medido na primeira captura. `auto-fit` continua: a quebra reage ao
      // espaço real, nunca a um `@media`.
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))' }}
    >
      <KpiTile
        rotulo="Concluídas"
        valor={apuracao.concluidas}
        tint="mint"
        // "de N no quadro", e não "esta semana" como o mockup escreve: sem
        // campo de conclusão no `TaskDto`, a janela de tempo não é derivável.
        nota={`de ${apuracao.total} no quadro`}
      />
      <KpiTile
        rotulo="Em aberto"
        valor={apuracao.emAberto}
        tint="sky"
        nota={apuracao.emRevisao > 0 ? `${apuracao.emRevisao} em revisão` : 'nenhuma em revisão'}
      />
      <KpiTile
        rotulo="Atrasadas"
        valor={apuracao.atrasadas}
        tint="sand"
        // O tile só grita quando há o que gritar. Zero atrasadas em vermelho
        // treinaria o olho a ignorar a cor no dia em que ela significar algo.
        alerta={apuracao.atrasadas > 0}
        nota={
          apuracao.piorAtraso
            ? `${apuracao.piorAtraso.titulo} · ${apuracao.piorAtraso.dias} ${apuracao.piorAtraso.dias === 1 ? 'dia' : 'dias'}`
            : 'nenhuma passou do prazo'
        }
      />
    </FaixaDeKpi>
  )
}

/**
 * Os quatro tints que o mockup usa nos avatares da carga, na ordem em que ele
 * os escreve. A cor é ESTÁVEL por pessoa (sai do id, não da posição): por
 * posição, alguém entrando na lista repintaria todo mundo, e o operador que
 * aprendeu "a lilás é a Lívia" perderia a referência a cada tarefa criada.
 */
const TINTS_DE_PESSOA = [
  'var(--tint-lilac)',
  'var(--tint-sky)',
  'var(--tint-sand)',
  'var(--tint-mint)',
] as const

export function tintDaPessoa(id: string): string {
  let soma = 0
  for (let i = 0; i < id.length; i += 1) soma = (soma * 31 + id.charCodeAt(i)) % 100_000
  return TINTS_DE_PESSOA[soma % TINTS_DE_PESSOA.length] ?? TINTS_DE_PESSOA[0]
}

/**
 * CARGA POR RESPONSÁVEL (`dcard` + `.load` do mockup).
 *
 * Card quieto: folha, borda `--n-300` e `--hard-soft`. A sombra DURA de tinta é
 * uma por tela e já está nos KPIs ao lado — este card não disputa com eles.
 * Header separado do corpo por hairline, que é a única linha da peça.
 *
 * Uma tarefa com dois responsáveis conta para os DOIS (a regra é de
 * `cargaPorPessoa`, em `src/data/dashboard-api.ts`), então somar a coluna `n/m`
 * não dá o total do quadro — é por isso que não há linha de total aqui.
 */
function CargaPorResponsavel({ carga }: { carga: readonly CargaDaPessoa[] }) {
  return (
    <section
      data-slot="carga-por-responsavel"
      className="flex h-full flex-col overflow-hidden rounded-card border border-[var(--n-300)] bg-[var(--n-0)] shadow-[var(--hard-soft)]"
    >
      <header
        className="flex items-center border-[var(--n-200)] border-b"
        style={{ gap: 'var(--s-2)', padding: 'var(--s-3) var(--s-4)' }}
      >
        <h3 className="t-bloco truncate">Carga por responsável</h3>
        <span className="t-dado-meta ml-auto shrink-0">feitas / total</span>
      </header>

      {carga.length === 0 ? (
        <p className="t-meta" style={{ padding: 'var(--s-3) var(--s-4)' }}>
          Nenhuma tarefa tem responsável — a carga aparece quando alguém assume.
        </p>
      ) : (
        <ul
          className="flex flex-col"
          style={{ gap: 'var(--s-2)', padding: 'var(--s-3) var(--s-4)' }}
        >
          {carga.map((pessoa) => (
            <LinhaDeCarga key={pessoa.id} pessoa={pessoa} />
          ))}
        </ul>
      )}
    </section>
  )
}

function LinhaDeCarga({ pessoa }: { pessoa: CargaDaPessoa }) {
  return (
    <li
      data-slot="linha-de-carga"
      className="grid items-center"
      // As quatro colunas do mockup: avatar · nome · barra · fração. O nome tem
      // largura fixa para as barras começarem todas no mesmo x — barra que
      // começa onde o nome acabou não se compara com a de cima.
      style={{ gridTemplateColumns: '22px minmax(0, 110px) 1fr 44px', gap: 'var(--s-2)' }}
    >
      <span
        aria-hidden="true"
        className="t-dado-meta grid size-[22px] place-content-center rounded-item border border-[var(--n-300)]"
        style={{ background: tintDaPessoa(pessoa.id), color: 'var(--n-900)' }}
      >
        {pessoa.iniciais}
      </span>
      <span className="t-ui truncate">{pessoa.nome}</span>
      {/* A barra é FORMA: a fração ao lado já diz o número, e um `progressbar`
          aqui faria o leitor de tela anunciar a mesma coisa duas vezes. */}
      <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[var(--n-200)]">
        <span
          className="block h-full bg-[var(--n-900)]"
          style={{ width: `${Math.max(0, Math.min(100, pessoa.percentual))}%` }}
        />
      </span>
      <span className="t-dado-meta text-right">
        {pessoa.concluidas}/{pessoa.total}
      </span>
    </li>
  )
}
