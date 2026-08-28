import { Label } from '@/components/ui/label'
import { useCaixas, useContasBancarias, useModosDeQuitacao } from '@/data/financeiro-api'
import { useId } from 'react'

/**
 * O DESTINO do dinheiro — conta bancária **ou** caixa, nunca os dois.
 *
 * O contrato faz do destino um campo obrigatório e exclusivo (`bankAccountId`
 * XOR `cashRegisterId`; os dois juntos, ou nenhum, é 400), e a razão está
 * escrita lá: é o destino que faz a baixa virar linha de extrato. Sem conta, o
 * dinheiro fica quitado no sistema e invisível no caixa — que é o elo que a
 * api#112 carregava aberto.
 *
 * ## Um controle só, e não dois campos com uma regra entre eles
 *
 * Dois combos lado a lado ("conta" e "caixa") deixariam o operador preencher os
 * dois e descobrir a exclusividade no 400 do servidor, depois de o diálogo
 * inteiro estar preenchido. Aqui a exclusividade é a FORMA do controle: uma
 * lista só, onde cada opção já é um dos dois destinos. Estado impossível não
 * existe para ser validado.
 *
 * O valor sai como `{ bankAccountId } | { cashRegisterId }` — a forma do corpo,
 * montada onde a escolha acontece.
 */
export type Destino = { bankAccountId: string } | { cashRegisterId: string } | null

/** `conta:<id>` / `caixa:<id>` — o par (tipo, id) num valor de `<option>`. */
function paraChave(destino: Destino): string {
  if (destino && 'bankAccountId' in destino) return `conta:${destino.bankAccountId}`
  if (destino && 'cashRegisterId' in destino) return `caixa:${destino.cashRegisterId}`
  return ''
}

function daChave(chave: string): Destino {
  const [tipo, id] = chave.split(':')
  if (!id) return null
  return tipo === 'conta' ? { bankAccountId: id } : { cashRegisterId: id }
}

export function DestinoDaBaixa({
  valor,
  onChange,
  disabled = false,
}: {
  valor: Destino
  onChange: (destino: Destino) => void
  disabled?: boolean
}) {
  const id = useId()
  const contas = useContasBancarias()
  const caixas = useCaixas()
  const carregando = contas.isPending || caixas.isPending
  const vazio = !carregando && (contas.data?.length ?? 0) + (caixas.data?.length ?? 0) === 0

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Destino do dinheiro</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:focus-ring"
        value={paraChave(valor)}
        disabled={disabled || carregando || vazio}
        onChange={(e) => onChange(daChave(e.target.value))}
      >
        <option value="">{carregando ? 'Carregando…' : 'Escolha a conta ou o caixa'}</option>
        {/* Os dois grupos na MESMA lista: é o que torna a escolha exclusiva por
            construção, e é também como o operador pensa — "onde o dinheiro
            entrou", não "de que espécie é a conta onde o dinheiro entrou". */}
        {(contas.data?.length ?? 0) > 0 ? (
          <optgroup label="Contas bancárias">
            {contas.data?.map((c) => (
              <option key={c.id} value={`conta:${c.id}`}>
                {c.name}
                {c.bankCode ? ` — ${c.bankCode}` : ''}
              </option>
            ))}
          </optgroup>
        ) : null}
        {(caixas.data?.length ?? 0) > 0 ? (
          <optgroup label="Caixas">
            {caixas.data?.map((c) => (
              <option key={c.id} value={`caixa:${c.id}`}>
                {c.code} — {c.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {vazio ? (
        // Sem conta cadastrada não há baixa possível, e dizer isso aqui é
        // melhor que um combo vazio: o cadastro de banco e caixa é o menu
        // `Tabelas → Financeiro`, que ainda não tem tela — o contrato publica
        // essas listas só para LEITURA.
        <p className="text-xs text-muted-foreground">
          Nenhuma conta ou caixa cadastrado nesta empresa — sem destino não há como lançar a baixa.
        </p>
      ) : null}
    </div>
  )
}

/**
 * O MEIO pelo qual o dinheiro andou — obrigatório em toda quitação.
 *
 * A lista já vem filtrada por `usableInSettlement`: o legado exclui certos modos
 * da quitação com uma cláusula solta, e o contrato publicou isso como parâmetro.
 * Oferecer um modo que o servidor recusa poria o 400 no `Gravar`, depois de o
 * diálogo estar preenchido.
 */
export function ModoDePagamento({
  valor,
  onChange,
  disabled = false,
}: {
  valor: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const id = useId()
  const modos = useModosDeQuitacao()

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Meio de pagamento</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:focus-ring"
        value={valor}
        disabled={disabled || modos.isPending}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{modos.isPending ? 'Carregando…' : 'Escolha o meio'}</option>
        {modos.data?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.code} — {m.name}
          </option>
        ))}
      </select>
    </div>
  )
}
