import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ConsultaSalva, FavoritoDeConsulta } from '@/lib/favoritos-de-consulta'
import { cn } from '@/lib/utils'
import { MoreHorizontal, Plus, Star } from 'lucide-react'
import { useId, useState } from 'react'
import { Button as ButtonAria } from 'react-aria-components'

/**
 * A TIRA DE VISÕES (#199, fecha a #92; redesenhada na Reface 2.0) — a consulta
 * salva vira aba com cor e contagem.
 *
 * Antes as consultas salvas moravam num popover `Consultas` na barra de ações:
 * duas telas de distância entre "esta lista está filtrada" e "existe uma lista
 * pronta para isto". A aba resolve as duas de uma vez — as consultas ficam
 * VISÍVEIS sem clique, e trocar entre elas custa um. É o padrão
 * `polaris.shopify.com/components/…/index-filters`, com o quadradinho de cor e
 * a contagem que o Airtable e o Notion usam para dizer, sem abrir nada, quantos
 * registros cada visão tem.
 *
 * ## A aba ativa é DEDUZIDA, não guardada
 *
 * Nada aqui lembra "qual aba foi clicada". A aba acesa é aquela cuja consulta
 * salva BATE com o que está na tela agora. É o que faz a coisa continuar honesta
 * quando a pessoa aplica uma consulta e mexe num filtro: a aba apaga e nasce a
 * `Não salva`, em vez de a tela seguir dizendo "Vencendo" mostrando outra
 * coisa. Guardar a aba clicada custaria o mesmo e mentiria nesse caso.
 *
 * **Campo vazio no favorito é curinga.** `visao: ''` quer dizer "este favorito
 * não fala de visão" (ver `FavoritoDeConsulta`), e comparar vazio com a visão
 * atual faria todo favorito gravado antes dos view modes deixar de bater com a
 * própria consulta.
 *
 * ## A cor é DEDUZIDA do id, e não gravada
 *
 * `FavoritoDeConsulta` mora em `src/lib/` e é o que já está no `localStorage` de
 * quem usa o sistema: acrescentar um campo `cor` faria toda visão salva antes
 * desta rodada nascer sem cor, e obrigaria uma migração de dado gravado por uma
 * decisão puramente visual. A cor sai de um hash do id — estável entre sessões,
 * distinta entre vizinhas, e sem nada novo para guardar. Quando D13 levar as
 * visões para o servidor, cor escolhida à mão troca só a linha do `corDaVisao`.
 *
 * ## `Todos` é a aba sem consulta, e por isso ela não se apaga
 *
 * A primeira aba é a listagem crua: sem filtro, sem ordenação, com o desenho
 * padrão da tela. Ela não sai do lugar nem ganha menu — é o chão para onde se
 * volta, e um `Excluir` ali seria a promessa de apagar a própria listagem. A
 * cor dela é a tinta (`--n-900`), como no mockup: é a visão que contém as
 * outras, não mais uma cor no meio.
 *
 * ## Sobrevive ao re-login porque não depende de sessão
 *
 * A persistência é a mesma da #92: `localStorage` por tela
 * (`favoritos-de-consulta.ts`). Não há backend de preferência de usuário, e
 * amarrar a consulta salva à sessão faria o `Sair` levar junto o trabalho de
 * quem montou a lista.
 */

export interface AbasDeConsultaProps {
  favoritos: readonly FavoritoDeConsulta[]
  /** O que está montado na tela agora — é com isto que cada aba se compara. */
  atual: ConsultaSalva
  /** Há algo montado? `false` acende a aba `Todos`. */
  temConsulta: boolean
  /**
   * Quantos registros cada visão traz, por id de favorito (`todos` é a aba
   * crua). Ausente = a tira não mostra contagem nenhuma.
   *
   * Opcional porque contar é CONSULTAR: cada número aqui é uma ida ao servidor
   * com os filtros daquela visão. A listagem que sabe pagar isso passa o mapa;
   * a que não sabe (janela de busca, tabela dentro de dialog) fica sem número,
   * que é melhor que um número errado ou uma espera que ninguém pediu.
   */
  contagens?: ReadonlyMap<string, number> | undefined
  onAplicar: (favorito: FavoritoDeConsulta) => void
  /** Volta à listagem crua (aba `Todos`). */
  onLimpar: () => void
  onSalvar: (nome: string) => void
  onRenomear: (id: string, nome: string) => void
  onExcluir: (id: string) => void
  onTornarPadrao: (id: string) => void
}

