# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Quatro perfis reais, todos operando o mesmo sistema — nenhum é secundário:

- **Vendedor / showroom** — atende cliente presencial, monta orçamento com o cliente ao lado. Busca de produto e velocidade dominam o fluxo.
- **Back-office (compras / estoque)** — digita pedido e ordem de compra, controla estoque. Trabalha em lote: muitos itens por documento.
- **Administrativo / cadastros** — mantém clientes, fornecedores, produtos e tabelas de apoio. Formulários longos, múltiplas abas, grades aninhadas.
- **Gestor / proprietário** — consulta e acompanha metas e resultados. Usa pouco e precisa entender rápido.

Cenário de uso: **desktop, na prática**. Mobile e tablet não são cenário real de operação.

## Product Purpose

Cabinet substitui o **SoftLux — Brasil** (sistema desktop legado, fabricante FÁCIL IT SOFTWARE, versão 1.0.2.1521), usado pela **Vertz**. Cobre o mesmo domínio de ERP: cadastros, vendas, compras, estoque, movimentação, financeiro, CRM.

Sucesso = a operação inteira migra do legado sem perder campo, termo ou documento, **e** passa a enxergar em tempo real o que o legado só registrava.

## Positioning

O legado **registra mas não mostra**. Ele guarda estoque, posição de documento e resultado de venda, mas só devolve isso em relatório fechado, tela a tela. A diferença do Cabinet é a visibilidade: o mesmo dado, disponível no momento da decisão.

Quatro superfícies de visibilidade confirmadas — **nenhuma existe na transcrição do legado**, portanto são superfícies novas e não têm campo herdado para copiar:

1. **Estoque em tempo real** — saldo, reserva e previsão de chegada por produto, visível no momento da venda. *Decidido-adiado (07/08/2026): o kardex entrou no contrato (`/api/variants/{variantId}/stock-movements`) para o backend implementar; a tela fica para fase posterior. `/estoque` é estado vazio até lá.*
2. **Posição do documento** — onde está cada orçamento / pedido / ordem no fluxo, sem abrir tela por tela. *Não construída.*
3. **Resultado e metas** — vendas por profissional, meta, ganho sobre vendas. *Não construída.*
4. **Dashboard inicial** — tela de entrada com os números do dia, no lugar do menu vazio do legado. *Construída — o Boletim (`src/features/boletim/`) é a rota `/`, ainda sobre dado mock.*

## Operating Context

- **Multi-empresa:** VERTZ ILUMINAÇÃO e VIA HF operam no mesmo sistema. A empresa ativa mora no **rodapé da sidebar** e a troca é uma gaveta, não um menu suspenso: trocar de empresa muda o escopo de todo dado da tela, e a gaveta cobra o clique a mais que esse peso pede. A empresa ativa é servidor (`PUT /auth/active-tenant`), não estado local; sessão sem empresa escolhida é estado legítimo e devolve lista vazia, não erro.
- **Módulos do legado (barra de menus, 11 itens):** Tabelas · Cadastros · Vendas · Compras · Movimentação · Financeiro · CRM · Relatórios · Controle de Acesso · Sistema · Ajuda · Sair. O front cobre hoje Cadastros, Vendas, Compras e Estoque; **Movimentação e Financeiro entram nesta fase** (decisão do user, 07/08/2026). **CRM fica fora.**
- **Sessão:** login por cookie opaco; `mustChangePassword` bloqueia o domínio com 403 e só `/trocar-senha` passa.
- **Documentos operados:** Orçamento, Pedido de venda, Pedido de compra, Ordem de compra, Nota do fornecedor.
- **Cadastros:** Clientes, Fornecedores, Profissional Externo, Colaboradores, Produtos (+ 15 outros no menu do legado, ainda não construídos).
- Formulário do domínio é denso por natureza: abas, grades editáveis dentro do form, combos com cadastro rápido (`...`), janelas auxiliares de busca por código.

## Capabilities and Constraints

**A fase mock acabou, e o front é o dono do contrato.** `contracts/openapi-v1.json` não é cópia recebida: é a especificação de **entrada** que o backend precisa implementar, e muda só por PR neste repositório. Não há repo de servidor a consultar. Caminho definido antes de existir servidor entra marcado `Proposto`.

Fronteiras que já falam HTTP: sessão e empresa ativa (`/auth/*`), listas de apoio (`/api/catalog-lookups`), produtos e variantes (`/api/products`, `…/variants`) e os três papéis de parceiro — cliente, fornecedor, profissional (`/api/partners`, filtro `role`). Ainda mock, **por falta de caminho no contrato e não por escolha**: colaborador, orçamento, pedido de compra, ordem de compra, cidades, boletim.

**Contrato menor que a transcrição fica visível, nunca preenchido com mock.** Coluna que o DTO não tem sai da listagem, campo que o servidor não guarda aparece em branco, e um aviso de cobertura conta ao operador o que falta. Preencher a lacuna com dado fake daria mentira com cara de dado do servidor — é a diferença entre uma tela incompleta e uma tela que engana.

Restrições duráveis confirmadas pelo user:

