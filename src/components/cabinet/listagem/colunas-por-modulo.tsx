import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { CampoCadastro, EntidadeCadastro, ModuloCadastro } from '@/features/cadastro/modulos'
import { cn } from '@/lib/utils'
import { Columns3 } from 'lucide-react'
import { useId, useState } from 'react'
import { idDoFiltro } from './modulos-da-consulta'

/**
 * COLUNAS AGRUPADAS POR MÓDULO (#104) — o seletor que diz de onde cada coluna vem.
 *
 * Uma lista plana de quarenta caixas não responde "que colunas existem sobre
 * dados bancários"; agrupada por módulo, responde sem ler item por item. E o
 * cabeçalho da grade leva o ponto da cor do módulo de origem, para a resposta
 * continuar valendo depois que o seletor fecha.
 *
 * ## Coluna `col` é FIXA e não desmarca — e isso é regra do schema
 *
 * `col: true` no schema significa "esta coluna é a identidade da linha na
 * grade" (código, nome, ativo). Deixar desmarcá-la produziria uma listagem sem
 * como distinguir um registro do outro, e o operador só descobriria depois de
 * fechar o seletor. A caixa aparece marcada e desabilitada, com o motivo ao
 * lado — desabilitar sem dizer por quê faz parecer defeito.
 *
 * O desabilitado segue a diretriz 1: **tinta preta, fundo apagado**. Nunca
 * opacidade no conteúdo — foi assim que os ícones da barra de ações sumiram.
 */

export interface ColunasPorModuloProps {
  entidade: EntidadeCadastro
  /** Ids (o nome que viaja) das colunas OPCIONAIS ligadas. As fixas não entram. */
  extras: readonly string[]
  onChange: (extras: string[]) => void
}

/** Campos que podem virar coluna: têm lastro na fonte da entidade. */
function colunasDoModulo(
  entidade: EntidadeCadastro,
  modulo: ModuloCadastro,
): readonly CampoCadastro[] {
  return modulo.campos.filter((campo) => idDoFiltro(entidade, campo))
}

export function ColunasPorModulo({ entidade, extras, onChange }: ColunasPorModuloProps) {
  const [aberto, setAberto] = useState(false)
  const painelId = useId()
  const modulos = entidade.modulos.filter((modulo) => colunasDoModulo(entidade, modulo).length > 0)

  function alternar(id: string) {
    onChange(extras.includes(id) ? extras.filter((x) => x !== id) : [...extras, id])
  }

  return (
    <div data-slot="colunas-por-modulo" className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={() => setAberto((v) => !v)}
      >
        <Columns3 aria-hidden="true" />
        Colunas
      </Button>

      {aberto ? (
        <div
          id={painelId}
          className="grid grid-cols-1 gap-3 border-2 border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {modulos.map((modulo) => (
            <fieldset
              key={modulo.id}
              {...(modulo.cor ? { 'data-modulo': modulo.cor } : {})}
              className="flex flex-col gap-2 border-2 border-border bg-modulo p-2.5"
            >
              <legend className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em]">
                <span
                  aria-hidden="true"
                  className="size-3 border-2 border-border bg-modulo-cheia"
                />
                {modulo.titulo}
              </legend>
              {colunasDoModulo(entidade, modulo).map((campo) => {
                const id = idDoFiltro(entidade, campo) as string
                const fixa = campo.col === true
                return (
                  // O `Checkbox` do react-aria JÁ é o `<label>` e associa o
                  // texto que recebe como filho — envolvê-lo em outro `<label>`
                  // daria dois rótulos para o mesmo controle.
                  <Checkbox
                    key={campo.k}
                    isSelected={fixa || extras.includes(id)}
                    isDisabled={fixa}
                    onChange={() => alternar(id)}
                    // Diretriz 1: o conteúdo NÃO clareia. O que muda é o cursor
                    // e o aviso ao lado — a letra continua preta.
                    className={cn(fixa ? 'cursor-not-allowed' : 'cursor-pointer')}
                  >
                    {campo.r}
                    {fixa ? (
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">
                        fixa
                      </span>
                    ) : null}
                  </Checkbox>
                )
              })}
            </fieldset>
          ))}
        </div>
      ) : null}
    </div>
  )
}
