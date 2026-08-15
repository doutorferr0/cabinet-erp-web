import { type EntidadeCadastro, camposDe } from '@/features/cadastro/modulos'
import { cn } from '@/lib/utils'
import { useFormContext, useWatch } from 'react-hook-form'

/**
 * "X de N obrigatórios" — o sinal que a diretriz 3 exige no TOPO do formulário.
 *
 * ## O defeito que ela fecha
 *
 * O cadastro despeja ~40 campos e não diz o que trava o `Gravar`. O operador
 * descobre clicando: o botão não responde, o foco pula para um campo que ele já
 * passou, e nada explica quantos faltam. O asterisco resolve campo a campo; o
 * que faltava era a conta.
 *
 * ## Conta só o que o repo GUARDA
 *
 * Campo `req` sem `campo` é campo que o mockup desenhou e nenhum formulário
 * grava (`semLastro`, no schema). Incluí-lo no denominador daria uma barra que
 * nunca chega a N — o operador preencheria tudo e continuaria lendo "5 de 7".
 * O schema declara a lacuna de propósito; aqui ela sai da conta.
 *
 * ## Vazio é vazio, e `false` não é vazio
 *
 * `''`, `null` e `undefined` contam como não preenchido. `false` de checkbox,
 * não: o operador que desmarcou `Ativo` RESPONDEU a pergunta. Tratar os dois
 * juntos faria o cadastro inativo nunca completar a barra.
 *
 * ## Onde este arquivo deveria morar
 *
 * Em `src/components/cabinet/` — é peça de cadastro, não de Cliente, e o
 * Fornecedor já a importa daqui. Ficou nesta pasta porque a zona da issue #102
 * é `src/features/{cliente,fornecedor}/**` e sair dela exigiria um PR de outro
 * trilho. **Move quando Cadastro-3 entrar** (Profissional e Colaborador são o
 * terceiro e o quarto consumidor); até lá, o import cruzado é o preço de não
 * duplicar a conta em duas telas.
 */
export function ProgressoObrigatorios({ entidade }: { entidade: EntidadeCadastro }) {
  const { control } = useFormContext()

  // Só os que têm onde ser gravados — ver o docstring.
  const obrigatorios = camposDe(entidade).filter((campo) => campo.req && campo.campo)
  const caminhos = obrigatorios.map((campo) => campo.campo as string)

  // Uma assinatura só para todos os campos: `useWatch` por campo faria um
  // hook por linha do schema, e a quantidade varia por entidade.
  const valores = useWatch({ control, name: caminhos }) as unknown[]

  const preenchidos = valores.filter(
    (valor) => valor !== '' && valor !== null && valor !== undefined,
  )
  const total = obrigatorios.length
  const feitos = preenchidos.length
  const completo = total > 0 && feitos === total

  if (total === 0) return null

  const faltando = obrigatorios
    .filter((_, i) => {
      const valor = valores[i]
      return valor === '' || valor === null || valor === undefined
    })
    .map((campo) => campo.r)

  return (
    <div
      data-slot="progresso-obrigatorios"
      className="flex flex-col gap-1 border-2 bg-surface-sunken px-3 py-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.06em]">
          {feitos} de {total} obrigatórios
        </p>
        {/* O que falta, por NOME. "Faltam 2" manda procurar; nomear leva lá. */}
        {completo ? (
          <p className="text-[0.75rem] text-muted-foreground">Pode gravar.</p>
        ) : (
          <p className="text-[0.75rem] text-muted-foreground">Falta: {faltando.join(' · ')}</p>
        )}
      </div>

      {/* Trilho + preenchimento, `aria-hidden` porque a contagem ao lado já é
          lida — barra anunciada repetiria o mesmo número em outra unidade. */}
      <div aria-hidden="true" className="h-1.5 w-full border-2 bg-card">
        <div
          className={cn('h-full', completo ? 'bg-zone-money' : 'bg-primary')}
          style={{ width: `${Math.round((feitos / total) * 100)}%` }}
        />
      </div>
    </div>
  )
}
