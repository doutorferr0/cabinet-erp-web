import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Columns3, GripVertical } from 'lucide-react'
import { useState } from 'react'
import { Button as ButtonAria } from 'react-aria-components'

/**
 * MENU DE COLUNAS (Reface 2.0) — `Colunas · 2 ocultas`, e o resto da barra fica
 * com uma peça a menos.
 *
 * O mockup (`Listagem › fbar`) tem UM botão de colunas, e ele responde às três
 * perguntas que antes moravam em três lugares: quais colunas aparecem (o painel
 * de módulos, aberto sob a barra), em que ordem (não existia) e quantas linhas
 * cabem na tela (o `Linha: Padrão` do rodapé, longe de tudo). Separadas, as três
 * respondiam à mesma pergunta — "como esta lista está montada" — em três cantos.
 *
 * ## A contagem no rótulo é o que impede a coluna esquecida
 *
 * `Colunas` sozinho não diz que a listagem está incompleta; `Colunas · 2
 * ocultas` diz, e é o que evita o chamado "sumiu a coluna de total" três dias
 * depois de alguém tê-la desmarcado. O número conta só o que a pessoa escondeu
 * — coluna opcional que nunca foi ligada não está oculta, está disponível.
 *
 * ## Ordem: arrastar E setas, não um ou outro
 *
 * Arrastar é o gesto que o mockup desenha e o que o Airtable ensinou; sozinho,
 * ele deixa de fora quem navega por teclado, e o repo tem regra de interface por
 * clique com navegação nativa (CLAUDE.md). O `draggable` nativo do HTML não custa
 * dependência nenhuma — `dnd-kit` custaria, e `package.json` tem dono único na
 * rodada (D1). As setas fazem o mesmo trabalho e são o caminho acessível.
 *
 * ## A densidade NÃO mora aqui, e a issue pedia que morasse
 *
 * A D8 e o mockup põem a densidade como segmented na própria barra; o texto da
 * D9 a manda para dentro deste popover. Fazer as duas coisas daria dois donos
 * para a mesma escolha, que é a duplicação que o CLAUDE.md proíbe (foi por ela
 * que o `Filtro` estruturado OCUPOU o botão da barra em vez de somar um ao
 * lado). Ficou o segmented, que é o que o mockup desenha e o que se lê sem
 * abrir nada.
 *
 * ## Coluna fixa aparece marcada, desabilitada e com o motivo
 *
 * A identidade da linha (código, nome) não se esconde: sem ela, a listagem vira
 * um bloco de datas e valores sem sujeito. A caixa fica marcada e travada, com a
 * palavra `fixa` ao lado — desabilitar sem dizer por quê se lê como defeito.
 *
 * **Só a identidade trava, e isso MUDOU na 2.0.** Antes toda coluna que a tela
 * declarava era fixa, e o seletor só servia para ACRESCENTAR — daí não haver
 * "n ocultas" para contar. Esconder a coluna que não interessa hoje é metade do
 * que este menu existe para fazer.
 *
 * ## Uma coluna aparece em UMA lista só
 *
 * O que a grade já desenha fica em `Na grade`; o que ela pode desenhar fica nos
 * grupos por módulo. Ligar uma opcional a MOVE de lá para cá, e desmarcá-la em
 * `Na grade` a devolve. Sem essa migração, `Cargo` aparecia duas vezes no mesmo
 * popover — uma como coluna e outra como oferta —, com dois checkboxes que
 * respondiam a coisas diferentes.
 */

export interface ColunaDoMenu {
  /** O id da coluna na tabela (`accessorKey`, em inglês nos recursos HTTP). */
  id: string
  rotulo: string
  visivel: boolean
  /** Identidade da linha: aparece marcada e não desmarca. */
  fixa?: boolean
}

/** Uma coluna do repertório do módulo — ligada, desligada ou fixa na grade. */
export interface ColunaOpcional {
  id: string
  rotulo: string
  ligada: boolean
  /** Identidade da linha (`col: true` no schema): marcada e travada. */
  fixa?: boolean
}

/** Colunas que a tela sabe oferecer, agrupadas pelo módulo de onde vêm. */
export interface GrupoDeColunasOpcionais {
  id: string
  titulo: string
  colunas: readonly ColunaOpcional[]
}

export interface MenuDeColunasProps {
  /** As colunas que a grade desenha hoje, na ordem em que aparecem. */
  colunas: readonly ColunaDoMenu[]
  onAlternar: (id: string) => void
  /** Recebe a ordem INTEIRA, já rearranjada — a tabela não deduz movimento. */
  onReordenar: (ids: string[]) => void
  opcionais?: readonly GrupoDeColunasOpcionais[]
  onAlternarOpcional?: (id: string) => void
  disabled?: boolean
}