- **Vocabulário do legado é literal.** Rótulos e termos exatos da transcrição — *Profissional Externo*, *Pasta*, *Ordem*, *Vínculo*, *Ganhos Sobre Vendas*. Não modernizar nomenclatura. Não inventar campo: a fonte de campos é `topicos/transcricaosoftlux.md`.
- **Impressão e documento fiscal.** Telas de documento precisam gerar saída impressa e/ou espelhar documento fiscal — o layout tem obrigação legal, não é escolha estética. **Decidido-adiado (07/08/2026): obrigação durável do produto, fora do escopo desta fase.** Hoje `Imprimir` existe como botão na barra de ações sem gerador nem `@media print` por trás; a tela de documento não é considerada pronta enquanto isso durar, e a dívida é conhecida, não esquecida.
- **Desktop.** Não gastar esforço em responsivo estreito.

Convenções técnicas travadas: dinheiro em **centavos (int)**, nunca float; percentual com 4 casas implícitas; quantidade até 3 casas; datas ISO no dado e pt-BR na exibição; CPF/CNPJ sem máscara no dado, máscara só no input. **Desativação é lógica** — existe `active`, nada é excluído de verdade.

**Não decidido / sem dado:** volume real de usuários simultâneos; quantidade de produtos e documentos em produção; prazo de migração; quando Estoque em tempo real e impressão saem do adiado; enumeração real de situação de documento no backend.

## Brand Commitments

- Nome do produto: **Cabinet**. Cliente: **Vertz** (VERTZ ILUMINAÇÃO · VIA HF).
- Interface inteira em **PT-BR**.
- O vocabulário do legado é compromisso de identidade tanto quanto de treinamento — o usuário reconhece o sistema pelos termos.

## Evidence on Hand

- `topicos/transcricaosoftlux.md` (memória `doutorferr0/projetos-claude`, `projetosClaude/vertz-erp`) — transcrição literal de 20 capturas do SoftLux feitas em 05/08/2025, com legenda de notação de campo. **É a fonte de verdade de campo e rótulo.** Seções marcadas `[OBSERVAÇÃO]` são leitura do transcritor, não fato — confirmar antes de usar.
- `contracts/openapi-v1.json` — o contrato, propriedade deste repo. Cliente gerado por `pnpm codegen` (Orval) em `src/api/gerado/`, commitado, nunca editado à mão; o CI reprova gerado divergente.
- `docs/integracao.md` — semânticas inegociáveis do contrato (envelope `{rows,total}`, `page` 1-based, teto de `pageSize`, `sortBy` como whitelist que recusa com 400, erro em `application/problem+json`, `PUT` que substitui o registro inteiro) e o estado da troca mock→HTTP.
- Mocks tipados por recurso em `src/mocks/` (colaboradores, orçamentos, ordens e pedidos de compra, CEPs, cidades, boletim) — só para o que o contrato ainda não cobre.
- **Dez features construídas:** boletim, cliente, colaborador, fornecedor, login, orçamento, ordem-compra, pedido-compra, produto, profissional. Sobre HTTP: login/sessão, cliente, fornecedor, profissional, produto. Sobre mock: boletim, colaborador, orçamento, ordem-compra, pedido-compra.

**Não existe — não fabricar:** dado real de cliente, produto ou documento da Vertz; métrica de uso; depoimento; benchmark de performance; captura das telas de Movimentação, Financeiro, CRM ou do submenu Produtos.

**Lacuna que a decisão de escopo abriu:** Movimentação e Financeiro entraram nesta fase e **não têm captura na transcrição**. Pelo princípio 1, campo e rótulo desses dois módulos precisam vir de captura nova ou de resposta do user — não de inferência a partir dos módulos já transcritos.

## Product Principles

1. **A transcrição é contrato, não sugestão.** Campo, rótulo e ordem vêm do legado. Onde a transcrição cala, perguntar — não preencher.
2. **Visibilidade é a razão da troca.** Toda tela deve responder "e daí?" com dado, não só aceitar digitação. As quatro superfícies de visibilidade são o produto, não enfeite.
3. **Densidade é requisito, não defeito.** Quem opera este domínio precisa de muito campo à vista. Legibilidade sob densidade > respiro decorativo.
4. **Quatro perfis, um sistema.** Nenhum fluxo pode ser otimizado a ponto de quebrar outro perfil; o vendedor no showroom e o administrativo de cadastro usam as mesmas peças.
5. **Documento impresso é entregável, e o adiamento não o rebaixa.** Onde há obrigação fiscal, o layout de saída é parte da tela. Ele está fora do escopo desta fase por decisão de ordem, não de mérito: enquanto durar, a tela de documento é conhecida como incompleta, e nada no desenho dela pode fechar a porta para a saída impressa.
6. **O contrato é entrada, não recepção.** O front especifica o que o servidor precisa implementar. Onde o contrato ainda não cobre, a tela mostra a falta em vez de encobri-la com mock — dado fabricado com aparência de real é o único erro que o operador não tem como detectar.

## Accessibility & Inclusion

Piso já adotado no repo: label em todo campo, foco visível, dialog com focus-trap.

**Interface por clique (decisão do user, 30/07/2026).** Toda ação é alcançável por mouse e nenhum fluxo depende de tecla memorizada. Navegação em formulário é a nativa do browser (Tab / Shift+Tab, Enter no controle focado). Os atalhos que já existem no registry único (`src/lib/shortcuts.ts`) ficam como conveniência, não como requisito: não remover, não expandir, e **não criar atalho customizado novo** nem desenhar tela que só funcione por eles. F3–F6 seguem proibidos por conflito com o browser.

Sem requisito de conformidade formal (WCAG nível X) estabelecido pelo user — não afirmar que existe.
