# docs/harvest — colheita de fontes externas

Pasta de **material colhido, não integrado**. Nada aqui é importado por `src/`, nenhum arquivo
daqui entra no bundle, e nenhuma dependência foi adicionada ao `package.json` por causa dela.

## Por que existe

O `project-core.md` (@regras, 2026-08-13) fechou a política de fontes externas: **licença
permissiva = código copiável** (preservando aviso de copyright/NOTICE) · **copyleft = conceito
sim, código não** · **AGPL = perigo terminal**, porque contamina rodando como serviço, que é
exatamente o modelo do Cabinet.

Colher e integrar são passos separados de propósito. Integrar cedo faz o repo carregar decisão que
ninguém tomou — dependência nova, shape de API, padrão de componente. Colher primeiro deixa a
decisão visível: o que o autor original fez, o que muda para caber aqui, e quanto custa.

## Regra de leitura

Cada item tem três arquivos obrigatórios:

| arquivo | o que é |
|---|---|
| `NOTICE` | licença da fonte, copyright do autor, o que foi copiado e o que foi reescrito |
| `integracao.md` | o que precisa acontecer para isto sair de `docs/harvest/` e virar código |
| o código | staged, com nomes e idioma do Cabinet, **sem** import de `src/` para cá nem de cá para `src/` |

Em `autoform/` o segundo arquivo se chama `avaliacao.md`: o veredito é **não integrar**, e nota de
integração para algo que não se integra seria nota vazia. O que ela tem no lugar é a medição que
sustenta o veredito, mais o caminho alternativo — esse, sim, com passo concreto.

O código staged **não é compilado**: `tsconfig.app.json` tem `"include": ["src"]`, então `tsc -b`
não olha para cá. Ele é lido, não executado — a validação real acontece no PR de integração, com
teste, quando alguém decidir integrar.

## Itens

| item | fonte | licença | veredito |
|---|---|---|---|
| [`kanban-funil/`](kanban-funil/) | [marmelab/atomic-crm](https://github.com/marmelab/atomic-crm) | MIT | **colher a estrutura, trocar o motor** — o algoritmo de reordenação do original não sobrevive a um servidor com RLS |
| [`auditoria/`](auditoria/) | [supabase/supa_audit](https://github.com/supabase/supa_audit) | Apache-2.0 | **reescrito**, não copiado — `tenant_id` e RLS mudam a forma da tabela, não só o conteúdo |
| [`autoform/`](autoform/) | [vantezzen/autoform](https://github.com/vantezzen/autoform) | MIT | **rejeitado como motor de formulário de cadastro** — motivo medido em `autoform/avaliacao.md` |

## O que esta pasta NÃO fez

- Não abriu nenhuma fonte da lista copyleft do @regras (Odoo, Twenty, EspoCRM, SuiteCRM, Plane,
  Metabase, OCA l10n-brazil, ERPNext, Vendure, Dolibarr, Tryton, Axelor). Nem para "dar uma olhada":
  a regra é sobre INTENÇÃO de portar, e abrir código com essa intenção já é o ato proibido.
- Não tocou em `src/`, `package.json`, `pnpm-lock.yaml` nem `contracts/`.
- Não rodou `pnpm codegen`, porque não mexeu no contrato.
