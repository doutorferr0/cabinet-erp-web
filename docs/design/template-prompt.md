# Template de prompt visual — HISTÓRICO (fase V1–V12)

> **Duas coisas aqui estão mortas.** O repo `vitra-erp-web` não existe mais (é este,
> `cabinet-erp-web`), e a **direção "papel funcional" do bloco 1 foi superada**: valem hoje o
> `DESIGN.md` (fase 1.6 + identidade própria, superfícies cinzas, 4 vozes tipográficas) e a
> amostra `docs/design/historico/amostra-fase-1.5.html`, que vence o doc em divergência. O formato de 7
> blocos continua servindo de modelo; os VALORES do bloco 1, não.
>
> Roteiro da fase: `docs/fase-visual-tarefas.md`, também encerrado.

---

## Estrutura (7 blocos — nenhum opcional)

### 1. Estética (5–8 linhas, sempre as mesmas — só muda com decisão registrada)

> **Direção "papel funcional"** (extraída da inspo curada em `docs/design/inspo/` — decisão 2026-07-30, **ok do user dado**; valores travados em `DESIGN.md`, que é a fonte canônica de token, régua, tipografia e componente):
> O ERP como documento impresso bem diagramado, na tela. Orçamento parece invoice; listagem parece ledger; produto parece ficha técnica.
> Fundo tintado de papel na página, branco puro no documento (nunca cinza puro), réguas 1px fortes em três pesos separando blocos — hierarquia por estrutura, não por sombra.
> Matiz tem dois empregos e só dois: carimbo de situação e destruição/erro. Sem acento de módulo, sem header colorido (decisão 2026-07-30).
> Densidade de comanda: mais linhas visíveis > respiro; operação por clique (decisão 2026-07-30), 8h/dia — alvos de clique generosos, ações sempre visíveis (nada escondido atrás de hover ou atalho).
> Numerais tabulares alinhados à direita em toda coluna de valor; microtipografia de etiqueta (caixa alta pequena, mono) para metadados (nº doc, códigos); status como carimbo.
> Motion mínimo e funcional; easing padrão, nunca bounce. Zero gradiente, zero textura envelhecida, zero ilustração decorativa.
> Contraste AA sempre — o estilo é do papel, a legibilidade é de software.
> O Softlux define O QUE existe em cada tela; esta estética define COMO se apresenta.

### 2. Referências (screenshots)

- Caminhos em `docs/design/inspo/<pasta>/` + para cada um: **copiar X, ignorar Y** (conforme README da pasta).
- Print do Softlux da tela equivalente, quando existir (`docs/design/inspo/softlux/`).

### 3. Intenção (o quê + porquê)

- 2–4 linhas: qual tela/componente, qual problema do usuário resolve, onde entra no fluxo (ex.: "orçamento é a tela mais usada da empresa; vendedor monta com cliente ao telefone — velocidade de entrada > beleza").

### 4. Fonte de campos

- Seção exata da `transcricaosoftlux.md` (ex.: §8.1). Campo que não está lá e não tem `TODO(contract)` = não existe.

### 5. Guardrails ALWAYS (constantes do projeto)

- Mock only — nenhum fetch real; provider `pagedMock`.
- Dinheiro em centavos (`number` int), exibição via formatador central — NUNCA float.
- Padrões §9 já implementados são a base: `VitraDataTable`, `LookupField` (campo em `LOOKUP_KINDS` → sempre `LookupField`), blocos compartilhados, `FormGrid`, `cadastroActions`, `SearchDialog`.
- 1 form por tela; `Ativo` = desativação lógica.
- Rota nova → rodar `pnpm dev` uma vez antes de `check-types` (regenera `routeTree.gen.ts`).
- Testes no mesmo commit; FECHAMENTO completo (biome → types → test → commit → CI verde).
- Memória do trilho: só `topicos/frente-visual.md`.

### 6. Guardrails NEVER (proibições)

- Atalho de teclado customizado (decisão user 2026-07-30: interface por clique; só navegação nativa de form — Tab/Enter — e o Ctrl+K existente como extra).
- Filtro/ordenação/paginação no cliente.
- Dependência nova sem aprovação prévia.
- Componente colado de biblioteca externa (21st.dev etc.) — só referência visual.
- Estética de landing: hero, gradiente roxo, card dentro de card, ícone em tile arredondado, cinza puro, texto cinza sobre fundo colorido.
- Inventar campo/valor de domínio sem `TODO(contract)`.

### 7. Critério de aceite

- Lista verificável (ex.: "grade adiciona/edita/remove linha por clique", "totais recalculam ao editar linha", "N testes novos").
- Quando for exploração: critérios de comparação entre variantes (ver tarefa V12 em `docs/fase-visual-tarefas.md`).

---

## Exemplo mínimo de uso

```
Tarefa: <nome>
Estética: [bloco 1 — colar]
Referências: inspo/documento/attio-itens.png (copiar: totais fixos no rodapé; ignorar: paleta), softlux/orcamento.png
Intenção: [...]
Campos: transcricaosoftlux.md §8.1
ALWAYS: [bloco 5] · NEVER: [bloco 6]
Aceite: [...]
```
