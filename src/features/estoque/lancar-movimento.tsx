import type { StockLocationDto } from '@/api/gerado'
import { RadioField, SelectIdField, TextField } from '@/components/cabinet/form-controls'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { useLancarMovimento } from '@/data/estoque-api'
import { mensagemDoErro } from '@/lib/erros'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

/**
 * LANÇAR MOVIMENTO — entrada, saída e ajuste, sobre a MESMA operação.
 *
 * O contrato publica UMA escrita de estoque (`CreateStockMovement`), com três
 * campos: `locationId`, `delta` e `reason`. Não há tipo de movimento no corpo —
 * o que separa entrada de saída é o SINAL do `delta`, e mais nada. Por isso as
 * três telas do G12 são este diálogo em três modos, e não três caminhos.
 *
 * ## Por que três modos, se a chamada é uma
 *
 * Porque o GESTO é diferente, e é ele que decide o sinal. O legado guardava a
 * distinção em `estoque_log.Elg_operacao` (`'E'`, `'S'`, `'A'` — entrada, saída,
 * ajuste), e ela sobrevive à modelagem nova mesmo sem coluna: quem clica
 * "Entrada" já disse para que lado a peça anda, e reperguntar seria desfazer o
 * que o clique informou. O AJUSTE é o único que pergunta a direção, e é essa a
 * diferença dele: correção vai para os dois lados — perda e quebra tiram, peça
 * achada põe —, e essa escolha é do operador, não do botão.
 *
 * ## O motivo é TEXTO LIVRE, e a tela não inventa vocabulário
 *
 * `reason` é `varchar` sem domínio no schema e `string` sem `enum` no contrato.
 * A tentação é o modo carimbar um prefixo ("Entrada manual — …") para o filtro
 * da coluna existir; a tela não faz isso. Vocabulário que só um dos produtores
 * de movimento respeita é pior que nenhum: o recebimento de compra, a venda e a
 * carga do legado escrevem no mesmo campo sem passar por aqui, e a coluna
 * ficaria com metade carimbada e metade não — que é exatamente a aparência de
 * dado classificado, sem a substância. A proposta de domínio fechado está em
 * `docs/harvest/estoque-telas/vocabulario-de-movimento.md` e é mudança de
 * CONTRATO, não de tela.
 *
 * ## O que este diálogo NÃO confere antes de mandar
 *
 * 1. **Saldo suficiente.** Ele tem o saldo do depósito na tela ao lado e mesmo
 *    assim não o usa para recusar. Entre a leitura e o clique outro operador
 *    pode ter movimentado: recusar aqui mostraria "não tem saldo" para um
 *    pedido que o servidor aceitaria, e — pior — deixaria passar um que ele
 *    recusa. Quem conta é quem grava; o 409 vem com `detail` e aparece inteiro.
 * 2. **Variante nunca precificada.** Movimento numa variante sem linha de
 *    `product_tenant` faz o SERVIDOR criar a linha (decisão do user,
 *    2026-08-18): estoque é fato físico, preço é decisão comercial. A tela não
 *    tem regra sobre isso — nem para permitir, nem para impedir.
 * 3. **Depósito inativo.** Ele aparece na lista marcado, porque o saldo que
 *    ficou lá continua existindo, e o 409 do servidor é quem recusa o movimento
 *    novo.
 *
 * O que sobra de validação local são as DUAS recusas que o servidor também faz
 * com 400 (`delta` ausente, `reason` em branco) mais a quantidade positiva —
 * regra da tela, não do servidor, porque aqui a direção já saiu do modo e uma
 * quantidade negativa digitada inverteria o gesto em silêncio.
 */

export type ModoDeLancamento = 'entrada' | 'saida' | 'ajuste'

const VOZ_DO_MODO: Record<ModoDeLancamento, { titulo: string; contexto: string }> = {
  entrada: {
    titulo: 'Entrada',
    contexto: 'A quantidade ENTRA no depósito escolhido.',
  },
  saida: {
    titulo: 'Saída',
    contexto: 'A quantidade SAI do depósito escolhido.',
  },
  ajuste: {
    titulo: 'Ajuste',
    contexto: 'Correção de saldo — escolha para que lado o ajuste anda.',
  },
}

/**
 * Texto digitado → quantidade, ou `null` quando não é quantidade.
 *
 * Aceita vírgula e ponto como separador decimal porque o operador digita em
 * pt-BR e o teclado numérico manda ponto. **Recusa mais de três casas**, que é a
 * escala de `numeric(18,3)`: aparar em silêncio faria quem digitou `0,0005`
 * gravar zero e concluir que gravou meio milésimo.
 *
 * Recusa também o zero e o negativo — não porque o servidor os recuse (ele
 * aceita o zero de propósito, e o negativo É a saída), mas porque aqui a
 * direção já veio do modo. Ver o cabeçalho.
 *
 * Exportada e pura: é a regra que o teste exercita sem montar o diálogo.
 */