export function MenuDeColunas({
  colunas,
  onAlternar,
  onReordenar,
  opcionais = [],
  onAlternarOpcional,
  disabled,
}: MenuDeColunasProps) {
  const [aberto, setAberto] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const ocultas = colunas.filter((coluna) => !coluna.visivel).length

  function mover(de: number, para: number) {
    if (para < 0 || para >= colunas.length) return
    const ids = colunas.map((coluna) => coluna.id)
    const [movida] = ids.splice(de, 1)
    if (movida === undefined) return
    ids.splice(para, 0, movida)
    onReordenar(ids)
  }

  return (
    <PopoverTrigger isOpen={aberto} onOpenChange={setAberto}>
      <ButtonAria
        isDisabled={disabled ?? false}
        aria-label={ocultas > 0 ? `Colunas — ${ocultas} oculta(s)` : 'Colunas'}
        className="t-ui inline-flex h-7 items-center gap-1.5 rounded-[var(--r-ctrl)] px-2 outline-none hover:bg-[var(--hover)] focus-visible:focus-ring"
      >
        <Columns3 aria-hidden="true" className="size-3.5" />
        Colunas
        {ocultas > 0 ? (
          <span aria-hidden="true" className="t-dado-meta">
            · {ocultas} ocultas
          </span>
        ) : null}
      </ButtonAria>

      {/* NÃO modal: o efeito de marcar uma coluna é a grade mudar ATRÁS do
          popover, e um popover modal esconderia da árvore acessível exatamente
          o que se está ajustando — quem usa leitor de tela marcaria a caixa sem
          nenhuma confirmação de que a coluna entrou. */}
      <Popover isNonModal className="w-72 p-[var(--s-3)]" placement="bottom end">
        <div className="flex flex-col gap-[var(--s-3)]">
          {colunas.length === 0 ? null : (
            <div className="flex flex-col gap-1">
              <p className="t-rotulo">Na grade</p>
              <ul className="flex flex-col">
                {colunas.map((coluna, indice) => (
                  <li
                    key={coluna.id}
                    draggable={!coluna.fixa}
                    data-arrastando={arrastando === coluna.id ? '' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 py-1',
                      arrastando === coluna.id && 'opacity-50',
                    )}
                    onDragStart={() => setArrastando(coluna.id)}
                    onDragEnd={() => setArrastando(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!arrastando) return
                      const de = colunas.findIndex((c) => c.id === arrastando)
                      if (de >= 0) mover(de, indice)
                      setArrastando(null)
                    }}
                  >
                    <GripVertical
                      aria-hidden="true"
                      className={cn(
                        'size-3.5 shrink-0 text-muted-foreground',
                        coluna.fixa ? 'invisible' : 'cursor-grab',
                      )}
                    />
                    {/* O `Checkbox` do react-aria JÁ é o `<label>` e associa o
                      texto que recebe como filho — envolvê-lo em outro `<label>`
                      daria dois rótulos para o mesmo controle. */}
                    <Checkbox
                      isSelected={coluna.fixa === true || coluna.visivel}
                      isDisabled={coluna.fixa === true}
                      onChange={() => onAlternar(coluna.id)}
                      className={cn(
                        'flex-1',
                        coluna.fixa ? 'cursor-not-allowed' : 'cursor-pointer',
                      )}
                    >
                      <span className="truncate">{coluna.rotulo}</span>
                      {coluna.fixa ? (
                        <span aria-hidden="true" className="t-dado-meta">
                          fixa
                        </span>
                      ) : null}
                    </Checkbox>

                    <ButtonAria
                      isDisabled={indice === 0}
                      aria-label={`Subir a coluna ${coluna.rotulo}`}
                      className="grid size-5 shrink-0 place-content-center text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring disabled:text-rule-disabled"
                      onPress={() => mover(indice, indice - 1)}
                    >
                      <ChevronUp aria-hidden="true" className="size-3.5" />
                    </ButtonAria>
                    <ButtonAria
                      isDisabled={indice === colunas.length - 1}
                      aria-label={`Descer a coluna ${coluna.rotulo}`}
                      className="grid size-5 shrink-0 place-content-center text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring disabled:text-rule-disabled"
                      onPress={() => mover(indice, indice + 1)}
                    >
                      <ChevronDown aria-hidden="true" className="size-3.5" />
                    </ButtonAria>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* `fieldset`/`legend` e não um parágrafo: o grupo é o ponto do
              seletor — "que colunas existem sobre dados trabalhistas" não se
              responde numa lista plana de quarenta caixas —, e quem ouve
              precisa do nome do grupo junto de cada caixa. */}
          {opcionais.map((grupo) => (
            <fieldset key={grupo.id} className="flex flex-col gap-1 border-rule-hair border-t pt-2">
              <legend className="t-rotulo">{grupo.titulo}</legend>
              {grupo.colunas.map((coluna) => (
                <Checkbox
                  key={coluna.id}
                  isSelected={coluna.fixa === true || coluna.ligada}
                  isDisabled={coluna.fixa === true}
                  onChange={() => onAlternarOpcional?.(coluna.id)}
                  className={cn(coluna.fixa ? 'cursor-not-allowed' : 'cursor-pointer')}
                >
                  <span className="truncate">{coluna.rotulo}</span>
                  {coluna.fixa ? (
                    // Sem o motivo, a caixa travada se lê como defeito. O nome
                    // acessível o inclui: quem ouve precisa dele tanto quanto
                    // quem lê o rótulo ao lado.
                    <span className="t-dado-meta">fixa</span>
                  ) : null}
                </Checkbox>
              ))}
            </fieldset>
          ))}
        </div>
      </Popover>
    </PopoverTrigger>
  )
}