/** `''` no favorito é curinga: ele não fala daquilo, então não desempata nada. */
function mesmoOuAusente(doFavorito: string, daTela: string): boolean {
  return doFavorito === '' || doFavorito === daTela
}

/**
 * A consulta salva descreve o que está na tela?
 *
 * Compara o que o favorito GUARDA — filtros, junção, ordenação, visão,
 * agrupamento e densidade —, na ordem em que os filtros foram montados. Ordem
 * conta porque `filtroId` é chave de linha e some ao gravar: duas listas com as
 * mesmas condições em ordens diferentes são a mesma pergunta, mas tratá-las como
 * iguais custaria uma normalização que só serviria para acender aba.
 */
export function consultaBate(favorito: FavoritoDeConsulta, atual: ConsultaSalva): boolean {
  if (favorito.filtros.length !== atual.filtros.length) return false
  const mesmosFiltros = favorito.filtros.every((filtro, i) => {
    const outro = atual.filtros[i]
    if (!outro) return false
    return (
      filtro.id === outro.id &&
      filtro.operador === outro.operador &&
      JSON.stringify(filtro.valor) === JSON.stringify(outro.valor)
    )
  })
  if (!mesmosFiltros) return false
  if (favorito.juncao !== atual.juncao) return false
  if (favorito.sort?.id !== atual.sort?.id || favorito.sort?.desc !== atual.sort?.desc) return false
  return (
    mesmoOuAusente(favorito.visao, atual.visao) &&
    mesmoOuAusente(favorito.agruparPor, atual.agruparPor) &&
    mesmoOuAusente(favorito.densidade, atual.densidade)
  )
}

export const ABA_TODOS = 'todos'
const ABA_NAO_SALVA = 'nao-salva'

/**
 * As cores que uma visão pode ter — os matizes 2.0, sem o chartreuse.
 *
 * Chartreuse fica de fora porque ele é o PRIMÁRIO: um quadradinho da cor da
 * ação principal ao lado de um rótulo faria a visão parecer selecionada. Rosa
 * também sai por perto: `--bad` é o vermelho do erro, e a visão "Atrasadas" não
 * pode disputar o mesmo significado com a linha vencida da grade.
 */
const CORES_DE_VISAO = [
  'var(--sky-600)',
  'var(--mint-600)',
  'var(--amber-600)',
  'var(--indigo-600)',
  'var(--violet-600)',
  'var(--teal-600)',
] as const

/**
 * A cor desta visão — a mesma sempre, para o mesmo id.
 *
 * Hash de soma simples porque o que se precisa é estabilidade, não dispersão
 * criptográfica: duas visões vizinhas de mesma cor são um aborrecimento; a cor
 * MUDAR entre dois renders da mesma tela seria a tira inteira piscando a cada
 * tecla digitada no filtro.
 */
export function corDaVisao(id: string): string {
  if (id === ABA_TODOS) return 'var(--n-900)'
  let soma = 0
  for (let i = 0; i < id.length; i++) soma = (soma + id.charCodeAt(i) * (i + 1)) % 4096
  return CORES_DE_VISAO[soma % CORES_DE_VISAO.length] as string
}

/** Milhar com o separador de cá, para a contagem não virar `1234`. */
function contagemLegivel(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n)
}

/**
 * Aba como `<button role="tab">`, e não a `Tabs` do react-aria.
 *
 * A `Tabs` do repo casa cada aba com um `TabsContent` que ela monta e desmonta.
 * Aqui o "painel" é a tabela inteira, que vive FORA e guarda o estado da
 * consulta — deixá-la sob a tira faria trocar de aba remontar a listagem e
 * perder página, seleção e rascunho de filtro. A tira sozinha é o que se
 * precisa, e ela cabe em `role="tablist"`.
 *
 * Todas as abas continuam alcançáveis por `Tab`/`Shift+Tab` (navegação nativa,
 * CLAUDE.md) em vez do foco rotativo por seta do APG: a régua deste repo é
 * interface por clique, sem tecla a memorizar.
 *
 * ## A cor do texto vai inline, e é de propósito
 *
 * `.t-ui` mora fora de `@layer`, então vence qualquer utilitário do Tailwind —
 * `text-muted-foreground` ao lado dela não pintaria nada. Inline é o único
 * degrau acima, e é onde a cor da visão já estava (ela é dado, não classe).
 */
