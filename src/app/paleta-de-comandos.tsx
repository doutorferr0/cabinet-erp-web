import { type Comando, comandosDaPaleta } from '@/app/comandos'
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

export interface PaletaDeComandosProps {
  aberta: boolean
  onOpenChange: (aberta: boolean) => void
}

/**
 * PALETA DE COMANDOS GLOBAL — ir para qualquer tela e abrir registro novo.
 *
 * Referência: a command palette do Supabase Studio (Apache-2.0, `project-core`
 * @regras). Do original vem a ANATOMIA — caixa modal, uma busca no topo,
 * resultados agrupados por verbo. O conteúdo é montado da navegação deste
 * sistema (`comandosDaPaleta`), não portado.
 *
 * ## O atalho é conveniência; o CAMINHO é o clique
 *
 * `Ctrl+K` já existe no registry (`shortcuts.ts`) e não é atalho novo — a regra
 * do CLAUDE.md proíbe criar, não usar o que está lá. E ele não é o único acesso:
 * **quem abre a paleta por mouse é o campo de busca da appbar**, que até aqui
 * aceitava digitação e não fazia nada. Ter só a tecla faria a paleta violar a
 * decisão de interface por clique; ter só o campo desperdiçaria um atalho já
 * documentado para um operador que veio de sistema de teclado.
 *
 * ## O que ela oferece é o que a EMPRESA alcança
 *
 * `comandosDaPaleta` lê os mesmos `gruposVisiveis` da barra lateral. Uma tela
 * cujo recurso a empresa não tem some dos dois ao mesmo tempo — oferecer aqui o
 * que a barra esconde daria caminho para uma tela que a guarda vai recusar.
 */
export function PaletaDeComandos({ aberta, onOpenChange }: PaletaDeComandosProps) {
  const navigate = useNavigate()
  const { pathname } = useRouterState({ select: (estado) => estado.location })
  const { tem } = useRecursosDaEmpresa()

  const comandos = useMemo(() => comandosDaPaleta(tem, pathname), [tem, pathname])

  // Os grupos saem na ordem em que os comandos vêm — `comandosDaPaleta` já
  // decidiu que o contexto encabeça. Reordenar aqui seria uma segunda regra de
  // prioridade, contradizendo a primeira sem ninguém perceber.
  const grupos = useMemo(() => {
    const porGrupo = new Map<string, Comando[]>()
    for (const comando of comandos) {
      const lista = porGrupo.get(comando.grupo)
      if (lista) lista.push(comando)
      else porGrupo.set(comando.grupo, [comando])
    }
    return [...porGrupo.entries()]
  }, [comandos])

  useEffect(() => bindShortcut(SHORTCUTS.busca, () => onOpenChange(true)), [onOpenChange])

  function executar(comando: Comando) {
    onOpenChange(false)
    void navigate({ to: comando.url })
  }

  return (
    <CommandDialog
      open={aberta}
      onOpenChange={onOpenChange}
      title="Comandos"
      description="Digite para achar uma tela ou uma ação."
    >
      <Command>
        <CommandInput placeholder="Ir para uma tela ou incluir um registro…" />
        <CommandList
          renderEmptyState={() => (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum comando encontrado.
            </div>
          )}
        >
          {grupos.map(([nome, doGrupo]) => (
            <CommandGroup key={nome} heading={nome}>
              {doGrupo.map((comando) => (
                <CommandItem
                  key={comando.id}
                  id={comando.id}
                  textValue={`${comando.titulo} ${comando.descricao ?? ''}`}
                  onAction={() => executar(comando)}
                >
                  <comando.icon aria-hidden="true" className="size-4 text-modulo" />
                  <span className="min-w-0 flex-1 truncate">{comando.titulo}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

/** Rótulo do atalho, para a appbar anunciar por onde mais se abre. */
export const ATALHO_DA_PALETA = shortcutLabel(SHORTCUTS.busca)
