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

1. **Estoque em tempo real** — saldo, reserva e previsão de chegada por produto, visível no momento da venda.
2. **Posição do documento** — onde está cada orçamento / pedido / ordem no fluxo, sem abrir tela por tela.
3. **Resultado e metas** — vendas por profissional, meta, ganho sobre vendas.
4. **Dashboard inicial** — tela de entrada com os números do dia, no lugar do menu vazio atual.

## Operating Context

- **Multi-empresa:** VERTZ ILUMINAÇÃO e VIA HF operam no mesmo sistema; há seletor de empresa ativa no header.
- **Módulos do legado (barra de menus, 11 itens):** Tabelas · Cadastros · Vendas · Compras · Movimentação · Financeiro · CRM · Relatórios · Controle de Acesso · Sistema · Ajuda · Sair. O front cobre hoje Cadastros, Vendas, Compras e Estoque.
- **Documentos operados:** Orçamento, Pedido de venda, Pedido de compra, Ordem de compra, Nota do fornecedor.
- **Cadastros:** Clientes, Fornecedores, Profissional Externo, Colaboradores, Produtos (+ 15 outros no menu do legado, ainda não construídos).
- Formulário do domínio é denso por natureza: abas, grades editáveis dentro do form, combos com cadastro rápido (`...`), janelas auxiliares de busca por código.

## Capabilities and Constraints

**Fase atual — mock only.** O backend (`doutorferr0/vitra-erp-py`) ainda não publicou contrato OpenAPI. Toda tela consome dados mock tipados atrás de uma fronteira de provider (`src/data/`). Inventar chamada HTTP ou shape de API é proibido; os tipos reais virão de codegen.

Restrições duráveis confirmadas pelo user:

- **Vocabulário do legado é literal.** Rótulos e termos exatos da transcrição — *Profissional Externo*, *Pasta*, *Ordem*, *Vínculo*, *Ganhos Sobre Vendas*. Não modernizar nomenclatura. Não inventar campo: a fonte de campos é `softlux-telas-transcricao.md`.
- **Impressão e documento fiscal.** Telas de documento precisam gerar saída impressa e/ou espelhar documento fiscal — o layout tem obrigação legal, não é escolha estética.
- **Desktop.** Não gastar esforço em responsivo estreito.

Convenções técnicas travadas: dinheiro em **centavos (int)**, nunca float; quantidade até 3 casas; datas ISO no dado e pt-BR na exibição; CPF/CNPJ sem máscara no dado, máscara só no input.

**Não decidido / sem dado:** volume real de usuários simultâneos; quantidade de produtos e documentos em produção; prazo de migração; se Movimentação, Financeiro e CRM entram nesta fase; contrato de API.

## Brand Commitments

- Nome do produto: **Cabinet**. Cliente: **Vertz** (VERTZ ILUMINAÇÃO · VIA HF).
- Interface inteira em **PT-BR**.
- O vocabulário do legado é compromisso de identidade tanto quanto de treinamento — o usuário reconhece o sistema pelos termos.

## Evidence on Hand

- `softlux-telas-transcricao.md` (762 linhas) — transcrição literal de 20 capturas do SoftLux feitas em 05/08/2025, com legenda de notação de campo. **É a fonte de verdade de campo e rótulo.** Seções marcadas `[OBSERVAÇÃO]` são leitura do transcritor, não fato — confirmar antes de usar.
- Mocks tipados por recurso em `src/mocks/` (clientes, fornecedores, produtos, colaboradores, profissionais, orçamentos, ordens e pedidos de compra, CEPs, cidades, lookups).
- Oito features já construídas com dado mock: cliente, colaborador, fornecedor, orçamento, ordem-compra, pedido-compra, produto, profissional.

**Não existe — não fabricar:** dado real de cliente, produto ou documento da Vertz; métrica de uso; depoimento; benchmark de performance; contrato de API; captura das telas de Movimentação, Financeiro, CRM ou do submenu Produtos.

## Product Principles

1. **A transcrição é contrato, não sugestão.** Campo, rótulo e ordem vêm do legado. Onde a transcrição cala, perguntar — não preencher.
2. **Visibilidade é a razão da troca.** Toda tela deve responder "e daí?" com dado, não só aceitar digitação. As quatro superfícies de visibilidade são o produto, não enfeite.
3. **Densidade é requisito, não defeito.** Quem opera este domínio precisa de muito campo à vista. Legibilidade sob densidade > respiro decorativo.
4. **Quatro perfis, um sistema.** Nenhum fluxo pode ser otimizado a ponto de quebrar outro perfil; o vendedor no showroom e o administrativo de cadastro usam as mesmas peças.
5. **Documento impresso é entregável.** Onde há obrigação fiscal, o layout de saída é parte da tela — não um "depois".

## Accessibility & Inclusion

Piso já adotado no repo: label em todo campo, foco visível, dialog com focus-trap. Atalhos declarados em registry único (`src/lib/shortcuts.ts`); F3–F6 proibidos por conflito com o browser.

Sem requisito de conformidade formal (WCAG nível X) estabelecido pelo user — não afirmar que existe.
