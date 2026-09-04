import type { PlanItemDtoKind, ProjectPlanDto } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Barra as BarraDeProgresso, Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErroDaApi } from '@/data/api-provider'
import { useReadOnlyPorPapel } from '@/data/papeis'
import {
  FILTROS,
  type FiltroDeProjeto,
  usePlanoDoProjeto,
  useProjetos,
  useReagendarItem,
} from '@/data/planner-api'
import { Gantt } from '@svar-ui/react-gantt'
// O tema do gantt vem COM o gantt, e não do `src/main.tsx` (#227): folha de
// lib importada na entrada é paga em toda página por causa de uma tela. O
// especificador é `style.css` e não `all.css` — este último traz grid, editor,
// menu e toolbar da suíte SVAR, que o planner não monta.
import '@svar-ui/react-gantt/style.css'
// A PELE 2.0 do gantt, depois da folha do vendor — ordem importa: o que está
// aqui sobrescreve o que veio de lá. Ver o cabeçalho do arquivo.
import './gantt-2.0.css'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type EventoDeTarefa,
  TIPOS,
  janelaDoPlano,
  progressoDoProjeto,
  reagendamentoDoEvento,
  tarefasDoPlano,
  totalDeItens,
} from './dados-do-gantt'
import { LinhaDoHoje } from './linha-do-hoje'

/**
 * PLANNER — o gantt do projeto, em LEITURA, agora sobre `@svar-ui/react-gantt`.
 *
 * ## O que a troca tirou daqui
 *
 * Saiu `escala.ts` inteiro: a grade em porcentagem, o cabeçalho de meses, a
 * largura mínima de um dia, a linha do agora e o empilhamento de barras que se
 * sobrepõem. Era código correto e testado, e a razão de ir embora não é ele ser
 * ruim — é ser NOSSO. Geometria de gantt é problema resolvido, e manter uma
 * segunda solução ao lado da que a lib traz custa o dobro a cada mudança
 * (decisão do user, 2026-08-19: substituir, não manter em paralelo).
 *
 * O que ficou é o que o SVAR não sabe: o recorte de projeto, o Andamento e as
 * três frases de estado vazio — que são deste domínio, não do gantt.
 *
 * ## ARRASTAR DATAS entrou; dependência e recorrência não
 *
 * A spec aprovada (`topicos/dashboard.md` @planner) punha arrastar, redimensionar
 * e dependência fora da fase 1 — e a versão anterior deste arquivo citava isso
 * como razão do `readonly` fixo. **O user decidiu depois** que reagendar pelo
 * arraste é a interação mínima da primeira entrega; dependência entre tarefas e
 * recorrência ficam para a rodada seguinte. Esta nota fica no lugar da antiga
 * porque prosa que descreve um mundo que mudou envelhece calada.
 *
 * O que a decisão trouxe junto: o gesto precisa de um caminho de ESCRITA, e não
 * havia nenhum. `PATCH /api/projects/{projectId}/plan/items/{itemId}` entrou no
 * contrato marcado `Proposto`, como a própria spec manda para o que o Planner
 * precisa e o backend ainda não serve.
 *
 * **`readonly` não sumiu — virou pergunta de PAPEL.** A família `projects` pede
 * `owner` para escrever (`PAPEL_MINIMO_POR_FAMILIA`), então quem não alcança
 * continua vendo o gantt de leitura, e vendo POR QUÊ. Oferecer o gesto a quem o
 * servidor vai recusar faz a barra andar e voltar sem explicação, que é a forma
 * mais confusa de dizer "você não pode".
 *
 * Continuam desligados: **dependência entre tarefas** (rodada 2) e o **card de
 * detalhe** da spec (ícone, datas, progresso e link) — este último por não ser
 * alcançável neste runner, ver o cabeçalho de `planner.test.tsx`, e entregar
 * desenho que nenhuma bateria toca é entregar não medido.
 *
 * **Nada de `schedule`, `baselines` ou `criticalPath`:** os três existem na
 * tipagem e são PRO PAGO no SVAR. A spec não pede nenhum, e por isso a troca
 * passou sem virar blocker — mas ligar qualquer um deles depois é decisão
 * comercial, não técnica.
 *
 * ## A cor continua seguindo o TIPO
 *
 * A decisão registrada quando o gantt era caseiro vale igual: a fase já é lida
 * pela coluna da esquerda, e a barra usa o par de módulo que o sistema ensinou
 * em outras telas. O que muda é ONDE isso é dito — antes era classe no botão,
 * agora é o `taskTemplate`, que é o gancho do SVAR para o conteúdo da barra.
 */

