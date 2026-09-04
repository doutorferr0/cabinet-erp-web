import { EspecificadorCombo, LookupCombo } from '@/components/cabinet/lookup-combo'
import { VOZ_DE_NOME } from '@/components/cabinet/nome'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Segmented, SegmentedItem } from '@/components/ui/segmented'
import { Textarea } from '@/components/ui/textarea'
import { type LookupKind, useLookupOptions } from '@/data/lookups-api'
import { cn } from '@/lib/utils'
import { useFormContext } from 'react-hook-form'

/**
 * Controles de formulário ligados ao RHF via useFormContext.
 * Telas só COMPÕEM — não reimplementam label/erro/registro.
 */

interface BaseProps {
  name: string
  label: string
  className?: string
  /** Marca `*` em `--bad` no rótulo (Reface 2.0 #470). */
  obrigatorio?: boolean | undefined
  /** Ajuda curta ao lado do rótulo, em n-500 — "sem máscara", "opcional". */
  hint?: string | undefined
}

/**
 * O rótulo do campo, com as marcas do mockup 2.0 (`*` obrigatório e a ajuda
 * curta) já ligadas ao `Label`. Existe para os campos não repetirem o spread em
 * cinco lugares — e para a marca ser a MESMA em todos: obrigatoriedade dita em
 * dois vocabulários diferentes na mesma tela é pior do que não dizê-la.
 */
function Rotulo({ label, obrigatorio, hint }: Pick<BaseProps, 'label' | 'obrigatorio' | 'hint'>) {
  return (
    <FormLabel
      {...(obrigatorio !== undefined && { obrigatorio })}
      {...(hint !== undefined && { hint })}
    >
      {label}
    </FormLabel>
  )
}

/**
 * A caixa dos `<select>` nativos do formulário: o mesmo sulco do `Input` —
 * borda 1px de controle, `--inset`, 34px de altura, foco em tinta + anel único.
 * A caixa preta de 2px que os três selects carregavam saiu com a #470.
 *
 * **Exportada de propósito.** A varredura da #470 achou 34 `<select>`/`<input>`
 * escritos à mão com `border-2 border-input` em 21 arquivos de `src/features`,
 * `src/app` e `src/components/cabinet` — todos fora da zona desta issue, e
 * todos com a caixa preta que a rodada mandou apagar. Quem os alcança são as
 * issues de tela (D16, D20, D24, D25, D27, D28); esta constante existe para que
 * elas TROQUEM a classe pela receita em vez de escrever a nova à mão e o
 * sistema ganhar uma segunda definição de campo. Registrado na #470.
 */
export const CAIXA_DE_SELECT =
  'desabilitado t-corpo flex h-[34px] w-full rounded-[var(--r-ctrl)] border border-[color:var(--n-300)] bg-[color:var(--n-0)] px-2.5 shadow-[var(--inset)] outline-none transition-colors focus-visible:border-[color:var(--n-900)] focus-visible:focus-ring disabled:shadow-none'

