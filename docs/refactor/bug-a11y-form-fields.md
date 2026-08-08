# Bug — `RadioField` associa o label a um grupo, não a um campo

## Sintoma (causa confirmada)

Em qualquer tela com `RadioField` (ex.: `/cadastros/colaboradores/1?modo=consulta`, campo
"Sexo"), o Chrome DevTools acusa dois Issues de acessibilidade:

> Incorrect use of `<label for=FORM_ELEMENT>`
> No label associated with a form field

Investigado por inspeção direta do DOM (não é mais hipótese): rodando

```js
[...document.querySelectorAll('label[for]')].map(l => ({
  label: l.textContent,
  tag: document.getElementById(l.htmlFor)?.tagName,
}))
```

o único resultado fora do esperado é `{ label: 'Sexo', tag: 'DIV' }` — o `<label for="…">`
gerado para "Sexo" aponta para um `<div role="radiogroup">`, não para um controle "labelable"
(`input`/`select`/`textarea`/`button`). `<label for>` só é válido apontando para elementos
labelable; um `div`, mesmo com `role="radiogroup"`, não é um deles — daí os dois Issues.

## Causa no código

`src/components/cabinet/form-controls.tsx`, `RadioField` (linha ~289):

```tsx
<FormItem className={className}>
  <FormLabel>{label}</FormLabel>          {/* renderiza <label htmlFor={formItemId}> */}
  <FormControl>                            {/* injeta id={formItemId} no filho via Slot */}
    <RadioGroup
      className="flex flex-row flex-wrap gap-4"
      value={field.value ?? ''}
      onChange={field.onChange}
      aria-label={label}                   {/* já dá nome acessível ao grupo — redundante com o label externo */}
    >
      {options.map((o) => (
        <RadioGroupItem key={o.value} value={o.value} className="font-normal">
          {o.label}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  </FormControl>
  <FormMessage />
</FormItem>
```

`FormLabel`/`FormControl` (`src/components/ui/form.tsx`) foram desenhados para o par
1 label ↔ 1 input nativo (`TextField`, `DateField`, etc., onde funcionam corretamente — conferido
nos demais campos da mesma tela, todos com `tag: INPUT`). `RadioGroup` é um GRUPO, não um campo
único, e já resolve seu próprio nome acessível via `aria-label={label}` — o `htmlFor` do
`FormLabel` por cima é redundante e, por apontar para um `div`, inválido.

Cada opção individual (`RadioGroupItem`) já é um `<label>` de verdade envolvendo o `<input
type="radio">` internamente (React Aria Components) — isso já está correto e não é o alvo da
correção; confirmado porque "Masculino"/"Feminino" não aparecem na lista de labels problemáticos.

## Correção proposta

Trocar `<FormLabel>{label}</FormLabel>` por um rótulo visual sem `htmlFor` dentro de `RadioField`
— por exemplo reaproveitando `<Label>` de `@/components/ui/label` (já usado em outros pontos do
arquivo, ex. `UfNaturalidade` em `colaborador-form.tsx`) sem passar `htmlFor`:

```tsx
import { Label } from '@/components/ui/label'
// ...
<FormItem className={className}>
  <Label>{label}</Label>
  <FormControl>
    <RadioGroup ... aria-label={label}>
      {/* ... */}
    </RadioGroup>
  </FormControl>
  <FormMessage />
</FormItem>
```

O nome acessível do grupo continua vindo do `aria-label={label}` que já existe — não se perde
nada, só para de existir o `for` inválido. `FormControl` continua injetando `id`/`aria-describedby`
no `RadioGroup` para a mensagem de erro (`FormMessage`) continuar associada via
`aria-describedby`, que é válido em um `div` (diferente de `label for`).

## Verificação

- Reabrir a tela com Chrome DevTools → painel Issues (ou `list_console_messages`) e confirmar que
  os dois Issues não aparecem mais.
- Repetir o script de inspeção acima — a lista de `label[for]` apontando para tag fora de
  `INPUT/SELECT/TEXTAREA/BUTTON` deve ficar vazia.
- `pnpm test` — `colaborador-form.test.tsx` e qualquer teste que use `RadioField` (conferir se
  algum usa `getByLabelText('Sexo')`, que deve continuar funcionando via `aria-label`).

## Status — aplicado, com uma ressalva

**Corrigido e verificado:** trocado `<FormLabel>` (que herdava `htmlFor={formItemId}` de
`useFormField`) por `<Label>` simples em `RadioField` (`src/components/cabinet/form-controls.tsx`).
Depois da mudança, `[...document.querySelectorAll('label[for]')].map(...)` não retorna mais
nenhum `label[for]` apontando para tag fora de `INPUT/SELECT/TEXTAREA/BUTTON` — o Issue
`Incorrect use of <label for=FORM_ELEMENT>` não aparece mais em nenhuma tela navegada
(`/cadastros/colaboradores/1?modo=consulta`, `/cadastros/clientes/novo`), confirmado com reload
limpo do Chrome.

**Ressalva — Issue separado que sobrou, não é o mesmo defeito:** `No label associated with a form
field` continua aparecendo, com contagem igual ao número de opções de rádio na tela (2 em Sexo, 2
em Tipo de Pessoa). Investigado a fundo:

- `take_snapshot --verbose` (árvore de acessibilidade REAL do Chrome) mostra nome acessível
  correto em todo campo: `radio "Masculino"`, `radio "Feminino"`, `radiogroup "Sexo"`,
  `checkbox "Atendimento ao cliente"` — o navegador computa a associação certa.
- Varredura de todo `input/select/textarea` da página checando `labels.length`, `aria-label`,
  `aria-labelledby` e `label[for]` não encontra nenhum campo realmente sem nome acessível.
- Nenhum `id` duplicado na página (descartada a hipótese de `label[for]` colidindo com dois
  elementos de mesmo id).

A causa mais provável é um falso positivo do lint estático do Chrome contra o padrão de rótulo do
React Aria Components: `RadioGroupItem` envolve o texto visível num `<span>` com
`clip-path: inset(50%)` (técnica padrão de "visualmente oculto, presente para leitor de tela") —
`textContent` enxerga esse texto (por isso a árvore de acessibilidade acerta), mas o auditor
estático do Chrome parece usar uma checagem mais simples (possivelmente `innerText`, que respeita
visibilidade CSS) e não encontra texto "visível" ali, mesmo o elemento sendo corretamente
anunciado por leitor de tela de verdade.

**Não mexer além disto sem confirmar em leitor de tela real** (NVDA/VoiceOver): a estrutura atual
já é gerada pelo React Aria Components, testada e usada nos outros campos do mesmo padrão; forçar
uma correção contra um heurístico de lint que a própria árvore de acessibilidade do Chrome
contradiz arriscaria trocar código correto por código que só agrada o linter. Registrar como
conhecido, não perseguir mais sem evidência de que afeta usuário real.

## Observação relacionada (não é bug, é nota)

Inputs `type="date"` seguem o locale do sistema operacional/browser — no Chrome em `en-US`
apareceram como `mm/dd/yyyy` durante a navegação. Isso é comportamento nativo do browser, não bug
do app (o dado trafega em ISO, a exibição pt-BR não depende do placeholder do input nativo). Só
afeta quem operar com o browser configurado fora de pt-BR — registrar e não agir, a menos que o
user peça.

## Critério de saída

Zero Issues de a11y no Chrome nas telas de cadastro navegadas. Commit:
`fix: associa label a campo de formulário`.
