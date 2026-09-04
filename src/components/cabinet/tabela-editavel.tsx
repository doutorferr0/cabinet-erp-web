import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { type ReactNode, useState } from 'react'

/**
 * TABELA EDITÁVEL — o cadastro pequeno que não merece uma ficha.
 *
 * ## Por que existe
 *
 * Renomear um item de lista de apoio custava, até aqui, um diálogo: clicar a
 * linha, esperar o formulário montar, achar o campo, digitar, `Gravar`,
 * fechar. Seis gestos para trocar `STELA` por `STELLA` num registro de DOIS
 * campos — nome e `Ativo`. O diálogo é a ferramenta certa quando há o que
 * arranjar em abas e o que validar em conjunto; num par nome/ativo ele é
 * cerimônia, e cerimônia é o que faz o operador deixar o erro de digitação lá.
 *
 * Aqui a célula É o campo: clicar abre o input no lugar, `Enter` grava, `Esc`
 * desfaz. A linha nova nasce no rodapé, numa linha tracejada que se lê como
 * "aqui cabe mais um" — não num botão que abre outra coisa.
 *
 * ## O que ela NÃO é
 *
 * Não é a `VitraDataTable`, e não a substitui. A DataTable é server-ready —
 * busca, ordenação, paginação e filtro estruturado viajam para o servidor. Esta
 * recebe as linhas prontas e não consulta nada: serve o conjunto PEQUENO e
 * FECHADO (as listas de apoio param no teto de 100 do contrato), onde paginar
 * seria pior que rolar. Listagem de cadastro continua sendo DataTable.
 *
 * ## A malha é a compartilhada, e isso foi uma correção
 *
 * Escrita primeiro com `<table>` própria, porque a `ui/table` era a malha 1.x e
 * discordava da régua nas duas fronteiras que importam aqui: cabeçalho em BARRA
 * PRETA onde a §Hierarquia pede tint `--n-50`, e régua de 2px de Tinta entre
 * linhas onde ela pede hairline. **A D8 converteu a `ui/table` na mesma rodada**
 * — header por tint com `t-rotulo`, hairline de 1px —, e a justificativa caiu
 * junto. Malha local aqui passaria a ser cópia: divergiria de toda listagem do
 * sistema no primeiro ajuste que a D8 fizesse, e sem nada vermelho para avisar.
 * Tela COMPÕE, não reimplementa — vale para o componente compartilhado também.
 *
 * ## Desativar, nunca apagar
 *
 * §9 padrão 8: a UI de cadastro não apaga. O gesto destrutivo passa pelo
 * `ConfirmarDesativacao` — o mesmo diálogo das listagens de cadastro, com o
 * nome do registro na frase —, e a REATIVAÇÃO não passa: devolver um item ao
 * combo não tem o que confirmar, e confirmação para gesto reversível ensina o
 * operador a clicar `Sim` sem ler.
 *
 * ## Gravar é por célula, e por isso o erro é da tela
 *
 * Não há `Gravar` no rodapé: cada célula que sai do modo de edição é uma
 * escrita. O componente não sabe o que o servidor recusou — quem monta a
 * mutação é a tela —, então ele recebe `erro` como nó pronto e o mostra sob a
 * grade. O que ele garante é que a célula VOLTA ao valor do dado quando a
 * escrita falha: a fonte do que se lê é sempre `linhas`, nunca um rascunho
 * local que sobreviveria ao 409.
 */

export interface ColunaEditavel<T> {
  /** Identifica a coluna na gravação (`aoGravarCelula`). */
  id: string
  /** Cabeçalho, e o nome que entra no rótulo acessível da célula. */
  rotulo: string
  /** O texto que a célula mostra — e, quando editável, o valor inicial do input. */
  valor: (linha: T) => string
  /**
   * Célula que vira input no clique. Coluna sem isto é leitura: mostra o texto
   * e não responde ao clique, porque célula que parece editável e não é ensina
   * ao operador que a tela travou.
   */
  editavel?: boolean
  /** Classe de largura da coluna (`w-32`), como no resto das tabelas do repo. */
  largura?: string
}