export function TextField({
  name,
  label,
  className,
  obrigatorio,
  hint,
  voz,
  ...inputProps
}: BaseProps &
  Omit<React.ComponentProps<typeof Input>, 'name'> & {
    /**
     * `nome` quando o que se digita é NOME PRÓPRIO DE ENTIDADE — razão social,
     * nome fantasia, nome do cliente. O campo passa a falar na voz de QUEM,
     * como a célula da listagem que mostra o mesmo dado.
     *
     * Existe como prop, e não como `className` solta, porque a voz tem de sair
     * de um lugar só: a regra é semântica ("o que a palavra é"), e uma classe
     * livre no input convidaria a usar a serifada por gosto, em campo que não é
     * nome. Não vale para nome de cônjuge, pai ou mãe — esses são ATRIBUTO de
     * um colaborador, não entidade do sistema.
     */
    voz?: 'nome'
  }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <Input
              {...inputProps}
              {...field}
              value={field.value ?? ''}
              {...(voz === 'nome' && { className: VOZ_DE_NOME })}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function TextareaField({
  name,
  label,
  className,
  obrigatorio,
  hint,
  ...textareaProps
}: BaseProps & Omit<React.ComponentProps<typeof Textarea>, 'name'>) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <Textarea {...textareaProps} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Data: ISO (yyyy-mm-dd) no dado; input type="date" na borda. */
export function DateField({ name, label, className, obrigatorio, hint }: BaseProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <Input type="date" {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Dinheiro: centavos (int) no dado; digitação em reais na borda. */
export function MoneyField({ name, label, className, obrigatorio, hint }: BaseProps) {
  const { setValue, getValues } = useFormContext()
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <Input
              inputMode="decimal"
              value={
                typeof field.value === 'number'
                  ? (field.value / 100).toFixed(2).replace('.', ',')
                  : ''
              }
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                setValue(name, digits === '' ? null : Number(digits), { shouldDirty: true })
              }}
              onBlur={() => {
                // normaliza exibição
                const v = getValues(name)
                if (typeof v !== 'number') setValue(name, null)
              }}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function CheckboxField({ name, label, className }: BaseProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {/* Na RAC o rótulo é filho do Checkbox — a associação é automática;
              um <label htmlFor> externo apontaria para o <label> da própria RAC. */}
          <FormControl>
            <Checkbox
              isSelected={!!field.value}
              onChange={(v: boolean) => field.onChange(v)}
              className="font-normal"
            >
              {label}
            </Checkbox>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** `[combo]` puro (sem botão "..."): select nativo com as opções do kind. */
export function SelectField({
  name,
  label,
  options,
  className,
  obrigatorio,
  hint,
}: BaseProps & { options: readonly string[] }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <select className={CAIXA_DE_SELECT} {...field} value={field.value ?? ''}>
              <option value="">Selecione…</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Uma escolha cujo VALOR é id e cujo rótulo é o nome que o operador lê. */
export interface EscolhaPorId {
  id: string
  nome: string
}

/**
 * `<select>` que grava ID e mostra NOME.
 *
 * Existe porque o `SelectField` guarda o próprio rótulo (`options: string[]`), e
 * isso só serve para lista cujo valor É o texto. Recurso do contrato viaja por
 * uuid: gravar o nome obrigaria a tela a traduzir nome → id na hora do
 * `Gravar`, que é exatamente a tradução que já custou um bug no cadastro de
 * produtos ("classificação grava por id, e recusa palpite", 2026-08-13).
 *
 * Dois cuidados que o `<select>` cru não tem, e que o `LookupSelectField` já
 * ensinou aqui:
 *
 * 1. **Carregando não parece "lista vazia"** — um select vazio e silencioso faz
 *    o operador concluir que não há opção cadastrada.
 * 2. **O valor do registro é sempre exibível.** Registro que aponta para item
 *    hoje inativo (ou salvo antes de a lista falhar) mostraria campo em branco
 *    por falta de `<option>` — e gravar de novo apagaria o valor sem ninguém
 *    pedir. Por isso quem chama passa o par corrente em `valorAtual`.
 */
export function SelectIdField({
  name,
  label,
  opcoes,
  valorAtual,
  carregando = false,
  vazio = 'Selecione…',
  className,
  obrigatorio,
  hint,
}: BaseProps & {
  opcoes: readonly EscolhaPorId[]
  /** Par id→nome do registro aberto, para o valor nunca sumir da lista. */
  valorAtual?: EscolhaPorId | null
  carregando?: boolean
  /** Rótulo da opção nula. Campo obrigatório passa algo como "Escolha a etapa". */
  vazio?: string
  className?: string
}) {
  const { watch } = useFormContext()
  const valor = watch(name) as string | null | undefined
  const listadas = opcoes.some((o) => o.id === valor)
  const lista = valor && !listadas && valorAtual ? [valorAtual, ...opcoes] : [...opcoes]

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <select
              className={CAIXA_DE_SELECT}
              disabled={carregando}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">{carregando ? 'Carregando…' : vazio}</option>
              {lista.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/**
 * O NOME que o registro trouxe para um campo de lookup, lido do campo irmão.
 *
 * Existe porque o rótulo de reserva é dado do REGISTRO, e quem o tem é o
 * formulário — não a tela que compõe os campos. Passá-lo por propriedade
 * obrigaria cada aba a receber o registro inteiro só para repassar três
 * strings, e as abas do Produto são componentes soltos, sem ele em escopo.
 *
 * `undefined` quando ninguém declarou o irmão: o campo é de um lookup que não
 * guarda nome ao lado, e aí o rótulo sai da própria lista.
 */
function useRotuloIrmao(campo?: string): string | null | undefined {
  const form = useFormContext()
  if (!campo) return undefined
  const valor = form.watch(campo)
  return typeof valor === 'string' ? valor : undefined
}

/**
 * `[combo]` puro cujas opções são um **kind do servidor** (`/api/catalog-lookups`).
 *
 * Mesma forma do `SelectField` — a transcrição distingue `[combo]` de
 * `[combo +...]`, e trocar o controle por um combobox de busca mudaria a tela.
 * O que muda é a origem: em vez de uma lista escrita no front, o kind.
 *
 * Três cuidados que o `<select>` cru não tem:
 *
 * 1. **Carregando e falhou não parecem "lista vazia".** Select vazio e silencioso
 *    faria o operador pensar que não há opção cadastrada.
 * 2. **O valor do registro é sempre exibível.** Um cadastro que aponte para item
 *    hoje INATIVO (ou salvo antes de a lista falhar) mostraria campo em branco,
 *    porque não haveria `<option>` correspondente — e gravar de novo apagaria o
 *    valor sem ninguém pedir. Por isso o valor corrente entra na lista.
 * 3. **Só desabilita enquanto carrega.** Na falha o campo continua utilizável com
 *    o valor que já tem; travar o formulário inteiro porque uma lista de apoio
 *    não veio seria punição desproporcional.
 */
export function LookupSelectField({
  name,
  label,
  kind,
  className,
  rotuloDe,
  obrigatorio,
  hint,
}: BaseProps & { kind: LookupKind; rotuloDe?: string }) {
  const { options, truncada, carregando, erro } = useLookupOptions(kind)
  const rotulo = useRotuloIrmao(rotuloDe)

  return (
    <FormField
      name={name}
      render={({ field }) => {
        // O valor é o ID (issue #94). O `<option>` mostra o nome.
        const atual = typeof field.value === 'string' ? field.value : ''
        // Item fora da lista carregada (desativado, ou lista cortada no teto)
        // continua exibível: ele entra como opção própria, com o rótulo que o
        // registro trouxe. Sem isto o campo abriria em branco e gravar de novo
        // apagaria um valor que ninguém pediu para apagar.
        const foraDaLista = atual && !options.some((o) => o.id === atual)
        // Sem rótulo de reserva, o item fora da lista aparece como AUSÊNCIA DE
        // NOME — nunca como o id cru. Imprimir `lk-SETOR-1` na tela seria pior
        // que não imprimir nada: o operador leria uma chave achando que é o
        // valor. O que importa é que a opção EXISTA, para o valor não se perder
        // ao gravar.
        const lista = foraDaLista
          ? [{ id: atual, nome: rotulo ?? '(item fora da lista)' }, ...options]
          : options

        return (
          <FormItem className={className}>
            <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
            <FormControl>
              <select
                className={CAIXA_DE_SELECT}
                {...field}
                value={atual}
                disabled={field.disabled || carregando}
              >
                <option value="">
                  {carregando
                    ? 'Carregando…'
                    : erro
                      ? 'Não foi possível carregar a lista.'
                      : 'Selecione…'}
                </option>
                {lista.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </FormControl>
            {/* Lista cortada no teto de 100 do contrato: o `<select>` não tem
                como mostrar o que não chegou, então ele DIZ que não chegou. */}
            {truncada && (
              <FormDescription>
                Mostrando os primeiros {options.length} — a lista é maior.
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

/**
 * `[combo +...]`: LookupCombo ligado ao form.
 *
 * `name` aponta para o campo do ID (issue #94). `rotuloDe` aponta para o campo
 * IRMÃO que guarda o nome — só usado quando o id não está na lista carregada,
 * para o campo não abrir em branco num item desativado.
 */
export function LookupField({
  name,
  label,
  kind,
  className,
  hideQuickAdd,
  rotuloDe,
  obrigatorio,
  hint,
}: BaseProps & { kind: LookupKind; hideQuickAdd?: boolean; rotuloDe?: string }) {
  const rotulo = useRotuloIrmao(rotuloDe)
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <LookupCombo
              kind={kind}
              value={field.value ?? null}
              onChange={field.onChange}
              rotulo={rotulo}
              hideQuickAdd={hideQuickAdd}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/**
 * O ESPECIFICADOR — combo cujas opções são PARCEIROS, não itens de lista (#265).
 *
 * `rotuloDe` aponta para o campo irmão que guarda `specifierName`, pelo mesmo
 * motivo do `LookupField`: o id pode não estar entre as opções carregadas —
 * profissional sem vínculo com a empresa ativa, ou lista cortada no teto —, e
 * campo em branco que se grava de novo apaga um vínculo que ninguém mandou
 * apagar.
 */
export function EspecificadorField({
  name,
  label,
  className,
  rotuloDe,
  excluir,
  obrigatorio,
  hint,
}: BaseProps & { rotuloDe?: string; excluir?: string | undefined }) {
  const rotulo = useRotuloIrmao(rotuloDe)
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <Rotulo label={label} obrigatorio={obrigatorio} hint={hint} />
          <FormControl>
            <EspecificadorCombo
              value={field.value ?? null}
              onChange={field.onChange}
              rotulo={rotulo}
              excluir={excluir}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Opção exclusiva (○/●) com rótulos lado a lado. */
export function RadioField({
  name,
  label,
  options,
  className,
  obrigatorio,
  hint,
}: BaseProps & { options: readonly { value: string; label: string }[] }) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        // `RadioGroup` não é um campo único — é um GRUPO, e já dá o próprio
        // nome acessível via `aria-label` abaixo. Um `<FormLabel htmlFor>` por
        // cima apontaria para um `<div role="radiogroup">`, que não é elemento
        // "labelable": o Chrome acusa `Incorrect use of <label for=FORM_ELEMENT>`.
        // `<Label>` aqui é só visual — mas ainda lê o mesmo `error` que
        // `FormLabel` leria, senão o grupo é o único campo que não avisa em
        // vermelho quando a validação falha.
        const { error } = useFormField()
        return (
          <FormItem className={className}>
            <Label
              className={cn(error && 'text-destructive')}
              {...(obrigatorio !== undefined && { obrigatorio })}
              {...(hint !== undefined && { hint })}
            >
              {label}
            </Label>
            <FormControl>
              <RadioGroup
                className="flex flex-row flex-wrap gap-4"
                value={field.value ?? ''}
                onChange={field.onChange}
                aria-label={label}
              >
                {/* Rótulo como filho do Radio: a RAC associa sozinha. */}
                {options.map((o) => (
                  <RadioGroupItem key={o.value} value={o.value} className="font-normal">
                    {o.label}
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

/**
 * ESCOLHA DE MODO em faixa segmentada (Reface 2.0, issue #470).
 *
 * Mesma gramática do `RadioField` — escolha exclusiva, um valor no form —, e a
 * diferença é a natureza da escolha, não a mecânica: `RadioField` é para
 * atributo do registro que se lê em coluna ("Pessoa física / jurídica"), este é
 * para o MODO em que se olha a coisa ("Entrada / Saída / Ajuste", "Lista /
 * Quadro"). Três radios para trocar de visão gastariam três linhas e uma
 * leitura vertical num controle que o operador aciona o tempo todo.
 *
 * O rótulo é visual: um `<FormLabel htmlFor>` apontaria para o
 * `<div role="radiogroup">`, que não é elemento "labelable" — o Chrome acusa
 * `Incorrect use of <label for=FORM_ELEMENT>`. Quem dá o nome acessível ao
 * grupo é o `aria-label`, e o `<Label>` ainda lê o mesmo `error` que
 * `FormLabel` leria, senão este seria o único campo mudo quando a validação
 * falha.
 */
export function SegmentedField({
  name,
  label,
  options,
  className,
  obrigatorio,
  hint,
}: BaseProps & { options: readonly { value: string; label: string }[] }) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const { error } = useFormField()
        return (
          <FormItem className={className}>
            <Label
              className={cn(error && 'text-destructive')}
              {...(obrigatorio !== undefined && { obrigatorio })}
              {...(hint !== undefined && { hint })}
            >
              {label}
            </Label>
            <FormControl>
              <Segmented value={field.value ?? ''} onChange={field.onChange} aria-label={label}>
                {options.map((o) => (
                  <SegmentedItem key={o.value} value={o.value}>
                    {o.label}
                  </SegmentedItem>
                ))}
              </Segmented>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
