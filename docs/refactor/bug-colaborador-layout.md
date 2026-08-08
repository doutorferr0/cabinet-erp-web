# Bug — layout de `/cadastros/colaboradores/:id` a 1440px

## Sintomas observados (screenshot em consulta, `colaboradores/1?modo=consulta`)

1. **Vão vertical de ~150px entre a linha do Nome e as abas.**
2. **Checkbox "Atendimento ao cliente" com o rótulo quebrando de forma estranha**, lendo-se como
   texto solto entre os campos vizinhos.
3. **Botão `...` de um campo lookup próximo à borda direita do card**, parecendo cortado.
4. **Campo Salário exibindo caracteres estranhos antes do valor** (`··2500,00`) — a verificar se é
   real ou artefato de compressão do screenshot.
5. 2px de estouro horizontal do documento (desprezível, possivelmente rolagem/arredondamento —
   confirmar se some ao corrigir os itens acima).

## Causa confirmada por leitura de código — item 1

`src/features/colaborador/colaborador-form.tsx`, dentro de `ColaboradorForm`:

```tsx
<div className="flex items-start gap-4">
  <div className="grid flex-1 grid-cols-12 items-end gap-3">
    <TextField name="nome" label="Nome" className="col-span-12 sm:col-span-6" />
    <LookupField name="setor" label="Setor" kind="setor" className="col-span-8 sm:col-span-3" />
    <CheckboxField name="atendimentoCliente" label="Atendimento ao cliente" className="col-span-6 sm:col-span-2" />
    <CheckboxField name="ativo" label="Ativo" className="col-span-6 sm:col-span-1" />
  </div>
  <FotoFrame />
</div>
<Tabs defaultValue="geral">…
```

`FotoFrame` é uma coluna de 144px (foto) + 2 botões + gaps — bem mais alta que a única linha de
campos ao lado. Como o pai é `flex items-start`, a altura do container é ditada pelo filho mais
alto (`FotoFrame`), e o `<Tabs>` só começa depois que esse container termina. O espaço vazio à
esquerda, abaixo da linha de campos e antes das abas, é exatamente essa diferença de altura —
confirmado, não é suposição.

**Correção proposta:** mover `<FotoFrame />` para dentro do fluxo das abas (ex.: como parte da
aba "Geral", ao lado do primeiro grupo de campos daquela aba) ou reduzir a leitura vertical do
bloco atual absorvendo o espaço — por exemplo, coincidir a altura do bloco de campos com a de
`FotoFrame` adicionando mais campos à mesma linha em vez de deixá-la vazia, ou trazer a primeira
seção da aba "Geral" para cima, ao lado da foto. Decisão de layout que vale confirmar com a skill
`impeccable` antes de implementar — é comportamento visual, não só correção mecânica.

## Causa provável — item 2

`atendimentoCliente` tem `className="col-span-6 sm:col-span-2"`. Em 1440px, o conteúdo do card
tem ~1100px úteis; 2/12 disso é ~183px para "Atendimento ao cliente" (23 caracteres) dentro de um
`Checkbox` da React Aria (rótulo é filho do próprio controle, ver comentário em
`form-controls.tsx:133`). O texto provavelmente quebra em 2 linhas dentro dessa largura, e sem
borda visível ao redor do controle isso lê como texto solto. **A verificar por inspeção direta**
(tirar o campo do form, aumentar temporariamente `col-span` e comparar). Se confirmado, a correção
é aumentar o `col-span` de `atendimentoCliente` (e ajustar os vizinhos) para caber o rótulo numa
linha, ou abreviar o rótulo — mas abreviar rótulo do legado é mudança de vocabulário, que o
CLAUDE.md trata como decisão do user, não do agente.

## Causa provável — item 3

Candidato: o campo `Profissão` (`LookupField`, `col-span-12 sm:col-span-4`, dentro da aba
"Geral") ou `Nacionalidade` (`col-span-8 sm:col-span-5`, ao lado de "Ano de Chegada"
`col-span-6 sm:col-span-2` — 5+2 > o que sobra da linha de 12 já ocupada por Naturalidade(4)+UF(1),
totalizando 4+1+5+2=12 exato, sem folga). `LookupCombo` (usado por `LookupField`) renderiza um
botão `...` de cadastro rápido ao lado do valor — se o combo não reservar espaço fixo para esse
botão dentro da coluna, ele pode ficar espremido contra a borda do card quando a coluna é
estreita. **A verificar**: inspecionar `src/components/cabinet/lookup-combo.tsx` para confirmar
como o botão é posicionado (`flex` com `shrink-0` esperado) e reproduzir a exata coluna afetada
com o DevTools aberto (o "..." pode pertencer a Nacionalidade, não a Profissão — confirmar antes
de mexer).

## A verificar — item 4

`MoneyField` (`src/components/cabinet/form-controls.tsx:91`) formata
`(field.value / 100).toFixed(2).replace('.', ',')` — para `250000` centavos dá `"2500,00"`, sem
prefixo. Os `··` observados no screenshot podem ser artefato de compressão JPEG em baixa
qualidade perto de uma borda de campo, não um bug real. **Não agir sem reproduzir** — abrir a
tela, dar zoom na região do campo Salário e conferir o DOM (`el.value` ou `el.textContent`) antes
de propor qualquer mudança.

## Verificação

- Reproduzir cada item isoladamente no browser (Chrome DevTools ou equivalente) antes de corrigir
  qualquer um — os itens 2–4 são hipóteses de leitura de screenshot, não medições diretas como o
  item 1.
- Depois de corrigir, `document.documentElement.scrollWidth - clientWidth` deve voltar a 0px
  nesta rota a 1440px.
- `pnpm test` verde; se `colaborador-form.test.tsx` existir e testar esse layout, conferir que
  continua passando.

## Critério de saída

Vão vertical eliminado (medição de altura do container antes/depois). Itens 2–4 confirmados ou
descartados por reprodução direta, com a correção aplicada apenas ao que for confirmado real.
Commit: `fix: ajusta layout do formulário de colaborador`.