function Aba({
  ativa,
  cor,
  contagem,
  rotulo,
  children,
  onClick,
}: {
  ativa: boolean
  cor: string
  contagem?: number | undefined
  /** O que o leitor de tela anuncia — o texto visível pode trazer contagem e estrela. */
  rotulo: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativa}
      aria-label={contagem === undefined ? rotulo : `${rotulo} — ${contagem} registro(s)`}
      // A linha de baixo é a cor da visão e nasce do centro para fora: ela é a
      // ÚNICA marca de "esta é a lista que você está vendo". Negrito no rótulo
      // seria a segunda ferramenta na mesma fronteira (§Hierarquia).
      style={{ '--vc': cor, color: ativa ? undefined : 'var(--n-500)' } as React.CSSProperties}
      className={cn(
        't-ui group relative flex items-center gap-[7px] px-[var(--s-3)] pb-2.5 pt-[var(--s-2)]',
        'outline-none focus-visible:focus-ring',
        'after:absolute after:inset-x-[var(--s-3)] after:-bottom-px after:h-0.5',
        'after:origin-left after:scale-x-0 after:bg-[var(--vc)] after:transition-transform',
        'aria-selected:after:scale-x-100',
        // 2026-09-04 (user: "cada elemento tem que se diferenciar"): a aba ativa
        // também ganha peso e fundo de folha — a linha sozinha sumia no tint.
        'aria-selected:rounded-t-control aria-selected:bg-card aria-selected:font-semibold',
      )}
      onClick={onClick}
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-[2px]"
        style={{ background: cor }}
      />
      {children}
      {contagem === undefined ? null : (
        <span
          aria-hidden="true"
          className={cn(
            't-dado-meta border px-[5px]',
            ativa
              ? 'border-foreground bg-foreground text-background'
              : 'border-rule-hair bg-surface-sunken',
          )}
        >
          {contagemLegivel(contagem)}
        </span>
      )}
    </button>
  )
}

