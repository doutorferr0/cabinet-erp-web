# AutoForm × Zod gerado pelo Orval — avaliação

**Veredito: não adotar como motor dos formulários de cadastro.** O ganho prometido — "Orval já
gera Zod do contrato → forms de ~50 campos quase de graça" (@regras, 2ª rodada de fontes) — não
sobrevive ao contrato real deste repositório. Nem por pouco.

A recomendação que sobra vale mais e custa zero dependência: usar o Zod do Orval como **validador**
no `zodResolver` que as telas já usam, mantendo o layout composto à mão. Ver
`alternativa-resolver.ts`.

## Como isto foi medido

Nada aqui é leitura de README. O Zod foi **gerado de verdade** a partir de
`contracts/openapi-v1.json` com o Orval 8.23.0 que já está no repo
(`client: 'zod'`), escrevendo fora da árvore — `orval.config.ts`, `package.json` e
`src/api/gerado/` não foram tocados. O comportamento do AutoForm foi lido no código-fonte da
versão 6.0.0 do adaptador Zod, que suporta Zod 3.25+ e Zod 4 (o repo está em Zod 4.4).

Este é o corpo do `PUT /api/partners/{id}` como o Orval o gera — o formulário de cadastro mais
completo que o contrato hoje descreve:

```ts
export const UpdatePartnerBody = zod.object({
  "document": zod.string().nullable(),
  "legalName": zod.string().nullable(),
  "tradeName": zod.string().nullable(),
  "email": zod.string().nullable(),
  "isCustomer": zod.boolean().nullable(),
  "isSupplier": zod.boolean().nullable(),
  "isProfessional": zod.boolean().nullable(),
  "code": zod.string().nullable(),
  "paymentTerms": zod.string().nullable(),
  "active": zod.boolean().nullable(),
  "registration": zod.string().nullish().describe('Proposto. Registro Profissional (CREA, CAU, CFT). `PUT` substitui o registro inteiro: omitir apaga.'),
  "payoutBankInfo": zod.union([zod.null(), zod.object({
    "bankNumber": zod.string().nullable().describe('Nº do banco (código FEBRABAN). Somente leitura na tela: vem da busca de banco.'),
    // ...
  })]).optional().describe('Proposto. Conta de comissão. ...')
})
```

## Os quatro defeitos, do pior para o menos grave

### 1. A descrição do contrato vira o RÓTULO do campo

`@autoform/core`, `label.ts`:

```ts
export function getLabel(field: ParsedField) {
  return field.fieldConfig?.label || field.description || beautifyLabel(field.key)
}
```

`field.description` é o que o `.describe()` do Zod carrega. O Orval preenche `.describe()` com a
`description` do OpenAPI — e a `description` do contrato do Cabinet é **nota de fronteira escrita
para quem implementa o backend**, não texto de tela.

Resultado concreto, sem exagero nenhum: o campo `registration` sairia rotulado

> Proposto. Registro Profissional (CREA, CAU, CFT). `PUT` substitui o registro inteiro: omitir apaga.

E `payoutBankInfo` sairia com o parágrafo inteiro sobre por que os quatro campos bancários são um
objeto e não quatro campos soltos — o operador lendo a justificativa de modelagem no lugar de
"Dados Bancários".

Isto não é ajustável por configuração: `fieldConfig.label` é o único jeito de sobrescrever, e ver
o defeito 4.

### 2. `nullable` não é `optional`, e o contrato inteiro é `nullable`

`@autoform/zod`, `schema-parser.ts`:

```ts
required: !isOptional(schema)
```

e `isOptional` reconhece **só** `type === "optional"`, descendo por `innerType`. `.nullable()` não
entra.

No `UpdatePartnerBody`, 10 dos 12 campos são `.nullable()` puro — porque no OpenAPI eles estão em
`required` **e** com `nullable: true`, que é como o contrato diz "a chave sempre viaja; o valor pode
ser nulo". Para o AutoForm, os dez são obrigatórios: o `FieldWrapper` do shadcn desenha

```tsx
{parsedField.required && <span className="text-destructive"> *</span>}
```

Um cadastro de parceiro com asterisco vermelho em Documento, Razão Social, Nome Fantasia, E-mail,
Código, Condição de Pagamento e nos três papéis. Todos opcionais de verdade. O asterisco deixa de
significar coisa alguma na tela toda, que é pior do que não ter asterisco.

### 3. Os tipos que o Cabinet tem não são os tipos que o AutoForm infere

`field-type-inference.ts` conhece seis: object, string, number, boolean, date, enum, array. **Tudo
o mais cai em `"string"`.**

| o que o contrato tem | o que o AutoForm renderiza | o que a tela precisa |
|---|---|---|
| `payoutBankInfo`: `union([null, object])` | **uma caixa de texto** — união não tem ramo, cai no default | bloco com 4 campos e busca de banco |
| `productTypeId`, `brandId`: uuid de lista de apoio | caixa de texto | `LookupCombo` com botão `...` de cadastro rápido (19 usos no sistema) |
| `priceCents`: centavos inteiros | `<input type=number>` mostrando `12990` | máscara R$ na borda |
| `unitInQty`: decimal em string | caixa de texto | quantidade, 3 casas |
| `document`: CNPJ/CPF sem máscara | caixa de texto | máscara só no input |
| `productTypeName` (só exibição) | **campo editável** | não é campo |

