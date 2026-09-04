import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

/**
 * CÉLULA EDITÁVEL — a linha da listagem É o formulário (padrão D27).
 *
 * ## Por que uma lista de apoio não merece uma ficha
 *
 * `Motivos de perda` tem DOIS campos, e o contrato não publica detalhe por id:
 * a linha da listagem já é o registro inteiro. Abrir um diálogo para corrigir
 * uma letra é pedir três gestos (abrir, digitar, gravar) mais dois de descarte
 * — e o operador que quer varrer o catálogo corrigindo grafias faz isso vinte
 * vezes. Aqui o gesto é um: clicar no texto e digitar.
 *
 * ## O que ela NÃO faz, de propósito
 *
 * Não grava a cada tecla. `Enter` e a saída do campo comitam; `Esc` desiste e
 * devolve o valor de antes. Gravar por tecla transformaria uma correção de
 * grafia em oito requisições e deixaria estados intermediários no servidor
 * ("Preç", "Preço alt") — que é o que uma lista somada no fim do ano não pode
 * ter.
 *
 * Valor igual ao de antes não vira requisição: entrar e sair de um campo sem
 * mexer nele não é uma alteração, e gravar assim mesmo encheria o histórico do
 * registro de nada.
 *
 * ## Ela é alcançável por CLIQUE e por TECLADO
 *
 * O modo de leitura é um `<button>`, não um `<div>` com `onClick`: entra no
 * Tab, responde a Enter e o leitor de tela anuncia que ali se edita. A regra da
 * casa é interface por clique — nenhum fluxo depende de tecla memorizada —, e
 * o `Alterar` da barra de ações abre a MESMA célula, pelo `editando`.
 */
export function CelulaEditavel({
  valor,
  rotulo,
  editando,
  readOnly = false,
  pendente = false,
  aoEditar,
  aoGravar,
  aoDesistir,
}: {
  valor: string
  /** O que o leitor de tela ouve — "Motivo de perda", não "campo". */
  rotulo: string
  editando: boolean
  readOnly?: boolean
  pendente?: boolean
  aoEditar: () => void
  aoGravar: (novo: string) => void
  aoDesistir: () => void
}) {
  const [rascunho, setRascunho] = useState(valor)
  const campo = useRef<HTMLInputElement>(null)

  // O rascunho nasce do valor a cada ABERTURA, e não a cada render: sem isto,
  // o `invalidate` que chega depois de gravar reescreveria o que o operador
  // está digitando na linha seguinte.
  useEffect(() => {
    if (!editando) return
    setRascunho(valor)
    campo.current?.focus()
    campo.current?.select()
  }, [editando, valor])

  if (!editando) {
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={aoEditar}
        aria-label={`Editar ${rotulo}: ${valor}`}
        className={cn(
          't-corpo w-full truncate rounded-[var(--r-item)] px-[var(--s-1)] py-px text-left',
          !readOnly && 'hover:bg-[var(--hover)]',
        )}
      >
        {valor}
      </button>
    )
  }

  function comitar() {
    const novo = rascunho.trim()
    // Vazio não grava e não some: um catálogo com um motivo sem nome é pior que
    // a correção interrompida. Desistir devolve o que estava lá.
    if (!novo || novo === valor) {
      aoDesistir()
      return
    }
    aoGravar(novo)
  }

  return (
    <Input
      ref={campo}
      aria-label={rotulo}
      value={rascunho}
      disabled={pendente}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={comitar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          comitar()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          aoDesistir()
        }
      }}
      className="h-7"
    />
  )
}