export function quantidadeDoTexto(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(limpo)) return null
  const valor = Number(limpo)
  return valor > 0 ? valor : null
}

/**
 * O `delta` do corpo: a quantidade com o sinal que o gesto determinou.
 *
 * Entrada e saída não olham o `sentido` — o botão já disse. O ajuste é o único
 * que o consulta, e um ajuste sem sentido escolhido não chega aqui (o schema o
 * exige).
 */
export function deltaDoLancamento(
  modo: ModoDeLancamento,
  sentido: 'acrescentar' | 'retirar',
  quantidade: number,
): number {
  if (modo === 'entrada') return quantidade
  if (modo === 'saida') return -quantidade
  return sentido === 'retirar' ? -quantidade : quantidade
}

const esquema = z.object({
  // `null` = depósito PADRÃO da empresa, que o servidor cria sob demanda. É
  // escolha com significado, e por isso o campo não é obrigatório.
  locationId: z.string().nullable(),
  quantidade: z
    .string()
    .trim()
    .refine((texto) => quantidadeDoTexto(texto) !== null, {
      message: 'Informe uma quantidade maior que zero, com até três casas.',
    }),
  sentido: z.enum(['acrescentar', 'retirar']),
  reason: z.string().trim().min(1, 'Informe o motivo do movimento.'),
})

type Campos = z.infer<typeof esquema>

export function LancarMovimento({
  aberto,
  modo,
  variantId,
  depositos,
  depositoSugerido,
  onOpenChange,
}: {
  aberto: boolean
  modo: ModoDeLancamento
  variantId: string
  depositos: readonly StockLocationDto[]
  /** O depósito que o filtro da tela já escolheu — `null` = o padrão da empresa. */
  depositoSugerido: string | null
  onOpenChange: (aberto: boolean) => void
}) {
  const lancar = useLancarMovimento(variantId)
  const voz = VOZ_DO_MODO[modo]

  const vazio: Campos = {
    locationId: depositoSugerido,
    quantidade: '',
    sentido: 'acrescentar',
    reason: '',
  }

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: vazio,
    // O modo e o depósito do filtro mudam entre uma abertura e outra: sem isto
    // o formulário guardaria os da vez anterior, e o operador lançaria uma
    // saída no depósito que ele acabou de deixar de olhar.
    values: vazio,
    resetOptions: { keepDirtyValues: true },
  })

  function gravar(campos: Campos) {
    const quantidade = quantidadeDoTexto(campos.quantidade)
    if (quantidade === null) return
    lancar.mutate(
      {
        locationId: campos.locationId,
        delta: deltaDoLancamento(modo, campos.sentido, quantidade),
        reason: campos.reason,
      },
      {
        onSuccess: () => {
          form.reset(vazio)
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{voz.titulo}</DialogTitle>
        <DialogDescription>{voz.contexto}</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(gravar)} className="flex flex-col gap-3">
          <SelectIdField
            name="locationId"
            label="Depósito"
            opcoes={depositos.map((deposito) => ({
              id: deposito.id,
              nome: deposito.active ? deposito.name : `${deposito.name} (inativo)`,
            }))}
            // A opção nula não é "nenhum": ela é o depósito PADRÃO da empresa,
            // que o servidor resolve — e cria, se a empresa ainda não tem
            // nenhum. Chamá-la de "Selecione…" faria o operador procurar o que
            // escolher numa lista que pode estar legitimamente vazia.
            vazio="Depósito padrão da empresa"
          />

          {modo === 'ajuste' ? (
            <RadioField
              name="sentido"
              label="Sentido"
              options={[
                { value: 'acrescentar', label: 'Acrescentar' },
                { value: 'retirar', label: 'Retirar' },
              ]}
            />
          ) : null}

          <TextField
            name="quantidade"
            label="Quantidade"
            inputMode="decimal"
            autoFocus
            autoComplete="off"
          />

          <TextField
            name="reason"
            label="Motivo"
            autoComplete="off"
            placeholder="Por que esta peça se moveu"
          />

          {lancar.isError ? (
            <p role="alert" className="text-destructive text-sm">
              {/* O `detail` do problem+json por cima do fallback: as recusas
                  daqui (saldo negativo, depósito inativo, variante inexistente)
                  são todas explicadas pelo servidor, e a frase da tela seria
                  pior do que a dele em todas. */}
              {mensagemDoErro(lancar.error, 'Falha ao lançar o movimento.')}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" isDisabled={lancar.isPending}>
              {lancar.isPending ? 'Lançando…' : 'Lançar'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Dialog>
  )
}