export interface TabelaEditavelProps<T> {
  linhas: readonly T[]
  colunas: readonly ColunaEditavel<T>[]
  /** Chave estável da linha — o id do registro. */
  chave: (linha: T) => string
  /** Como o registro aparece na frase da desativação. */
  nome: (linha: T) => string
  /** `active` do registro: decide o selo e o sentido do botão. */
  ativo: (linha: T) => boolean
  /** Nome da entidade em minúscula, para o diálogo ('item da lista'). */
  entidade: string
  /** Uma célula saiu da edição com valor novo. */
  aoGravarCelula: (linha: T, colunaId: string, valor: string) => void
  /** A linha do rodapé tracejado foi confirmada. */
  aoIncluir: (valor: string) => void
  /** O selo `Ativo` foi trocado — `false` só chega depois da confirmação. */
  aoAlternarAtivo: (linha: T, ativo: boolean) => void
  /** Texto do input de inclusão; é ele que diz o que se inclui. */
  rotuloDaInclusao: string
  /** Trava os controles enquanto uma escrita corre. */
  pendente?: boolean
  /** Falha da última escrita, montada pela tela. */
  erro?: ReactNode
  /** O que aparece quando não há linha nenhuma — estado, não falha. */
  vazio?: ReactNode
}

export function TabelaEditavel<T>({
  linhas,
  colunas,
  chave,
  nome,
  ativo,
  entidade,
  aoGravarCelula,
  aoIncluir,
  aoAlternarAtivo,
  rotuloDaInclusao,
  pendente = false,
  erro,
  vazio,
}: TabelaEditavelProps<T>) {
  // A célula aberta, identificada por linha+coluna. Uma de cada vez: duas
  // abertas dariam duas escritas simultâneas no mesmo registro, e a segunda
  // gravaria por cima do que a primeira acabou de mandar.
  const [emEdicao, setEmEdicao] = useState<{ linha: string; coluna: string } | null>(null)
  const [aDesativar, setADesativar] = useState<T | null>(null)

  const colunasTotais = colunas.length + 2

  return (
    // Irmãos por `gap`, nunca `margin` por elemento (§Hierarquia, separação 1).
    <div className="flex flex-col gap-[var(--s-3)]">
      <Table>
        <TableHeader>
          <TableRow>
            {colunas.map((coluna) => (
              <TableHead key={coluna.id} className={coluna.largura}>
                {coluna.rotulo}
              </TableHead>
            ))}
            <TableHead className="w-32">Situação</TableHead>
            {/* Coluna de ação sem rótulo: o botão diz o que faz, e um cabeçalho
                "Ações" seria uma palavra que não decide nada. */}
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => {
            const id = chave(linha)
            const eAtivo = ativo(linha)
            return (
              <TableRow key={id}>
                {colunas.map((coluna) => (
                  <TableCell key={coluna.id} className={coluna.largura}>
                    <Celula
                      valor={coluna.valor(linha)}
                      rotulo={`${coluna.rotulo} de ${nome(linha)}`}
                      editavel={coluna.editavel === true && !pendente}
                      aberta={emEdicao?.linha === id && emEdicao.coluna === coluna.id}
                      aoAbrir={() => setEmEdicao({ linha: id, coluna: coluna.id })}
                      aoFechar={() => setEmEdicao(null)}
                      aoGravar={(valor) => aoGravarCelula(linha, coluna.id, valor)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <CelulaAtivo ativo={eAtivo} />
                </TableCell>
                <TableCell>
                  {/* Desativar confirma; reativar não. Ver a nota do topo. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pendente}
                    onClick={() => (eAtivo ? setADesativar(linha) : aoAlternarAtivo(linha, true))}
                  >
                    {eAtivo ? 'Desativar' : 'Reativar'}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}

          {linhas.length === 0 && vazio ? (
            <TableRow>
              <TableCell colSpan={colunasTotais} className="t-meta">
                {vazio}
              </TableCell>
            </TableRow>
          ) : null}

          {/* A LINHA NOVA mora na grade, não num diálogo. O tracejado é o que a
              distingue de um registro: é um lugar que ainda não é linha. */}
          <TableRow>
            <TableCell colSpan={colunasTotais} className="h-auto p-0">
              <LinhaNova rotulo={rotuloDaInclusao} pendente={pendente} aoIncluir={aoIncluir} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {erro}

      <ConfirmarDesativacao
        entidade={entidade}
        nome={aDesativar ? nome(aDesativar) : ''}
        ativo={aDesativar ? ativo(aDesativar) : false}
        aberto={aDesativar !== null}
        pendente={pendente}
        onFechar={() => setADesativar(null)}
        onConfirmar={() => {
          if (aDesativar) aoAlternarAtivo(aDesativar, false)
          setADesativar(null)
        }}
      />
    </div>
  )
}

/**
 * Uma célula — texto até o clique, input a partir dele.
 *
 * O gatilho é um `<button>` de verdade e não um `<td onClick>`: célula clicável
 * sem papel não recebe foco por Tab e não anuncia o que faz. O rótulo acessível
 * nomeia a COLUNA e o REGISTRO ("Nome de STELLA") porque numa grade de 30 linhas
 * "Editar" sozinho não diz o quê.
 *
 * `Esc` desfaz e `Enter` grava — e o `blur` grava também, porque clicar fora
 * depois de digitar é o gesto natural de quem terminou. Sair sem mudar nada não
 * escreve: um `PUT` que repõe o mesmo valor apareceria como sucesso e faria o
 * operador crer que mexeu na linha.
 *
 * O texto é `t-corpo` e não a voz de `<Nome>`: item de lista de apoio é rótulo
 * de catálogo — `Marca`, `Motivo de perda` —, não nome próprio de entidade. A
 * serifa de QUEM aqui diria que `MDF 18MM` é gente.
 */
function Celula({
  valor,
  rotulo,
  editavel,
  aberta,
  aoAbrir,
  aoFechar,
  aoGravar,
}: {
  valor: string
  rotulo: string
  editavel: boolean
  aberta: boolean
  aoAbrir: () => void
  aoFechar: () => void
  aoGravar: (valor: string) => void
}) {
  const [rascunho, setRascunho] = useState(valor)
  // Carrega o rascunho UMA vez por abertura, sem efeito: um `useEffect` aqui
  // reescreveria o que o operador está digitando a cada render do pai.
  const [carregada, setCarregada] = useState(false)
  if (aberta && !carregada) {
    setCarregada(true)
    setRascunho(valor)
  }
  if (!aberta && carregada) setCarregada(false)

  function confirmar() {
    const limpo = rascunho.trim()
    aoFechar()
    if (limpo && limpo !== valor) aoGravar(limpo)
  }

  // Trunca com `…` e devolve o inteiro no `title` (§Hierarquia: célula com
  // texto longo nunca quebra em três linhas).
  if (!editavel)
    return (
      <span className="t-corpo block truncate" title={valor}>
        {valor}
      </span>
    )

  if (!aberta) {
    return (
      <button
        type="button"
        aria-label={`Editar ${rotulo}`}
        title={valor}
        onClick={aoAbrir}
        className={cn(
          't-corpo block w-full truncate text-left',
          // O convite aparece no hover e no foco, e some no repouso: borda
          // permanente em toda célula editável desenharia uma grade de caixas e
          // devolveria as linhas verticais que a tabela não tem.
          'px-1 py-0.5 hover:bg-[var(--hover)] focus-visible:focus-ring',
        )}
      >
        {valor}
      </button>
    )
  }

  return (
    <Input
      autoFocus
      aria-label={rotulo}
      value={rascunho}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          confirmar()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          aoFechar()
        }
      }}
      className="h-8"
    />
  )
}

/**
 * O rodapé tracejado — incluir sem sair da grade.
 *
 * `Enter` inclui e o campo se esvazia para o próximo: quem povoa uma lista de
 * apoio digita vários seguidos, e devolver o foco a um campo limpo é o que
 * torna isso um gesto só. Não grava no `blur`, ao contrário da célula: ali o
 * operador estava editando um registro que existe, aqui ele pode ter clicado
 * fora justamente por ter desistido.
 *
 * O tracejado é de 1px `--n-300` — a borda de controle da rampa. Em 2px de
 * Tinta ele pesaria mais que as linhas reais e a grade terminaria gritando o
 * lugar vazio.
 */
function LinhaNova({
  rotulo,
  pendente,
  aoIncluir,
}: {
  rotulo: string
  pendente: boolean
  aoIncluir: (valor: string) => void
}) {
  const [valor, setValor] = useState('')

  function incluir() {
    const limpo = valor.trim()
    if (!limpo) return
    setValor('')
    aoIncluir(limpo)
  }

  return (
    <div className="flex items-center gap-[var(--s-2)] border-[var(--n-300)] border-dashed border-t px-3 py-[var(--s-2)]">
      <Input
        aria-label={rotulo}
        placeholder={rotulo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            incluir()
          }
        }}
        className="h-8 border-0 bg-transparent"
      />
      <Button type="button" size="sm" disabled={pendente || !valor.trim()} onClick={incluir}>
        Incluir
      </Button>
    </div>
  )
}