O caso do `union` é o mais claro: um objeto com quatro campos bancários vira um `<input>`. Não é
uma imperfeição de estilo, é a tela errada.

### 4. O escape existe, e é exatamente onde ele não pode estar

Tudo acima se conserta com `fieldConfig` — rótulo, tipo de campo, componente customizado. E o
`fieldConfig` do adaptador Zod se anexa **dentro do schema**, como uma checagem carregando um
símbolo:

```ts
// packages/zod/src/v4/field-config.ts (essência)
const refinementFunction = () => {}
refinementFunction[ZOD_FIELD_CONFIG_SYMBOL] = config
```

Ou seja: `z.string().check(fieldConfig({ label: 'Razão Social', fieldType: 'lookup' }))` — escrito
**no arquivo do schema**.

O arquivo do schema aqui é `src/api/gerado/`, que o `CLAUDE.md` proíbe editar à mão, que é
reescrito a cada `pnpm codegen`, e cuja sincronia com `contracts/` o CI verifica no passo
`Codegen is up to date`. Não existe lugar para pôr o `fieldConfig`.

A saída seria embrulhar cada schema gerado num schema local que reaplica `.check(fieldConfig(...))`
campo a campo. Isso é escrever, à mão, um mapa com rótulo e tipo de **cada campo** — que é
precisamente o trabalho que o AutoForm existe para evitar. `custo-autoform.tsx` mostra esse mapa
escrito, para o tamanho dele ficar visível.

## E os 8 padrões do repo

Cinco dos oito vivem dentro do formulário, e nenhum é gerável a partir do tipo de um campo:

- **Form com abas** (padrão 4) — 1 form por tela, campos distribuídos em abas. O AutoForm renderiza
  a ordem das chaves do objeto, num fluxo só. A ordem das chaves aqui é a do contrato, que segue a
  modelagem do servidor, não a leitura do operador.
- **LookupCombo** (padrão 2, 19 usos) — combobox + `...` que abre dialog de cadastro rápido. Um id
  no schema não diz de qual lista de apoio ele vem.
- **Blocos compartilhados** (padrão 3) — Endereço, Telefones, Comunicadores, Redes Sociais. São
  agrupamentos com layout próprio.
- **Grade no formulário** (padrão 6) — TanStack Table + `useFieldArray`, células editáveis.
- **`Ativo`** (padrão 8) — no contrato é `active: boolean | null`, e na tela é o checkbox de
  desativação lógica, com confirmação. Um `<input type=checkbox>` genérico não é isso.

## Onde o AutoForm SERIA bom, e por que aqui não é

Ele resolve bem o caso em que o schema é escrito **pela mesma pessoa que desenha o formulário**, no
mesmo arquivo, para um formulário que não tem componente próprio: painel de configuração, formulário
de admin interno, protótipo. Nesse caso `fieldConfig` fica ao lado do campo e o custo desaparece.

O Cabinet está no caso oposto: o schema vem de um contrato que é escrito para o BACKEND, gerado por
máquina, proibido de editar, e o formulário tem oito padrões próprios já implementados. A distância
entre as duas pontas é justamente o que o AutoForm não atravessa.

## A recomendação

O valor real que se atribui ao AutoForm é "validação vinda do contrato de graça" — e essa metade
está disponível **sem AutoForm e sem dependência nova**:

1. Adicionar um segundo bloco de saída no `orval.config.ts` com `client: 'zod'`, gerando
   `src/api/gerado/index.zod.ts` (commitado, como o resto).
2. As telas passam o schema gerado ao `zodResolver` que **já usam** — `@hookform/resolvers` está no
   `package.json` e `zodResolver` já aparece em `cadastro-form.tsx`, `login.tsx`, `nova-tarefa.tsx`
   e `trocar-senha.tsx`.
3. As regras que o contrato não expressa (CNPJ válido, obrigatoriedade de tela) entram por
   composição local, e os `// TODO(contract):` marcam o que o codegen ainda vai substituir.

Ganho: a validação de forma para de divergir do contrato em silêncio. Custo: um bloco no
`orval.config.ts`, um arquivo gerado a mais, zero dependência. Ver `alternativa-resolver.ts`.

Convém dizer o que isso NÃO entrega: o contrato descreve forma, não regra de negócio. `document`
continua `zod.string().nullable()`, sem saber que é CNPJ. A camada local não some — encolhe.

## Reavaliar quando

- O contrato passar a marcar campo opcional como opcional de verdade (fora de `required`) em vez de
  `nullable` — mata o defeito 2, não os outros três.
- O AutoForm ganhar configuração POR FORA do schema (um mapa `key → fieldConfig` passado ao
  componente). Aí o defeito 4 cai, e vale medir de novo.