/** Nomes de mês em pt-BR — o SVAR não traz locale nosso. */
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

/** `jan` — sem o ponto que o `Intl` põe e sem o ano, que é a faixa de cima. */
function mesCurto(data: Date): string {
  return MES.format(data).replace('.', '')
}

/**
 * Duas faixas no cabeçalho: ano e mês.
 *
 * A spec pede "13 colunas, ex. jan'26–jan'27". Uma faixa só de `mar 26` repete
 * o ano treze vezes; separar em ano + mês devolve a leitura do mockup e libera
 * a linha de baixo para o mês curto.
 *
 * **As duas faixas são FUNÇÃO, e a de cima não era.** `format: 'yyyy'` estava
 * escrito como se o SVAR aceitasse o padrão do Java/date-fns; ele usa `%`
 * (`%F %Y` é o default dele), então `yyyy` não casava nada e a faixa do ano
 * imprimia as quatro letras `yyyy` — literalmente, em toda a largura do quadro,
 * onde deveria estar `2026`. Medido no navegador em 02/09/2026, e é o tipo de
 * defeito que passa por "ainda carregando" para quem olha de longe. Função em
 * vez de `%Y` porque, resolvido assim, o formato deixa de depender de qual
 * dialeto de máscara a lib fala nesta versão.
 */
const ESCALAS = [
  { unit: 'year' as const, step: 1, format: (data: Date) => String(data.getFullYear()) },
  { unit: 'month' as const, step: 1, format: mesCurto },
]

/**
 * O conteúdo da barra. É aqui que a cor por TIPO entra.
 *
 * `data-modulo` é o mesmo atributo que o resto do app usa para puxar o par de
 * cor do módulo — a barra não inventa cor, herda a que o design system já
 * publicou. O `aria-label` repete tipo e nome porque a barra do SVAR é uma
 * `div`: sem ele o leitor de tela anuncia só o texto solto.
 */
function BarraDoItem({ data }: { data: { text?: string; tipo?: PlanItemDtoKind } }) {
  const tipo = data.tipo ? TIPOS[data.tipo] : null
  return (
    <span
      data-slot="barra-do-plano"
      {...(tipo ? { 'data-modulo': tipo.modulo } : {})}
      className="flex h-full items-center overflow-hidden bg-modulo px-[var(--s-2)] text-left"
      aria-label={tipo ? `${tipo.rotulo}: ${data.text ?? ''}` : (data.text ?? '')}
    >
      {/* `t-ui`, não `text-sm font-semibold`: o texto da barra é rótulo de
          objeto, o mesmo papel do nome de entidade numa listagem, e §Hierarquia
          dá um degrau só a esse papel. O negrito de antes competia com o título
          da página sem ganhar nada — a barra já se destaca pelo tint. */}
      <span className="t-ui truncate">{data.text}</span>
    </span>
  )
}

/**
 * A LATERAL — cada linha do plano lida como ENTIDADE, não como célula.
 *
 * A auditoria §2.2 define a célula de entidade do sistema 2.0 como "monograma +
 * nome + subtítulo", e a linha da esquerda do gantt é exatamente isso: um
 * objeto do plano, com um tipo que tem cor. O quadradinho de módulo é o mesmo
 * canal que a sidebar usa para dizer de que família é um item — e é ele que
 * amarra a linha da esquerda à barra da direita, que já vinha tintada pelo
 * mesmo `data-modulo`.
 *
 * **A fase não ganha quadradinho de propósito.** Ela não é de módulo nenhum: é
 * o agrupador. O que a distingue é o peso (`t-bloco`, Inter 600) contra o
 * `t-ui` (Inter 500) dos filhos — hierarquia por peso dentro do Inter, que é a
 * regra da §Hierarquia, e não por tamanho.
 *
 * O recuo dos filhos é o `--s-3` (12px), múltiplo de 4 como todo o resto.
 */
