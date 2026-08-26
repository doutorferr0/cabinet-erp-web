import {
  CheckboxField,
  DateField,
  LookupField,
  LookupSelectField,
  MoneyField,
  RadioField,
  TextField,
  TextareaField,
} from '@/components/cabinet/form-controls'
import type { LookupKind } from '@/data/lookups-api'
import type { CampoCadastro, ModuloCadastro } from '@/features/cadastro/modulos'
import { cn } from '@/lib/utils'
import { useFormContext, useWatch } from 'react-hook-form'

/**
 * O MÓDULO VIRA CAMPO NA TELA — o laço que fecha a diretriz 4 do
 * `DIRETRIZES-UI.md` ("módulo é a unidade — de tudo") do lado do formulário.
 *
 * O schema de `src/features/cadastro/modulos/` diz o que existe, em que ordem,
 * com que rótulo e o que trava o Gravar. Aqui só se decide QUE CONTROLE cada
 * tipo vira. Nenhuma tela volta a escolher a ordem dos campos no olho, que é o
 * que produziu Fornecedor com 13 blocos e Profissional com 3.
 *
 * ## Campo sem `campo` NÃO é renderizado, e isso é a regra do repo
 *
 * `CampoCadastro.campo` é o caminho no schema Zod da entidade, e a ausência
 * dele é declarada: o mockup desenha o cadastro que a Vertz quer, o repo guarda
 * o que a transcrição e o contrato cobrem hoje. Renderizar um input que não tem
 * onde gravar daria um campo que aceita digitação e descarta no `Gravar` — o
 * pior dos dois mundos, porque parece que funcionou.
 *
 * A lacuna não some: `<Pendencias>` a mostra pelo nome, no rodapé do bloco. É a
 * mesma economia do `AvisoDeCobertura` — coluna que o DTO não tem sai da
 * listagem, e o operador é avisado de que ela existe e ainda não vem.
 *
 * ## Era duplicado, e a promoção era o plano desde a #101
 *
 * Este arquivo viveu em duas cópias — `features/profissional/` e
 * `features/colaborador/` — porque a zona daquela issue não alcançava
 * `src/components/cabinet/`, que é onde o CLAUDE.md manda peça compartilhada
 * morar. As duas foram mantidas IDÊNTICAS de propósito, para que a promoção
 * fosse um `git mv` em vez de merge manual; foi o que aconteceu, e o único
 * conteúdo a reconciliar foi o `KIND_POR_CAMPO` — a cópia do colaborador
 * conhecia seis listas de apoio a mais, e a união está abaixo.
 *
 * A TERCEIRA tela é que forçou a mão. O Cliente desenhava `Fone Comer.`,
 * `FAX` e `Fone Resid.` à mão enquanto `moduloContatos` já declarava os três
 * com `campo` e `dto`, e importar o render genérico de dentro de
 * `features/profissional/` faria uma tela de cadastro depender de outra.
 */

/** Largura no grid de 12 colunas. Vazio = a linha inteira, como o schema diz. */
function largura(campo: CampoCadastro): string {
  if (campo.w === 'curto') return 'col-span-6 sm:col-span-2'
  if (campo.w === 'medio') return 'col-span-6 sm:col-span-3'
  return 'col-span-12 sm:col-span-6'
}

/**
 * `kind` da lista de apoio, quando o campo do schema corresponde a uma que o
 * servidor publica em `/api/catalog-lookups`. Sem correspondência o campo vira
 * texto — melhor um texto livre que funciona do que um combo que abre vazio.
 *
 * `uf` NÃO está aqui: o contrato não publica essa lista, e o endereço é
 * desenhado pelo `<EnderecoBlock>`, que já resolve UF do seu jeito.
 */
const KIND_POR_CAMPO: Record<string, LookupKind> = {
  profissao: 'profissao',
  estadoCivil: 'estadoCivil',
  setor: 'setor',
  cargo: 'cargo',
  vinculo: 'vinculo',
  grauInstrucao: 'grauInstrucao',
  racaCor: 'racaCor',
  nacionalidade: 'nacionalidade',
}

export function CampoDoModulo({ campo }: { campo: CampoCadastro }) {
  const nome = campo.campo
  if (!nome) return null

  const className = largura(campo)
  const kind = KIND_POR_CAMPO[nome]

  switch (campo.t) {
    case 'data':
      return <DateField name={nome} label={campo.r} className={className} />
    case 'check':
      return <CheckboxField name={nome} label={campo.r} className={className} />
    case 'area':
      return <TextareaField name={nome} label={campo.r} className="col-span-12" />
    case 'dinheiro':
      return <MoneyField name={nome} label={campo.r} className={className} />
    case 'seg':
      return (
        <RadioField
          name={nome}
          label={campo.r}
          options={(campo.op ?? []).map((op) => ({
            // O dado guarda o valor em caixa alta sem acento (`FISICA`); o
            // operador lê o rótulo do schema. A tradução mora aqui, na borda.
            value: op
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .toUpperCase(),
            label: op,
          }))}
          className={className}
        />
      )
    case 'select':
      return kind ? (
        <LookupSelectField name={nome} label={campo.r} kind={kind} className={className} />
      ) : (
        <TextField name={nome} label={campo.r} className={className} />
      )
    case 'busca':
      return kind ? (
        <LookupField name={nome} label={campo.r} kind={kind} className={className} />
      ) : (
        <TextField name={nome} label={campo.r} className={className} />
      )
    default:
      return (
        <TextField
          name={nome}
          label={campo.r}
          {...(campo.k === 'nome' || campo.k === 'apres' ? { voz: 'nome' as const } : {})}
          className={className}
        />
      )
  }
}

