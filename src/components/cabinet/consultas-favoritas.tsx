import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import type { FavoritoDeConsulta } from '@/lib/favoritos-de-consulta'
import { Star, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'

export interface ConsultasFavoritasProps {
  favoritos: readonly FavoritoDeConsulta[]
  /** Há filtro ou ordenação na tela agora? Sem isso não há o que salvar. */
  podeSalvar: boolean
  onAplicar: (favorito: FavoritoDeConsulta) => void
  onSalvar: (nome: string) => void
  onExcluir: (id: string) => void
  onTornarPadrao: (id: string) => void
}

/**
 * CONSULTAS FAVORITAS — a consulta montada, com nome, para refazer depois.
 *
 * ## Por que é um botão separado do `Filtro`
 *
 * O `Filtro` da barra padrão foi ocupado pelo painel de filtro (#76), e este é
 * outro verbo: lá se MONTA a pergunta, aqui se GUARDA e se REPETE. Somar as duas
 * coisas no mesmo popover esconderia a lista de consultas atrás de um clique num
 * painel que já é denso.
 *
 * ## "Um clique" é do PADRÃO; os outros custam dois, e por escolha
 *
 * O favorito marcado como padrão é aplicado ao abrir a tela — zero clique, que é
 * o caso que se repete todo dia. Os demais saem da lista dentro do popover:
 * dois cliques. A alternativa de uma fileira de etiquetas na barra daria um
 * clique para todos, mas numa tela com seis consultas salvas ela empurraria a
 * barra de ações padrão (§9, padrão 4) para fora da vista — e essa barra é a
 * mesma em oito telas, o que a torna a última coisa a ceder espaço.
 *
 * ## A estrela é o padrão, não a "importância"
 *
 * Um só padrão por tela. Clicar na estrela de outro move a marca; clicar na do
 * próprio desmarca — senão não haveria como voltar a abrir a tela sem filtro.
 */
export function ConsultasFavoritas({
  favoritos,
  podeSalvar,
  onAplicar,
  onSalvar,
  onExcluir,
  onTornarPadrao,
}: ConsultasFavoritasProps) {
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [nome, setNome] = useState('')
  const campoId = useId()

  function confirmarSalvar() {
    const limpo = nome.trim()
    if (!limpo) return
    onSalvar(limpo)
    setNome('')
    setSalvando(false)
    setAberto(false)
  }

  return (
    <>
      <PopoverTrigger isOpen={aberto} onOpenChange={setAberto}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={
            favoritos.length > 0
              ? `Consultas salvas — ${favoritos.length}`
              : 'Consultas salvas — nenhuma'
          }
        >
          <Star aria-hidden="true" className="text-modulo" />
          Consultas
          {favoritos.length > 0 ? (
            <span className="ml-1 border-2 border-border bg-primary px-1 font-mono text-[10px] tabular-nums text-primary-foreground">
              {favoritos.length}
            </span>
          ) : null}
        </Button>

        <Popover className="w-80 p-3" placement="bottom start">
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-xs uppercase tracking-[0.12em]">
              {favoritos.length > 0 ? 'Consultas salvas' : 'Nenhuma consulta salva'}
            </h4>

            {favoritos.length > 0 ? (
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {favoritos.map((favorito) => (
                  <li key={favorito.id} className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-w-0 flex-1 justify-start font-normal"
                      onClick={() => {
                        onAplicar(favorito)
                        setAberto(false)
                      }}
                    >
                      <span className="truncate">{favorito.nome}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        favorito.padrao
                          ? `Deixar de abrir “${favorito.nome}” por padrão`
                          : `Abrir “${favorito.nome}” por padrão`
                      }
                      aria-pressed={favorito.padrao}
                      onClick={() => onTornarPadrao(favorito.id)}
                    >
                      {/* Preenchida = é o padrão. O contorno sozinho seria só um
                          enfeite ao lado do nome. */}
                      <Star
                        className={favorito.padrao ? 'size-4 fill-current text-modulo' : 'size-4'}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Excluir a consulta “${favorito.nome}”`}
                      onClick={() => onExcluir(favorito.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Monte um filtro e salve a consulta para repetir depois.
              </p>
            )}

            <Button
              type="button"
              size="sm"
              disabled={!podeSalvar}
              title={podeSalvar ? undefined : 'Não há filtro nem ordenação nesta tela para salvar.'}
              onClick={() => setSalvando(true)}
            >
              Salvar consulta atual…
            </Button>
          </div>
        </Popover>
      </PopoverTrigger>

      <Dialog isOpen={salvando} onOpenChange={setSalvando} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Salvar consulta</DialogTitle>
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
              confirmarSalvar()
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setSalvando(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!nome.trim()} onClick={confirmarSalvar}>
            Gravar
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
