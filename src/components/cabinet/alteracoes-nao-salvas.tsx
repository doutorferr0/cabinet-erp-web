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
        <output className="font-semibold text-sm">Alterações não salvas</output>
        <span className="text-muted-foreground text-sm">
          O que você digitou ainda não foi para o servidor.
        </span>
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
