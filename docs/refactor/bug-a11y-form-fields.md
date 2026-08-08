# Bug — campo de formulário sem `id`/`name`

## Sintoma

O Chrome (aba Issues / DevTools) acusa, nas telas de cadastro:

> A form field element should have an id or name attribute

Isso contraria a acessibilidade mínima que o CLAUDE.md exige ("label em todo campo, foco
visível"): sem `id`/`name`, leitor de tela e autofill do browser não conseguem associar o rótulo
ao controle de forma confiável, mesmo que visualmente o label apareça ao lado.

## Investigação necessária

Reproduzir e identificar QUAL campo dispara o aviso — abrir uma tela de cadastro (ex.:
`/cadastros/clientes/novo`), abrir o painel Issues do Chrome DevTools, e usar `list_console_messages`
ou o próprio painel para achar o elemento exato (o aviso aparece como `[issue]` no console via
`chrome-devtools` CLI, sem apontar automaticamente o seletor — inspecionar via `take_snapshot` ou
clicar no link do Issue).

Candidatos, pela estrutura do design system:

- `src/components/cabinet/form-controls.tsx` — `TextField`, `LookupField`, `CheckboxField`,
  `SelectField`, `DateField`, `TextareaField`: conferir se todos encaminham `id` do
  `useController`/`register` do RHF para o elemento nativo, ou se algum controle (ex. o botão
  `...` de lookup, ou um `Select` do Radix) renderiza um input auxiliar sem atributo.
  - a suspeita concreta é o combo de "Profissional"/"Categoria" em `cliente-form.tsx` — os
    `LookupSelectField`/`SelectField` que usam Radix podem ter um input escondido de busca sem
    `id`.
- `src/components/cabinet/entrada.tsx` — se for um wrapper genérico de input, conferir se ele
  aceita e repassa `id`.

## Correção proposta

Depende do achado. Regra geral: todo elemento de formulário nativo (`<input>`, `<select>`,
`<textarea>`) renderizado pelos componentes de `form-controls.tsx` deve receber `id` (via
`useId()` do React quando não vier de fora) e o `<label>` correspondente deve usar `htmlFor` com
o mesmo valor — ou envolver o controle. Não introduzir uma prop nova só para isso se o RHF já
fornecer `field.name`/id via `Controller`.

## Verificação

- Abrir a tela reproduzida e confirmar que o Issue não aparece mais no painel do Chrome.
- Rodar Testing Library `getByLabelText` nos testes afetados — se o campo não tiver associação
  correta hoje, algum teste pode já estar usando `getByRole`/`getByPlaceholderText` como
  contorno; trocar para `getByLabelText` reforça a correção (fazer isso é bônus, não obrigação
  desta correção pontual).
- `pnpm test` verde.

## Observação relacionada (não é bug, é nota)

Inputs `type="date"` seguem o locale do sistema operacional/browser — no Chrome em `en-US`
apareceram como `mm/dd/yyyy` durante a navegação. Isso é comportamento nativo do browser, não bug
do app (o dado trafega em ISO, a exibição pt-BR não depende do placeholder do input nativo). Só
afeta quem operar com o browser configurado fora de pt-BR — registrar e não agir, a menos que o
user peça.

## Critério de saída

Zero Issues de a11y no Chrome nas telas de cadastro navegadas. Commit:
`fix: associa label a campo de formulário`.