/**
 * Os campos de um módulo, na grade de 12 colunas que o repo já usa.
 *
 * `omitir` existe para o campo que tem JANELA DE BUSCA por trás — naturalidade,
 * banco, cidade. O render genérico não sabe abrir dialog, e desenhá-los como
 * texto livre perderia a busca que a transcrição pede. A tela declara quais
 * pula e os desenha à mão, ao lado.
 */
export function CamposDoModulo({
  modulo,
  omitir = [],
}: { modulo: ModuloCadastro; omitir?: readonly string[] }) {
  return (
    <div className="grid grid-cols-12 items-end gap-3">
      {modulo.campos
        .filter((campo) => !omitir.includes(campo.k))
        .map((campo) => (
          <CampoDoModulo key={campo.k} campo={campo} />
        ))}
    </div>
  )
}

/**
 * O que o mockup pede e o repo ainda não guarda, dito pelo nome.
 *
 * Fica no pé do bloco a que pertence, e não numa lista no fim da tela: a
 * pergunta que ela responde é "por que este bloco tem menos campo do que eu
 * esperava", e ela só faz sentido ao lado do bloco.
 */
export function Pendencias({ modulo }: { modulo: ModuloCadastro }) {
  // `sub` sai da conta pelo mesmo motivo que sai de `semLastro` (`modulos/
  // tipos.ts`): sub-recurso é dado que EXISTE, com caminho próprio, desenhado
  // por um bloco próprio ao lado deste. Sem esta linha, declarar a grade de
  // contatos na espec faria a tela imprimir *"Ainda não guardamos: Contatos"*
  // logo abaixo da grade de contatos que ela acabou de montar — foi por isso
  // que a declaração ficou de fora da #331 (web#293).
  const faltam = modulo.campos.filter((campo) => !campo.campo && !campo.sub)
  if (faltam.length === 0) return null
  return (
    <p className="mt-2 text-muted-foreground text-xs">
      Ainda não guardamos: {faltam.map((campo) => campo.r).join(' · ')}.
    </p>
  )
}

/**
 * PROGRESSO DOS OBRIGATÓRIOS — "X de N", no topo, com o que falta por nome.
 *
 * Pedido nominal da DoD da #101 e da diretriz 3. O operador aperta `Gravar` no
 * rodapé e o campo recusado está três telas acima; sem contador, o formulário
 * de quarenta campos não diz o que trava.
 *
 * Conta pelo VALOR, não pela validação do RHF: antes do primeiro `submit` o
 * `formState.errors` está vazio e o contador diria "6 de 6" num formulário em
 * branco. `useWatch` sem `name` assina o form inteiro — é o que faz o número
 * andar a cada tecla, que é o ponto de um progresso.
 */
export function ProgressoDeObrigatorios({ campos }: { campos: readonly CampoCadastro[] }) {
  const { control } = useFormContext()
  const valores = useWatch({ control }) as Record<string, unknown>

  const obrigatorios = campos.filter((campo) => campo.req && campo.campo)
  const faltando = obrigatorios.filter((campo) => {
    const valor = (campo.campo as string)
      .split('.')
      .reduce<unknown>((atual, parte) => (atual as Record<string, unknown>)?.[parte], valores)
    return valor === null || valor === undefined || String(valor).trim() === ''
  })
  const preenchidos = obrigatorios.length - faltando.length
  const completo = faltando.length === 0

  return (
    <div
      data-slot="progresso-obrigatorios"
      data-testid="progresso"
      className={cn(
        'flex flex-wrap items-baseline gap-x-2 gap-y-1 border-2 border-border px-3 py-2 text-sm',
        // Pendência é o dono do amarelo; completo sai do estado e volta ao
        // neutro, em vez de virar verde — verde tem dono, e é dinheiro.
        completo ? 'bg-card' : 'bg-zone-warn',
      )}
    >
      <strong className="tabular-nums">
        {preenchidos} de {obrigatorios.length} obrigatórios
      </strong>
      {completo ? (
        <span className="text-muted-foreground">Pode gravar.</span>
      ) : (
        <span className="text-muted-foreground">
          Falta: {faltando.map((campo) => campo.r).join(' · ')}
        </span>
      )}
    </div>
  )
}