export function AbasDeConsulta({
  favoritos,
  atual,
  temConsulta,
  contagens,
  onAplicar,
  onLimpar,
  onSalvar,
  onRenomear,
  onExcluir,
  onTornarPadrao,
}: AbasDeConsultaProps) {
  const [salvando, setSalvando] = useState(false)
  const [renomeando, setRenomeando] = useState<FavoritoDeConsulta | null>(null)
  const [nome, setNome] = useState('')
  const campoId = useId()

  const casada = favoritos.find((favorito) => consultaBate(favorito, atual)) ?? null
  const abaAtiva = casada ? casada.id : temConsulta ? ABA_NAO_SALVA : ABA_TODOS
  // Salvar é o mesmo gesto do `+`: criar uma visão com o que está montado. Dois
  // botões para uma ação só se justificam porque um é o alvo compacto da tira e
  // o outro é o rótulo por extenso — e ambos morrem juntos quando não há o que
  // salvar, para não ensinarem caminhos diferentes.
  const podeSalvar = temConsulta && casada === null
  const motivo = temConsulta
    ? casada
      ? 'Esta consulta já está salva.'
      : undefined
    : 'Monte um filtro ou uma ordenação para salvar como visão.'

  function abrirSalvar() {
    setNome('')
    setSalvando(true)
  }

  function abrirRenomear(favorito: FavoritoDeConsulta) {
    setNome(favorito.nome)
    setRenomeando(favorito)
  }

  function confirmar() {
    const limpo = nome.trim()
    if (!limpo) return
    if (renomeando) onRenomear(renomeando.id, limpo)
    else onSalvar(limpo)
    setNome('')
    setSalvando(false)
    setRenomeando(null)
  }

  return (
    <>
      {/* Hairline, não a régua de 2px: a tira e a barra de filtro são regiões do
          MESMO card, e duas linhas grossas empilhadas fariam a barra parecer um
          card dentro do card (§Hierarquia, separação 2). */}
      <div className="flex flex-wrap items-center gap-0.5 border-input border-b bg-[var(--modulo-02,var(--n-50))] px-[var(--s-3)] pt-[var(--s-2)]">
        <div role="tablist" aria-label="Visões salvas" className="flex flex-wrap items-center">
          <Aba
            ativa={abaAtiva === ABA_TODOS}
            cor={corDaVisao(ABA_TODOS)}
            contagem={contagens?.get(ABA_TODOS)}
            rotulo="Todos"
            onClick={onLimpar}
          >
            Todos
          </Aba>

          {favoritos.map((favorito) => (
            <Aba
              key={favorito.id}
              ativa={abaAtiva === favorito.id}
              cor={corDaVisao(favorito.id)}
              contagem={contagens?.get(favorito.id)}
              rotulo={favorito.nome}
              onClick={() => onAplicar(favorito)}
            >
              {favorito.padrao ? (
                <Star aria-label="Abre por padrão" className="size-3.5 fill-current" />
              ) : null}
              <span className="max-w-40 truncate">{favorito.nome}</span>
            </Aba>
          ))}

          {abaAtiva === ABA_NAO_SALVA ? (
            // A consulta montada à mão também é uma aba: sem ela a tira ficaria
            // com nenhuma acesa, e "nenhuma aba acesa" se lê como defeito, não
            // como "esta pergunta ainda não tem nome".
            <Aba
              ativa
              cor="var(--n-400)"
              rotulo="Não salva"
              onClick={() => {
                if (podeSalvar) abrirSalvar()
              }}
            >
              <span className="italic">Não salva</span>
            </Aba>
          ) : null}
        </div>

        {/* O `+` fica FORA do `tablist`: ele não é uma lista para onde ir, é a
            ação de criar mais uma. Leitor de tela que percorre as abas não pode
            tropeçar num item que não abre lista nenhuma. */}
        <button
          type="button"
          disabled={!podeSalvar}
          title={motivo ?? 'Salvar o que está na tela como uma nova visão'}
          aria-label="Nova visão"
          className="ml-1 grid size-7 place-content-center text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring disabled:text-rule-disabled"
          onClick={abrirSalvar}
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>

        <div className="ml-auto flex items-center gap-1 pb-1">
          {casada ? (
            <DropdownMenuTrigger>
              <ButtonAria
                aria-label={`Ações da visão “${casada.nome}”`}
                className="grid size-7 place-content-center text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring"
              >
                <MoreHorizontal className="size-4" />
              </ButtonAria>
              <DropdownMenu placement="bottom end">
                <DropdownMenuItem textValue="Renomear" onAction={() => abrirRenomear(casada)}>
                  Renomear…
                </DropdownMenuItem>
                <DropdownMenuItem
                  textValue="Abrir por padrão"
                  onAction={() => onTornarPadrao(casada.id)}
                >
                  {casada.padrao ? 'Não abrir por padrão' : 'Abrir por padrão'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem textValue="Excluir" onAction={() => onExcluir(casada.id)}>
                  Excluir visão
                </DropdownMenuItem>
              </DropdownMenu>
            </DropdownMenuTrigger>
          ) : null}

          {/* Link, não botão de caixa: salvar a consulta é a ação secundária da
              tira, e uma caixa aqui competiria com a aba ativa pelo mesmo olhar.
              `--primary-text` é o único acento que pode virar texto. */}
          <button
            type="button"
            disabled={!podeSalvar}
            title={motivo}
            className="t-ui px-[var(--s-2)] py-1 underline-offset-4 outline-none hover:underline focus-visible:focus-ring disabled:no-underline"
            style={{ color: podeSalvar ? 'var(--primary-text)' : 'var(--n-400)' }}
            onClick={abrirSalvar}
          >
            Salvar consulta
          </button>
        </div>
      </div>

      <Dialog
        isOpen={salvando || renomeando !== null}
        onOpenChange={(aberto) => {
          if (aberto) return
          setSalvando(false)
          setRenomeando(null)
        }}
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>{renomeando ? 'Renomear visão' : 'Salvar consulta'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          <Label htmlFor={campoId}>Nome</Label>
          <Input
            id={campoId}
            autoFocus
            value={nome}
            placeholder="Ex.: Inativos de São Paulo"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              confirmar()
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSalvando(false)
              setRenomeando(null)
            }}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={!nome.trim()} onClick={confirmar}>
            Gravar
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
