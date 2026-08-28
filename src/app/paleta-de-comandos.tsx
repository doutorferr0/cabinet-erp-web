import { type Comando, comandosDaPaleta } from '@/app/comandos'
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  MINIMO_DE_LETRAS,
  type ResultadoDeBusca,
  useBuscaDeRegistro,
  useTermoAdiado,
} from '@/data/busca-de-registro'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFilter } from 'react-aria-components'

export interface PaletaDeComandosProps {
  aberta: boolean
  onOpenChange: (aberta: boolean) => void
}

/**
 * PALETA DE COMANDOS GLOBAL — ir para qualquer tela, abrir registro novo e
 * ACHAR REGISTRO pelo nome ou pelo número.
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
 * que a barra esconde daria caminho para uma tela que a guarda vai recusar. A
 * busca de registro segue a mesma regra: parceiro cujo único papel a empresa
 * não opera não vira resultado (`fichaDoParceiro`).
 *
 * ## Os REGISTROS vêm por último, e é uma decisão, não sobra
 *
 * Os comandos chegam sem rede e a lista deles não muda; os registros chegam
 * depois, quando as quatro consultas voltam. Pôr os registros em cima faria a
 * lista CRESCER POR CIMA do item que o operador já estava mirando com a seta —
 * ele teclaria Enter num destino que não escolheu. Embaixo, a chegada da rede
 * nunca move o que já está na tela.
 */
export function PaletaDeComandos({ aberta, onOpenChange }: PaletaDeComandosProps) {
  const navigate = useNavigate()
  const { pathname } = useRouterState({ select: (estado) => estado.location })
  const { tem } = useRecursosDaEmpresa()
  const [texto, setTexto] = useState('')

  const comandos = useMemo(() => comandosDaPaleta(tem, pathname), [tem, pathname])
  const busca = useBuscaDeRegistro(useTermoAdiado(texto))

  // Fechar e reabrir tem de dar uma caixa limpa: a paleta é o começo de uma
  // ação nova, e reabrir com o termo da anterior mostraria resultados de uma
  // busca que a pessoa já abandonou.
  useEffect(() => {
    if (!aberta) setTexto('')
  }, [aberta])

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

  /**
   * O filtro do `Autocomplete` é LOCAL, e os registros vieram do servidor.
   *
   * Quem casou o termo lá foi o `q` do backend, por campos que nem sempre estão
   * escritos na linha — CNPJ, código, número do documento. Deixar o filtro local
   * decidir de novo esconderia resultado já encontrado, e o operador leria
   * "nada achado" para uma busca que achou. Por isso todo `textValue` que a
   * busca devolveu passa direto; o filtro continua valendo para os comandos.
   */
  const { contains } = useFilter({ sensitivity: 'base' })
  const doServidor = useMemo(
    () => new Set(busca.grupos.flatMap((grupo) => grupo.itens.map((item) => item.textValue))),
    [busca.grupos],
  )
  const filtro = useCallback(
    (textValue: string, inputValue: string) =>
      doServidor.has(textValue) || contains(textValue, inputValue),
    [doServidor, contains],
  )

  useEffect(() => bindShortcut(SHORTCUTS.busca, () => onOpenChange(true)), [onOpenChange])

  function executar(comando: Comando) {
    onOpenChange(false)
    // Destino externo não é rota: `navigate` o levaria ao 404 do roteador, com
    // o arquivo servido pelo mesmo domínio ali do lado. Abre em aba nova, como
    // a barra lateral faz com o mesmo item — dois caminhos para o mesmo lugar
    // não podem se comportar diferente.
    if (comando.externo) {
      window.open(comando.url, '_blank', 'noreferrer')
      return
    }
    void navigate({ to: comando.url })
  }

  function abrir(resultado: ResultadoDeBusca) {
    onOpenChange(false)
    void navigate({ to: resultado.url })
  }

  return (
    <CommandDialog
      open={aberta}
      onOpenChange={onOpenChange}
      title="Comandos"
      description="Digite para achar uma tela, uma ação ou um registro."
    >
      <Command inputValue={texto} onInputChange={setTexto} filter={filtro}>
        <CommandInput placeholder="Tela, ação, ou nome/número de um registro…" />
        <CommandList
          renderEmptyState={() => (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {busca.buscando ? 'Procurando…' : 'Nenhum comando encontrado.'}
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
          {busca.grupos.map((grupo) => (
            <CommandGroup
              key={grupo.chave}
              // O cabeçalho DIZ quando a página cortou: "3 de 47" é a diferença
              // entre "só há três" e "estes são os três primeiros de 47", e sem
              // ela o operador conclui que o registro não existe.
              heading={
                grupo.cortado
                  ? `${grupo.titulo} — ${grupo.itens.length} de ${grupo.total}`
                  : grupo.titulo
              }
            >
              {grupo.itens.map((item) => (
                <CommandItem
                  key={item.id}
                  id={item.id}
                  textValue={item.textValue}
                  onAction={() => abrir(item)}
                >
                  <item.icon aria-hidden="true" className="size-4 text-modulo" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{item.titulo}</span>
                    {item.subtitulo && (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.subtitulo}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <RodapeDaBusca
          curto={busca.curto}
          buscando={busca.buscando}
          falharam={busca.falharam}
          digitou={texto.trim().length > 0}
        />
      </Command>
    </CommandDialog>
  )
}

/**
 * A linha de baixo, que diz por que a busca de registro não respondeu.
 *
 * São três silêncios diferentes e o operador não tem como distingui-los sozinho:
 * ainda não digitou o bastante, está esperando o servidor, ou uma das consultas
 * falhou. O terceiro é o caro — sem ele, alvo fora do ar vira "não existe
 * nenhum produto com esse nome", que é a mesma tela de uma busca bem-sucedida e
 * vazia.
 */
function RodapeDaBusca({
  curto,
  buscando,
  falharam,
  digitou,
}: {
  curto: boolean
  buscando: boolean
  falharam: string[]
  digitou: boolean
}) {
  if (falharam.length > 0) {
    return (
      <p className="border-t border-border px-3 py-2 text-xs text-destructive">
        Não foi possível procurar em: {falharam.join(', ')}. As telas dessas listagens continuam
        abrindo pelo nome.
      </p>
    )
  }
  if (buscando) {
    return (
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Procurando registros…
      </p>
    )
  }
  if (digitou && curto) {
    return (
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Digite {MINIMO_DE_LETRAS} letras ou mais para procurar clientes, produtos e documentos.
      </p>
    )
  }
  return null
}

/** Rótulo do atalho, para a appbar anunciar por onde mais se abre. */
export const ATALHO_DA_PALETA = shortcutLabel(SHORTCUTS.busca)