function CelulaDaFase({ row }: { row: { text?: string; type?: string; tipo?: PlanItemDtoKind } }) {
  const fase = row.type === 'summary'
  const tipo = row.tipo ? TIPOS[row.tipo] : null

  return (
    <span
      className="flex min-w-0 items-center gap-[var(--s-2)]"
      style={fase ? undefined : { paddingLeft: 'var(--s-3)' }}
    >
      {tipo ? (
        <span
          data-modulo={tipo.modulo}
          aria-hidden="true"
          className="size-2 shrink-0 bg-modulo-cheia"
        />
      ) : null}
      <span className={`${fase ? 't-bloco' : 't-ui'} truncate`}>{row.text}</span>
      {tipo ? <span className="sr-only">{tipo.rotulo}</span> : null}
    </span>
  )
}

export function PlannerTela() {
  // O quadro precisa de referência porque a linha do hoje é medida a partir
  // dele — ver `linha-do-hoje.tsx`.
  const quadro = useRef<HTMLDivElement>(null)
  const [filtro, setFiltro] = useState<FiltroDeProjeto>(FILTROS.emCurso)
  const [projetoEscolhido, setProjetoEscolhido] = useState<string | null>(null)

  const projetos = useProjetos(filtro)
  // Enquanto ninguém escolheu, vale o primeiro da lista — o Planner sem projeto
  // seria uma tela vazia por decisão de ninguém.
  const projetoId = projetoEscolhido ?? projetos.data?.[0]?.id ?? null
  const plano = usePlanoDoProjeto(projetoId)

  const tarefas = useMemo(() => (plano.data ? tarefasDoPlano(plano.data) : []), [plano.data])
  const janela = useMemo(() => (plano.data ? janelaDoPlano(plano.data.phases) : null), [plano.data])

  const reagendar = useReagendarItem(projetoId)
  const { readOnly, conhecido } = useReadOnlyPorPapel('projects')
  // Travado ENQUANTO NÃO SE SABE, e não só quando se sabe que não pode: o hook
  // devolve `readOnly: false` antes do vínculo chegar, e abrir o arraste nesse
  // intervalo deixaria o operador mover uma barra que o servidor recusa.
  const travado = !conhecido || readOnly

  const aoMexerNaTarefa = useCallback(
    (evento: EventoDeTarefa) => {
      // Durante o arraste o SVAR dispara a cada quadro. Sai cedo: o resto desta
      // função só faz sentido na soltura.
      if (evento.inProgress) return

      const novo = reagendamentoDoEvento(evento)
      if (novo) {
        reagendar.mutate(novo)
        return
      }

      // Chegou aqui, o gesto não vira escrita. Se foi uma FASE que se mexeu,
      // a grade agora mostra um intervalo que ninguém gravou — o contrato
      // reagenda ITEM, e a fase acompanha os filhos. Recarregar devolve a
      // barra ao que o servidor tem, em vez de deixá-la mentindo até que
      // alguém troque de projeto e volte.
      if (String(evento.id ?? '').startsWith('fase:')) void plano.refetch()
    },
    [reagendar, plano],
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Fronteira entre regiões da página = ESPAÇO, sem linha (§Hierarquia).
          A borda inferior de 2px que morava aqui era a segunda ferramenta na
          mesma fronteira: o `gap` do container já separava, e a linha só
          somava peso à tela que a auditoria §1.1 chama de xadrez. */}
      <header className="flex flex-wrap items-end justify-between gap-x-[var(--s-4)] gap-y-[var(--s-2)]">
        <div className="flex flex-col gap-[var(--s-1)]">
          <h1 className="t-pagina">Planner</h1>
          <p className="t-meta">As fases do projeto na linha do tempo.</p>
        </div>

        <div className="flex flex-wrap items-center gap-[var(--s-2)]">
          <label className="t-rotulo flex items-center gap-[var(--s-2)]">
            Projeto
            <select
              className="t-ui h-9 border border-input bg-card px-[var(--s-3)] normal-case tracking-normal outline-none focus-visible:focus-ring"
              value={projetoId ?? ''}
              onChange={(evento) => setProjetoEscolhido(evento.target.value)}
              disabled={projetos.isPending || (projetos.data?.length ?? 0) === 0}
            >
              {(projetos.data ?? []).map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.name}
                </option>
              ))}
            </select>
          </label>

          {/* Dois botões, não um interruptor: o par diz quais são os dois
              recortes possíveis antes de o operador clicar. */}
          <div className="flex">
            <Button
              variant={filtro === FILTROS.emCurso ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFiltro(FILTROS.emCurso)
                setProjetoEscolhido(null)
              }}
            >
              Ativos e propostos
            </Button>
            <Button
              variant={filtro === FILTROS.encerrados ? 'default' : 'outline'}
              size="sm"
              className="-ml-0.5"
              onClick={() => {
                setFiltro(FILTROS.encerrados)
                setProjetoEscolhido(null)
              }}
            >
              Encerrados
            </Button>
          </div>
        </div>
      </header>

      {projetos.isError ? (
        <FalhaDoPainel
          titulo="Os projetos não carregaram"
          erro={projetos.error}
          aoTentar={() => projetos.refetch()}
        />
      ) : plano.isError ? (
        <FalhaDoPainel
          titulo="O plano não carregou"
          erro={plano.error}
          aoTentar={() => plano.refetch()}
        />
      ) : // `enabled: false` deixa a query em `pending` PARA SEMPRE (TanStack v5:
      // pending = "ainda não tem dado", e sem projeto ela nunca vai buscar).
      // Sem a guarda do `projetoId`, o recorte sem projeto nenhum ficaria em
      // esqueleto eterno em vez de dizer que não há projeto.
      projetos.isPending || (projetoId !== null && plano.isPending) ? (
        <Skeleton className="h-64 w-full" />
      ) : projetoId === null ? (
        <p className="t-meta rounded-panel border border-[var(--n-300)] bg-card p-[var(--s-5)] text-center shadow-[var(--hard-soft)]">
          Nenhum projeto neste recorte.
        </p>
      ) : !janela ? (
        <p className="t-meta rounded-panel border border-[var(--n-300)] bg-card p-[var(--s-5)] text-center shadow-[var(--hard-soft)]">
          Este projeto ainda não tem fases planejadas.
        </p>
      ) : (
        <>
          {plano.data ? <AndamentoDoProjeto plano={plano.data} /> : null}
          {/*
            A moldura é NOSSA e o miolo é da lib — isso não muda. O que muda é o
            PESO dela: era `border-2` preto, e a auditoria §1.1 mede esse traço
            como a causa do xadrez ("botão, aba, campo, chip e linha pesam
            igual → nada tem prioridade"). Aqui ele custava caro em dobro,
            porque a moldura preta encostava na grade do gantt e as duas viravam
            uma coisa só. Vira CARD QUIETO: borda n-300 + `--hard-soft`, que é a
            ferramenta 4 da §Hierarquia para "objeto sobre o plano" quando o
            objeto não é o dono da tela. A sombra dura de tinta desta página
            fica com o painel Andamento, e é uma só.

            `data-secao="dashboard"` mantém o Planner na cor da seção: quem lê a
            cor sabe em que parte do sistema está, e nem a troca de motor nem a
            troca de pele podem mudar isso.
          */}
          {conhecido && readOnly ? (
            <p data-slot="planner-somente-leitura" className="t-meta">
              Somente leitura: seu papel nesta empresa não reagenda o plano.
            </p>
          ) : null}

          {/* Mesmo lugar e mesma voz do quadro do CRM, que também é arrastar: o
              `detail` do problem+json diz o motivo — data invertida, papel que
              não alcança —, e sem ele a barra voltaria sozinha e sem palavra. */}
          {reagendar.isError ? (
            <p role="alert" data-slot="planner-erro" className="t-corpo text-destructive">
              {reagendar.error instanceof ErroDaApi
                ? (reagendar.error.detail ?? reagendar.error.message)
                : 'Falha ao reagendar o item do plano.'}
            </p>
          ) : null}

          <div
            ref={quadro}
            data-secao="dashboard"
            data-slot="gantt"
            className="relative overflow-hidden rounded-panel border border-[var(--n-300)] bg-card shadow-[var(--hard-soft)]"
          >
            <Gantt
              readonly={travado}
              onupdatetask={aoMexerNaTarefa}
              tasks={tarefas}
              scales={ESCALAS}
              {...(janela ? { start: janela.inicio, end: janela.fim } : {})}
              taskTemplate={BarraDoItem}
              // Uma coluna só, a de nome — a versão anterior também mostrava
              // fase e nome e nada mais. `Duração` e `Início` do padrão do SVAR
              // repetiriam o que a própria barra já diz na horizontal. O que
              // mudou é a CÉLULA: ver `CelulaDaFase`.
              columns={[{ id: 'text', header: 'Fase', flexgrow: 1, cell: CelulaDaFase }]}
              // A grade FICA nas duas direções, e o que muda é o peso dela: a
              // auditoria §1.1 condena o xadrez de traço PRETO, não a grade —
              // num gantt a linha horizontal é o que liga a barra ao nome dela
              // seiscentos pixels à esquerda, e tirá-la troca um problema de
              // ruído por um de leitura. Em hairline n-200 (ver
              // `gantt-2.0.css`) ela orienta sem pesar.
              cellBorders="full"
              // 40px, não os 38 do padrão do SVAR: a régua da rodada é o
              // múltiplo de 4, e a captura com `?grid` mostra a linha da grade
              // andando junto com as do quadro em vez de deslizar 2px por
              // linha.
              cellHeight={40}
              // NADA de `markers` aqui: é recurso PRO e a store o zera no
              // `init`. A linha do hoje é desenhada por `<LinhaDoHoje>`, logo
              // abaixo — o porquê inteiro está no cabeçalho daquele arquivo.
            />
            {janela ? <LinhaDoHoje janela={janela} quadro={quadro} /> : null}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * ANDAMENTO — o mesmo bloco de "Task Progress" da referência de dashboard, com
 * os números que ESTE plano tem: itens concluídos, em andamento e não
 * iniciados, mais a média de progresso.
 *
 * Fica ACIMA da grade porque responde a pergunta que se faz antes de olhar as
 * barras ("como está o projeto?"); a grade responde a seguinte ("o que acontece
 * quando?").
 *
 * Continua NOSSO depois da troca: o SVAR desenha o plano, não resume o projeto.
 */
function AndamentoDoProjeto({ plano }: { plano: ProjectPlanDto }) {
  const p = progressoDoProjeto(plano)
  if (p.percentual === null) return null

  return (
    <Painel titulo="Andamento">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-y-3 divide-x divide-rule-hair">
          <Grandeza rotulo="Concluídos" valor={p.concluidos} />
          <Grandeza rotulo="Em andamento" valor={p.emAndamento} />
          <Grandeza rotulo="Não iniciados" valor={p.naoIniciados} />
          <Grandeza rotulo="Itens" valor={totalDeItens(plano)} />
        </div>
        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          {/* VIOLETA, não verde: verde é dinheiro e progresso não é dinheiro.
              O DESIGN.md já dá a barra de progresso ao violeta de ação. */}
          <BarraDeProgresso percentual={p.percentual} />
          <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
            {p.percentual}%
          </span>
        </div>
      </div>
    </Painel>
  )
}

function Grandeza({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {rotulo}
      </span>
      {/* A voz de QUANTO (mono), e SEM negrito: o `@fontsource` publica só os
          pesos 400 e 500, e `font-bold` sem arquivo de 700 viraria negrito
          sintético — o browser engorda o traço por conta. Quem dá presença ao
          número aqui é a largura da mono e a tabularidade, não o peso
          (decisão do user, 2026-08-13). */}
      <span className="font-mono text-3xl tabular-nums">{valor}</span>
    </div>
  )
}
