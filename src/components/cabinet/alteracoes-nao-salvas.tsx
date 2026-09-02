import { Ornamento } from '@/components/cabinet/ornamento'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useBlocker } from '@tanstack/react-router'
import { Check, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface AlteracoesNaoSalvasProps {
  /** Gravação em curso: o `Gravar` da barra desabilita junto com o do rodapé. */
  gravando?: boolean
  /**
   * Pode sair sem perguntar? Lida no momento da navegação, e por FUNÇÃO e não
   * por booleano de props: quem grava navega no mesmo tique do `submit`, antes
   * de qualquer re-render, e um valor congelado no render anterior faria a
   * guarda barrar a saída que o próprio `Gravar` provocou.
   */
  podeSair: () => boolean
  /** Volta o formulário ao que o servidor mandou (`form.reset()`). */
  onDescartar: () => void
}

/**
 * ALTERAÇÕES NÃO SALVAS (Polaris-5, issue #200) — a barra contextual do topo,
 * mais a guarda de navegação que ela implica.
 *
 * **Este é o regime do CADASTRO, que ainda grava por botão.** O documento 2.0
 * (#483) não tem mais `Gravar`: lá quem grava é a fila do `useAutosave` e quem
 * guarda a saída é a `GuardaDeAutosave`, mais abaixo neste arquivo. As duas
 * peças convivem enquanto os dois regimes convivem, e a diferença entre elas é
 * a pergunta que fazem na porta: aqui "você não gravou", lá "ainda estou
 * gravando".
 *
 * O formulário do Cabinet tem quarenta campos e um rodapé colado embaixo. O que
 * faltava não era o botão: era a tela DIZER que existe trabalho não gravado. Sem
 * isso, o operador que trocou de tela levava consigo a dúvida — "eu gravei?" —
 * e a única resposta era abrir de novo e conferir campo a campo.
 *
 * ## As três peças são a mesma peça
 *
 * Barra, `Descartar` e guarda de navegação nascem juntas e da mesma condição:
 * há alteração pendente. Separá-las em três componentes daria três lugares para
 * a condição divergir — e uma guarda que bloqueia a saída sem barra que explique
 * o porquê é a pior das combinações.
 *
 * ## O `Gravar` SOBE, não se duplica
 *
 * Enquanto a barra está no ar, o `Gravar` do rodapé sai (o `CadastroForm` cuida
 * disso) e o desta barra é o único da tela. Dois botões com o mesmo rótulo e o
 * mesmo efeito na mesma tela fariam o operador procurar a diferença entre eles
 * — e não há.
 *
 * ## Por que a guarda mora num componente que só existe quando há o que guardar
 *
 * `useBlocker` exige contexto de router. Montá-la sempre obrigaria todo teste de
 * componente isolado (`renderWithQuery`, sem router) a montar um router para
 * exercitar um formulário limpo. Aqui a guarda nasce com a sujeira e morre com
 * ela — que é exatamente quando o router está por perto, porque quem editou
 * chegou por uma rota.
 */
export function AlteracoesNaoSalvas({
  gravando = false,
  podeSair,
  onDescartar,
}: AlteracoesNaoSalvasProps) {
  // `shouldBlockFn` chama `podeSair` na hora da navegação — ver a prop.
  const bloqueio = useBlocker({ shouldBlockFn: () => !podeSair(), withResolver: true })

  return (
    <>
      {/* Zona de INFORMAÇÃO (`--zone-info`), não a tinta escura do Polaris nem
          o amarelo: a folha do Cabinet é clara, o repo já tem zonas com emprego
          fixo que viram sozinhas no tema escuro, e o amarelo aqui é FOCO — usá-lo
          como fundo de faixa faria a tela inteira parecer focada. Traço 2px e
          canto do sistema: a barra é peça da folha, não faixa flutuante. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-card border-2 border-border bg-zone-info px-3.5 py-2.5">
        {/* `<output>` e não `role="status"`: mesmo anúncio educado que a
            listagem usa para o total — a barra APARECE no meio da digitação, e
            quem não vê a tela precisa ouvir que ela chegou. */}
        <output className="t-bloco">Alterações não salvas</output>
        <span className="t-meta">O que você digitou ainda não foi para o servidor.</span>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDescartar}>
            <Undo2 aria-hidden="true" />
            Descartar
          </Button>
          <Button type="submit" size="sm" disabled={gravando}>
            <Check aria-hidden="true" />
            Gravar
          </Button>
        </div>
      </div>

      <AlertDialog
        isOpen={bloqueio.status === 'blocked'}
        onOpenChange={(aberto) => {
          // Fechar pelo Esc ou pelo clique fora é DESISTIR de sair — a saída
          // exige a afirmação explícita do botão.
          if (!aberto) bloqueio.reset?.()
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertDialogMedia>
              {/* Mesmo ornamento da confirmação de desativação, e no mesmo tom:
                  os dois diálogos perguntam sobre perda — de cadastro lá, de
                  digitação aqui. */}
              <Ornamento shape="alerta" tom="erro" tamanho={40} />
            </AlertDialogMedia>
            <AlertDialogTitle>Sair sem gravar?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Esta tela tem alterações que ainda não foram gravadas. Sair agora as descarta — não há
            rascunho guardado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* A saída fica em DESTRUTIVO e a permanência em ação neutra: entre as
              duas, a que perde trabalho é a que precisa ser lida antes. */}
          <AlertDialogCancel onPress={() => bloqueio.reset?.()}>
            Continuar editando
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={() => bloqueio.proceed?.()}>
            Sair sem gravar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  )
}

/* =====================================================================
   AUTOSAVE DO REGISTRO (2.0, #483) — o regime de gravação do documento
   ===================================================================== */

/** 800ms: a pausa de quem parou de digitar, não o intervalo entre duas teclas. */
export const DEBOUNCE_DO_AUTOSAVE_MS = 800

export type FaseDoAutosave = 'ocioso' | 'pendente' | 'salvando' | 'salvo' | 'erro' | 'conflito'

export interface EstadoDoAutosave {
  fase: FaseDoAutosave
  /** `Date.now()` da última gravação confirmada — a base do "salvo há n s". */
  salvoEm: number | null
  /** `detail` do problem+json quando a gravação falha; some no sucesso seguinte. */
  erro: string | null
}

export interface FilaDeAutosave {
  estado: EstadoDoAutosave
  /**
   * Agenda a gravação do registro POR CAUSA de um campo. O relógio é do CAMPO
   * (cada um tem o seu), a gravação é do REGISTRO — quem mexe em três campos
   * seguidos não dispara três requisições concorrentes.
   */
  agendar: (campo: string) => void
  /** Grava agora o que está agendado — o `blur`, o `Enter`, a ação primária. */
  descarregar: () => void
  /** Refaz a gravação que falhou, com os mesmos campos. */
  tentarDeNovo: () => void
  /** Nada agendado, nada em voo, nada em erro: pode sair da tela. */
  filaVazia: () => boolean
  /** Fecha o aviso de conflito mantendo na tela o que o operador digitou. */
  descartarConflito: () => void
}

export interface UseAutosaveOptions {
  /**
   * Grava o registro. Recebe os campos que provocaram esta rodada, em ordem de
   * agendamento, porque quem grava por PATCH manda só o que mudou.
   *
   * Rejeitar com `{ conflito: true }` (ou `status: 409`) troca o erro comum
   * pelo diálogo de conflito: as duas falhas têm remédios opostos — repetir
   * resolve a primeira e PIORA a segunda, porque sobrescreveria o que outra
   * pessoa gravou no meio.
   */
  salvar: (campos: readonly string[]) => Promise<unknown>
  /** Só para teste: encurtar a espera. O padrão é o da espec. */
  debounceMs?: number
}

/** 409, ou o `conflito` que o adaptador marca. Nunca casar a string do erro. */
function ehConflito(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false
  const e = erro as { status?: unknown; conflito?: unknown }
  return e.status === 409 || e.conflito === true
}

function mensagemDoErro(erro: unknown): string {
  if (typeof erro === 'object' && erro !== null) {
    const detail = (erro as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail !== '') return detail
    const message = (erro as { message?: unknown }).message
    if (typeof message === 'string' && message !== '') return message
  }
  return 'Não foi possível gravar.'
}

/**
 * FILA DE AUTOSAVE POR REGISTRO (#483).
 *
 * O documento 2.0 não tem `Gravar`: o campo grava sozinho 800ms depois da
 * última tecla. Isso resolve o problema do rodapé — o operador que sai sem
 * gravar — e cria dois outros, que são o que este hook trata:
 *
 * 1. **Concorrência.** Três campos digitados em sequência agendariam três
 *    requisições que chegam fora de ordem, e a última a chegar vence, que pode
 *    ser a primeira que saiu. Por isso a fila é do REGISTRO e só há **uma**
 *    gravação em voo: o que for agendado enquanto ela corre espera a resposta e
 *    sai numa rodada só.
 * 2. **Silêncio.** Gravação invisível que falha é pior que botão que não grava:
 *    o operador não tem nem o botão para tentar de novo. Por isso o estado é
 *    público (`estado.fase`) — é ele que o cabeçalho mostra o tempo todo — e o
 *    erro vem com `tentarDeNovo` junto.
 *
 * O conflito é caso à parte e não se resolve repetindo: ver `salvar`.
 */
export function useAutosave({
  salvar,
  debounceMs = DEBOUNCE_DO_AUTOSAVE_MS,
}: UseAutosaveOptions): FilaDeAutosave {
  const [estado, setEstado] = useState<EstadoDoAutosave>({
    fase: 'ocioso',
    salvoEm: null,
    erro: null,
  })

  // Relógio por campo: o debounce é de quem digita, não do registro.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  // Campos agendados que ainda não entraram numa rodada de gravação.
  const pendentes = useRef<string[]>([])
  // Campos da rodada em voo — voltam para `pendentes` se ela falhar.
  const emVoo = useRef<string[] | null>(null)
  // Chegou agendamento enquanto a rodada corria: uma segunda rodada, no fim.
  const repetir = useRef(false)
  const montado = useRef(true)

  // `salvar` vem da closure da tela e muda a cada render; a fila não pode
  // depender dela para não recriar os relógios a cada tecla.
  const salvarRef = useRef(salvar)
  salvarRef.current = salvar

  useEffect(() => {
    montado.current = true
    const relogios = timers.current
    return () => {
      montado.current = false
      for (const t of relogios.values()) clearTimeout(t)
      relogios.clear()
    }
  }, [])

  const disparar = useCallback(() => {
    if (emVoo.current !== null) {
      // Uma gravação por registro. O que chegou agora sai na próxima rodada.
      repetir.current = true
      return
    }
    const campos = pendentes.current
    if (campos.length === 0) return
    pendentes.current = []
    emVoo.current = campos
    setEstado((e) => ({ ...e, fase: 'salvando', erro: null }))

    salvarRef.current(campos).then(
      () => {
        emVoo.current = null
        if (!montado.current) return
        setEstado({ fase: 'salvo', salvoEm: Date.now(), erro: null })
        if (repetir.current) {
          repetir.current = false
          disparar()
        }
      },
      (erro: unknown) => {
        // Os campos VOLTAM para a fila: `tentarDeNovo` sem eles gravaria uma
        // rodada vazia e mostraria "salvo" sem ter salvado nada.
        emVoo.current = null
        pendentes.current = [...campos, ...pendentes.current]
        repetir.current = false
        if (!montado.current) return
        setEstado((e) => ({
          ...e,
          fase: ehConflito(erro) ? 'conflito' : 'erro',
          erro: mensagemDoErro(erro),
        }))
      },
    )
  }, [])

  const agendar = useCallback(
    (campo: string) => {
      const anterior = timers.current.get(campo)
      if (anterior !== undefined) clearTimeout(anterior)
      timers.current.set(
        campo,
        setTimeout(() => {
          timers.current.delete(campo)
          if (!pendentes.current.includes(campo)) pendentes.current.push(campo)
          disparar()
        }, debounceMs),
      )
      setEstado((e) => (e.fase === 'pendente' ? e : { ...e, fase: 'pendente' }))
    },
    [debounceMs, disparar],
  )

  const descarregar = useCallback(() => {
    for (const [campo, t] of timers.current) {
      clearTimeout(t)
      if (!pendentes.current.includes(campo)) pendentes.current.push(campo)
    }
    timers.current.clear()
    disparar()
  }, [disparar])

  const tentarDeNovo = useCallback(() => {
    disparar()
  }, [disparar])

  const filaVazia = useCallback(
    () =>
      timers.current.size === 0 &&
      pendentes.current.length === 0 &&
      emVoo.current === null &&
      estado.fase !== 'erro' &&
      estado.fase !== 'conflito',
    [estado.fase],
  )

  const descartarConflito = useCallback(() => {
    // O aviso sai da tela, mas o que ele barrou continua na fila: quem insistir
    // usa `tentarDeNovo` de olhos abertos.
    setEstado((e) => (e.fase === 'conflito' ? { ...e, fase: 'erro' } : e))
  }, [])

  return { estado, agendar, descarregar, tentarDeNovo, filaVazia, descartarConflito }
}

export interface GuardaDeAutosaveProps {
  autosave: FilaDeAutosave
  /** Recarrega o registro do servidor — a saída do conflito. */
  onRecarregar?: (() => void) | undefined
}

/**
 * A GUARDA DO REGIME DE AUTOSAVE (#483) — e ela pergunta outra coisa.
 *
 * No cadastro a pergunta é "você não gravou"; aqui é "**ainda** estou
 * gravando". A diferença não é de texto: com autosave, sair no meio da fila não
 * descarta uma decisão do operador, descarta uma gravação que já foi mandada e
 * que ele nem sabe que existe. Por isso a guarda só fecha a porta enquanto a
 * fila não esvaziou — quando ela esvazia ninguém pergunta nada, que é o ponto
 * inteiro de gravar sozinho.
 *
 * O conflito abre diálogo aqui, e não no cabeçalho, porque é a única falha de
 * gravação em que repetir PIORA: quem escreveu por último venceria quem
 * escreveu certo.
 */
export function GuardaDeAutosave({ autosave, onRecarregar }: GuardaDeAutosaveProps) {
  const bloqueio = useBlocker({
    shouldBlockFn: () => !autosave.filaVazia(),
    withResolver: true,
  })

  return (
    <>
      <AlertDialog
        isOpen={bloqueio.status === 'blocked'}
        onOpenChange={(aberto) => {
          if (!aberto) bloqueio.reset?.()
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertDialogMedia>
              <Ornamento shape="alerta" tom="erro" tamanho={40} />
            </AlertDialogMedia>
            <AlertDialogTitle>A gravação ainda não terminou</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Esta ficha grava sozinha, e a última alteração ainda não voltou do servidor. Sair agora
            perde o que estiver na fila.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onPress={() => bloqueio.reset?.()}>Esperar gravar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={() => bloqueio.proceed?.()}>
            Sair mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog
        isOpen={autosave.estado.fase === 'conflito'}
        onOpenChange={(aberto) => {
          if (!aberto) autosave.descartarConflito()
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertDialogMedia>
              <Ornamento shape="alerta" tom="erro" tamanho={40} />
            </AlertDialogMedia>
            <AlertDialogTitle>Alguém gravou esta ficha antes de você</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            O servidor tem uma versão mais nova que a desta tela. Gravar por cima apagaria o que a
            outra pessoa escreveu — recarregar traz a versão de lá e descarta o que está aqui.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onPress={() => autosave.descartarConflito()}>
            Manter o que digitei
          </AlertDialogCancel>
          {onRecarregar ? (
            <AlertDialogAction
              onPress={() => {
                autosave.descartarConflito()
                onRecarregar()
              }}
            >
              Recarregar do servidor
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialog>
    </>
  )
}
