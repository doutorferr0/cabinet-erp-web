# Changelog do contrato

Uma entrada por versão publicada de `contracts/openapi-v1.json`. Cada uma corresponde a um
arquivo em `contracts/baseline/`, a uma tag `contrato/vX.Y.Z` na `main` e à `base` do job
`contrato-compat` no CI.

**A regra é aditiva:** em 1.x só entra operação nova, campo opcional novo e valor de enum novo.
O que pode e o que não pode está em [`contrato.md` §3](contrato.md); como uma versão nasce, na
§7 do mesmo arquivo. Entrada publicada não se edita — nem os números, nem a soma.

---

## 1.0.0 — 2026-09 — 205 operações · baseline do Spring · sha256 `08967c3c421cdba7bc29137bc948f1e57be46d05fbf7b244fb1ffc438c9d75fd`

A primeira versão com nome. Ela não acrescenta nem tira nada do contrato: é a foto do que já
existia, no dia em que o alvo parou de se mover para quem implementa.

- **Arquivo:** `contracts/baseline/v1.0.0.json` · soma em `contracts/baseline/v1.0.0.sha256`
- **205 operações em 149 caminhos**, OpenAPI 3.1.1
- **Referência em Node:** 163 das 205 têm implementação no `cabinet-erp-api` congelado
  (`ac00bb9`); as outras 42 são trabalho do zero — a lista nominal está em
  [`contrato.md` §5](contrato.md)
- **Guarda:** o job `contrato-compat` passa a reprovar toda PR que quebre esta versão
