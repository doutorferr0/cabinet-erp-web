# problem+json — o catálogo completo de erro do Cabinet

Para quem for implementar o backend em Spring. **O contrato é o dono**: as URNs, os status e os
títulos desta página saem de `contracts/openapi-v1.json` (`components.schemas.ProblemType`), e a
tabela abaixo é GERADA — não a edite à mão. Quem a mantém é
`src/mocks/api/erros-canonicos.test.ts`, e ele reprova se ela envelhecer.

## O formato

RFC 9457 Problem Details, e nada além dele. Toda resposta 4xx/5xx do contrato tem:

```
HTTP/1.1 409 Conflict
content-type: application/problem+json

{
  "type": "urn:cabinet:erro:documento-ja-cadastrado",
  "title": "Documento já cadastrado",
  "status": 409,
  "detail": "Documento já cadastrado no grupo.",
  "existingPartnerId": "0f5a2c31-9b7e-4d18-8a44-6f1c0e7b2d93"
}
```

Quatro regras que o front já depende, e que a implementação não pode mudar sozinha:

1. **`content-type` é `application/problem+json`.** Resposta de erro que sai como
   `application/json` ainda é lida, mas resposta que sai como `text/html` faz o cliente sintetizar
   `urn:cabinet:erro:resposta-nao-json` — é o sintoma clássico de a requisição ter caído no
   fallback da SPA em vez de chegar ao servidor.
2. **`type` é o discriminador de MÁQUINA, e o vocabulário é FECHADO.** A tela ramifica por ele:
   `status` sozinho não distingue sete 409 que pedem coisas opostas ao operador (`entrega-vazia`
   manda cancelar, `entrega-fechada` manda abrir outro romaneio). URN fora da lista abaixo chega
   ao front como erro sem tratamento — o cliente valida contra o enum e descarta o que não
   reconhece.
3. **`title` é o rótulo do TIPO, não da ocorrência.** Cada `type` tem UM título canônico, o da
   coluna `title`, em PT-BR: não há camada de tradução e a tela imprime o que veio. Título
   derivado do status devolveria a informação que o status já deu.
4. **`detail` é a frase da OCORRÊNCIA** e pode variar — é o único membro em que o servidor
   escreve algo específico ("Já existe produto com o código LUM-001"). A tela o mostra ao
   operador quando não tem frase própria para aquela URN.

## Membros de extensão

A RFC permite membros extras, e o contrato declara **três**. Membro que o schema não declara é
**apagado na serialização** — não basta o servidor o mandar:

| membro | vem em | para quê |
| --- | --- | --- |
| `fields` | `urn:cabinet:erro:campos-invalidos` | `[{ path, message }]` — leva o erro ao CONTROLE, não ao topo do formulário |
| `existingPartnerId` | `urn:cabinet:erro:documento-ja-cadastrado` | o parceiro que já usa o CNPJ/CPF, para a tela oferecer vincular |
| `openGrantId` | `urn:cabinet:erro:suporte-ja-em-organizacao` | a concessão de suporte aberta, para a tela oferecer encerrá-la |

`instance` é opcional no contrato: o backend real o preenche com a URL da requisição, e o mock
não o manda. Nenhuma tela o lê hoje.

## O que a coluna `emite hoje` diz

- **mock** — algum handler de `src/mocks/api/` emite esta URN. Há exemplo funcionando para copiar.
- **só contrato** — o vocabulário a declara e ninguém a emite ainda. São as famílias que o front
  escreveu antes de existir servidor (tesouraria G7, comissão G13) mais os dois casos de
  credencial que o mock não reproduz (`senha-precisa-trocar` e `email-nao-enviado`). Para o
  Spring, é a coluna que importa: **a semântica está na coluna `quando` e não há implementação de
  referência.** O `detail` dessas linhas é exemplo escrito aqui, não frase medida de um servidor.
- **cliente** — nenhum servidor emite. `urn:cabinet:erro:resposta-nao-json` é sintetizada pelo
  front (`src/api/http.ts`) quando a resposta não é do contrato. **Não a implemente.**

## O catálogo

A varredura de `urn:cabinet:erro:*` em `src/` fecha com o contrato: **toda URN referenciada no
fonte está na tabela abaixo**. As duas exceções são de teste e nenhuma é vocabulário —
`urn:cabinet:erro:inventada` (`src/lib/erros.test.ts`, o caso negativo que prova que o cliente
descarta URN fora do enum) e `` `urn:cabinet:erro:token-${recusa}` ``
(`src/features/login/definir-senha.test.tsx`, um template que produz `token-invalido` e
`token-expirado`).

<!-- catalogo:inicio -->
| URN | status | `title` | quando | `detail` de exemplo | extensões | emite hoje |
| --- | --- | --- | --- | --- | --- | --- |
| `about:blank` | o do próprio caso | a frase do status: `Requisição inválida` (400) · `Não autenticado` (401) · `Sem permissão` (403) · `Não encontrado` (404) · `Conflito` (409) · `Erro interno` (500) | o tipo É o status, e não há nada a distinguir — recusa de negócio sem saída própria na tela | a frase de quem recusou | — | mock |
| `urn:cabinet:erro:sem-sessao` | 401 | `Sem sessão` | sessão ausente, expirada ou encerrada — o único 401 das operações de domínio. **O 401 do `POST /auth/login` NÃO é este:** lá a recusa é de credencial, o tipo é `about:blank`, e mandar `sem-sessao` na resposta do próprio login diz ao cliente para reautenticar quem acabou de tentar | Não autenticado. | — | mock |
| `urn:cabinet:erro:senha-precisa-trocar` | 403 | `Senha precisa ser trocada` | credencial vale, falta o passo. 403 e não 401: derrubar a sessão recém-criada põe o cliente em laço de relogin | Troque a senha antes de continuar. | — | **só contrato** |
| `urn:cabinet:erro:sem-vinculo-com-empresa` | 403 | `Sem vínculo com a empresa` | a empresa ativa pedida não está entre os vínculos. 403 e não 404 — `tenantId` não é segredo, ele viaja em `GET /auth/tenants` | Usuário não tem vínculo com a empresa informada. | — | mock |
| `urn:cabinet:erro:papel-insuficiente` | 403 | `Papel insuficiente` | o papel não alcança a escrita. É o único dos três 403 em que a pessoa não resolve sozinha, e é por isso que tem URN própria: a tela esconde o controle em vez de mandar tentar de novo | O papel deste vínculo não permite alterar partners. | — | mock |
| `urn:cabinet:erro:campos-invalidos` | 400 | `Campos inválidos` | validação por campo — vem com `fields[]`, e é ele que leva o erro ao controle certo | Confira os campos destacados. | `fields` | mock |
| `urn:cabinet:erro:ordenacao-invalida` | 400 | `Ordenação inválida` | `sortBy` fora da whitelist da listagem | sortBy inválido: nome. | — | mock |
| `urn:cabinet:erro:paginacao-invalida` | 400 | `Paginação inválida` | `page`/`pageSize` fora do que a listagem aceita (teto de 100) | Paginação inválida: page é 1-based e pageSize vai até 100. | — | mock |
| `urn:cabinet:erro:filtro-invalido` | 400 | `Filtro inválido` | `filters`/`joinOperator` malformado, campo fora da whitelist ou operador que o tipo do campo não aceita | Este recurso não publica o parâmetro filters. | — | mock |
| `urn:cabinet:erro:papel-invalido` | 400 | `Papel inválido` | o `roleId` pedido no vínculo não é papel desta organização, ou é papel inativo. **Não cobre a ausência**: vínculo sem `roleId` é `campos-invalidos`, porque falta um campo — aqui o campo veio e o papel é que não serve | Papel inexistente ou inativo. | — | mock |
| `urn:cabinet:erro:hierarquia-em-laco` | 400 | `Hierarquia em laço` | o pai escolhido é descendente do próprio registro | O depósito não pode descer de si mesmo. | — | mock |
| `urn:cabinet:erro:senha-atual-invalida` | 400 | `Senha atual não confere` | troca de senha com a atual errada | A senha atual não confere. | — | mock |
| `urn:cabinet:erro:senha-fraca` | 400 | `Senha fraca` | a senha nova não passa na política do servidor | A senha precisa de pelo menos 8 caracteres. | — | mock |
| `urn:cabinet:erro:token-invalido` | 400 | `Link inválido` | o token do link de convite ou de recuperação não existe, já foi usado, ou foi substituído por um pedido mais novo. **Sem saída na tela** — ela manda pedir outro link, e não oferece repetir o mesmo | Este link não vale mais. | — | mock |
| `urn:cabinet:erro:token-expirado` | 400 | `Link expirado` | o link existiu e venceu. Separado do anterior porque a tela TEM o que oferecer: pedir outro, num botão, em vez de mandar a pessoa recomeçar sem saber por quê | Este link expirou. Peça outro. | — | mock |
| `urn:cabinet:erro:email-nao-enviado` | 502 | `E-mail não enviado` | o servidor de e-mail recusou ou não respondeu. **Não é 500:** nada aqui deu errado, e o que falhou é um terceiro — a tela oferece tentar de novo, e o convite não ficou pendente pela metade | O servidor de e-mail não respondeu. Tente de novo. | — | **só contrato** |
| `urn:cabinet:erro:liberacao-acima-do-vendido` | 409 | `Liberação acima do vendido` | liberar mais peça do que a linha vendeu. Sem ação na tela: o operador digitou o número errado, e o campo é que se corrige | Falta liberar 3 de 10. Liberar 5 passaria do vendido. | — | mock |
| `urn:cabinet:erro:separacao-sem-liberacao` | 409 | `Separação sem liberação` | separar acima do que foi liberado. A tela oferece `liberar` — e o gate é o CHECK monótono do banco, que não depende de papel: quem pula a liberação não separa | Liberado para separação: 2. Libere antes de separar 5. | — | mock |
| `urn:cabinet:erro:entrega-sem-separacao` | 409 | `Entrega sem separação` | entregar acima do que saiu da prateleira. A tela oferece `separar` | Separado e ainda não entregue: 1. Não se entrega o que ninguém tirou da prateleira. | — | mock |
| `urn:cabinet:erro:entrega-fechada` | 409 | `Entrega fechada` | o romaneio não está `open` — fechado ou cancelado. **Uma URN para os dois estados**, porque a tela faz a mesma coisa: abrir outro romaneio. Qual dos dois é informação de leitura, e viaja em `status` do próprio recurso | Romaneio fechado ou cancelado não recebe item. Abra outro. | — | mock |
| `urn:cabinet:erro:entrega-vazia` | 409 | `Entrega vazia` | fechar romaneio sem um item lançado. A saída é a OPOSTA da tentada — quem não saiu se cancela, não se fecha —, e sem o discriminador o "conflito" no botão Fechar sugere tentar de novo | Romaneio sem item não fecha. Cancele-o, se nada saiu. | — | mock |
| `urn:cabinet:erro:entrega-de-outro-pedido` | 409 | `Entrega de outro pedido` | lançar item de um pedido no romaneio de outro. Acontece de verdade: a expedição tem vários romaneios abertos ao mesmo tempo. A tela troca o romaneio; um 409 sem nome a faria duvidar da quantidade | A linha não é deste pedido — o romaneio pertence a outro documento. | — | mock |
| `urn:cabinet:erro:nao-encontrado` | 404 | `Não encontrado` | id que não existe, ou que existe fora do recorte da sessão | Parceiro não encontrado. | — | mock |
| `urn:cabinet:erro:sem-empresa-ativa` | 409 | `Sem empresa ativa` | o recurso EXIGE empresa e a sessão não tem uma. 409 e não 400: falta uma AÇÃO da pessoa (escolher empresa), o pedido não está malformado. **Listagem não usa isto** — ela devolve `{rows:[],total:0}` | Nenhuma empresa ativa na sessão. | — | mock |
| `urn:cabinet:erro:documento-ja-cadastrado` | 409 | `Documento já cadastrado` | CNPJ/CPF repetido no grupo. Vem com `existingPartnerId`, que é o que habilita vincular em vez de duplicar | Documento já cadastrado no grupo. | `existingPartnerId` | mock |
| `urn:cabinet:erro:email-ja-cadastrado` | 409 | `E-mail já cadastrado` | e-mail de colaborador repetido. Separado do documento porque é CREDENCIAL: não existe "vincular ao existente", duas pessoas não compartilham login | Já existe um colaborador com este e-mail. | — | mock |
| `urn:cabinet:erro:codigo-ja-cadastrado` | 409 | `Código já cadastrado` | código único do recurso já em uso (produto no grupo, variante no produto) | Já existe produto com o código LUM-001. | — | mock |
| `urn:cabinet:erro:vinculo-ja-existe` | 409 | `Vínculo já existe` | `POST` de vínculo que já existe — o caminho de mudar é o `PUT` | Vínculo já existe — use o Alterar. | — | mock |
| `urn:cabinet:erro:papel-de-sistema` | 409 | `Papel de sistema` | tentativa de alterar ou desativar `owner`/`admin`, que toda organização tem e ninguém edita. 409 e não 403: quem pede TEM a permissão de gerenciar papéis — o que recusa é o RECURSO, não o pedinte, e um 403 aqui mandaria o admin procurar uma permissão que não existe. URN própria porque a tela tem o que fazer com ela: esconder `Alterar` na linha do papel de sistema | Papel de sistema não é editável. | — | mock |
| `urn:cabinet:erro:sem-concessao-de-suporte` | 403 | `Sem concessão de suporte` | suporte-da-plataforma tocando dado de cliente sem concessão ABERTA para aquela organização — ou com a concessão já vencida. 403 e não 404: a organização existe, o que falta é o acesso. É a recusa que existe no lugar do `super-admin`, e ela é o caso PADRÃO — o suporte começa sem alcançar nada. | Esta operação é da superfície de suporte da plataforma. | — | mock |
| `urn:cabinet:erro:suporte-ja-em-organizacao` | 409 | `Suporte já está em outra organização` | tentativa de abrir a segunda concessão com uma aberta. Carrega `openGrantId`, para a tela oferecer encerrar aquela em vez de deixar o operador procurar qual é. É a regra de UMA POR VEZ dita em tempo de execução. | Já há acesso aberto em Vertz Iluminação. Encerre antes de abrir outro. | `openGrantId` | mock |
| `urn:cabinet:erro:concessao-encerrada` | 409 | `Concessão já encerrada` | `/revoke` numa concessão que já foi encerrada ou já venceu. 409 e não 204: encerrar de novo não é o mesmo fato, e a trilha não ganha uma segunda linha por um clique repetido. | Este acesso já foi encerrado. | — | mock |
| `urn:cabinet:erro:pedido-ja-convertido` | 409 | `Pedido já gerado` | o orçamento já virou pedido. URN própria porque a tela tem uma ação para ela — abrir o pedido que existe. Sem discriminador, o operador tenta de novo e a compra sai dobrada | Este orçamento já virou pedido. | — | mock |
| `urn:cabinet:erro:transicao-invalida` | 409 | `Transição inválida` | o documento não pode ir para o estado pedido: concluir cancelado, cancelar concluído, repetir qualquer uma das duas, devolver demonstração que já voltou ou devolver pedido que não é demonstração. **Uma URN para toda a máquina de estados, e não uma por transição:** a saída da tela é a mesma nos cinco casos — reler o documento, porque o estado que ela mostra é passado —, e `detail` diz qual foi. URN por transição multiplicaria o vocabulário sem dar à tela uma decisão nova | Documento já está cancelado. | — | mock |
| `urn:cabinet:erro:demonstracao-em-aberto` | 409 | `Demonstração em aberto` | concluir pedido de demonstração cuja peça ainda não voltou (`demoReturnedAt` nulo). **Não cabe na URN de cima** porque a saída é OUTRA e é acionável: registrar o retorno (`POST .../demo-return`) e concluir de novo. Sem o discriminador, a tela ofereceria "recarregue" para um caso que se resolve com dois cliques | A peça da demonstração ainda não voltou. | — | mock |
| `urn:cabinet:erro:orcamento-ja-revisado` | 409 | `Orçamento já revisado` | pedir revisão de um orçamento que já tem uma. A saída é abrir a revisão existente e revisar A PARTIR dela — mesmo papel de `pedido-ja-convertido`, que é o precedente: sem a URN, o operador repete o gesto e a cadeia de versões vira árvore | Este orçamento já tem revisão. Revise a mais recente. | — | mock |
| `urn:cabinet:erro:valor-nao-parcelavel` | 400 | `Valor não parcelável` | o total do documento não alcança `minTotalToInstallCents` e a condição escolhida tem mais de uma parcela. URN própria porque a tela tem UMA saída clara: oferecer só as condições de parcela única — sem o discriminador ela mostraria a mesma lista e o operador tentaria a segunda condição, que falha igual | O total do documento não alcança o mínimo para parcelar. | — | mock |
| `urn:cabinet:erro:parcelas-acima-do-teto` | 400 | `Parcelas acima do teto` | mais parcelas que `maxInstallments` da empresa. Vale nos DOIS lados: cadastrar a condição e escolhê-la no documento. A saída da tela é diferente da de cima — aqui o recorte é por número de parcelas, não por valor | A condição tem 12 parcelas e o limite da empresa é 6. | — | mock |
| `urn:cabinet:erro:parcela-abaixo-do-minimo` | 400 | `Parcela abaixo do mínimo` | alguma parcela do plano ficaria abaixo de `minInstallmentCents`. É o limite que corta na prática, e o único dos três que depende do TOTAL e do número de parcelas ao mesmo tempo: a mesma condição passa num documento e falha no outro, então a tela não consegue prevê-lo filtrando o combo — ela precisa da recusa nomeada para explicar por que aquela condição não serve PARA ESTE documento | Alguma parcela ficaria abaixo do valor mínimo da empresa. | — | mock |
| `urn:cabinet:erro:faturamento-minimo-nao-atingido` | 409 | `Faturamento mínimo não atingido` | a ordem de compra não alcança o mínimo que o fornecedor exige — geral ou o do grupo de produto. `detail` diz quanto falta e para qual grupo, porque o mínimo é cadastro do fornecedor e a tela não tem como calculá-lo | O grupo Luminárias não atinge o faturamento mínimo do fornecedor. | — | mock |
| `urn:cabinet:erro:item-ja-em-ordem` | 409 | `Item já está em uma ordem` | a linha de pedido de compra apontada já foi levada por outra ordem, ou o pedido que se tenta reescrever tem linha nesse estado — é a corrida entre dois compradores montando ordem ao mesmo tempo | Pedido com linha já levada por uma ordem não se reescreve. | — | mock |
| `urn:cabinet:erro:ordem-ja-enviada` | 409 | `Ordem já enviada` | a ordem de compra já saiu para o fornecedor e não se reescreve nem se reenvia; o que muda a partir dali é data, por reagendamento | Ordem já enviada. | — | mock |
| `urn:cabinet:erro:fornecedor-divergente` | 409 | `Fornecedor divergente` | alguma linha da ordem vem de um pedido cujo item é de outro fornecedor — a ordem é de UM fornecedor por definição | A linha 2 do pedido PC-0007 é de outro fornecedor. | — | mock |
| `urn:cabinet:erro:periodo-ja-fechado` | 409 | `Período já fechado` | pedir o fechamento de um período que já tem um. `detail` diz quando fechou. Sem a URN o operador repete o gesto achando que o primeiro não pegou — mesmo papel de `pedido-ja-convertido`, que é o precedente | Este período já foi fechado em 31/07/2026. | — | **só contrato** |
| `urn:cabinet:erro:origem-ja-paga` | 409 | `Origem já paga` | alguma origem do período JÁ foi paga em OUTRO fechamento, e nada é gravado. Acontece quando dois períodos se sobrepõem — refechar com datas um dia diferentes pagaria tudo de novo, e cada pagamento duplicado seria legítimo para quem só olhasse o fechamento. `detail` diz qual origem, porque a saída é ajustar o período, não insistir | Alguma origem do período já foi paga em outro fechamento. | — | **só contrato** |
| `urn:cabinet:erro:participante-ja-apurado` | 409 | `Participação já apurada` | remover ou mexer no percentual de uma participação que já virou linha de fechamento. O que já foi pago não se reescreve pelo documento — a saída é fechamento novo | Esta participação já virou linha de fechamento. | — | **só contrato** |
| `urn:cabinet:erro:profissional-exige-transferencia` | 409 | `Troca de profissional exige transferência` | trocar o profissional PRINCIPAL pela grade de participação. A troca tem DATA e justificativa, e a comissão pergunta por elas: quem a faz é `POST /api/orders/{id}/professional`. Pela grade, a vigência seria reescrita sem ninguém dizer — mesma razão de o `PUT` do pedido não mover `professionalId` | Trocar o profissional principal exige transferência, com data e justificativa. | — | **só contrato** |
| `urn:cabinet:erro:reserva-ja-lancada` | 409 | `Reserva técnica já lançada` | o par (pedido, profissional) já tem reserva ativa. Lançar de novo duplicaria o que o fechamento vai pagar; a saída é cancelar a existente e lançar outra | Este pedido já tem reserva técnica ativa para o profissional. | — | **só contrato** |
| `urn:cabinet:erro:periodo-fechado` | 409 | `Período fechado` | lançamento, baixa ou transferência com data dentro de período já fechado para aquela conta ou caixa. URN própria porque a saída da tela é específica e não é "tente de novo": mudar a data, ou pedir a reabertura a quem pode — que é permissão que este contrato ainda não tem | A data cai dentro de um período já fechado para esta conta. | — | **só contrato** |
| `urn:cabinet:erro:titulo-com-baixa` | 409 | `Título com baixa` | reescrever (PUT) ou cancelar um título financeiro que já tem pagamento lançado. Distinta de `transicao-invalida` porque a saída é outra: não é reler o documento, é lançar um título novo — o passado não se reescreve depois que o dinheiro andou | Este título já tem pagamento lançado. | — | **só contrato** |
| `urn:cabinet:erro:parcela-ja-quitada` | 409 | `Parcela já quitada` | baixa sobre parcela cujo saldo já é zero. É a corrida entre dois operadores no mesmo vencimento, e é o caso que produz pagamento em dobro quando a recusa não é nomeada: sem a URN, a tela mostra erro genérico e o operador tenta de novo | Esta parcela já está quitada. | — | **só contrato** |
| `urn:cabinet:erro:valor-acima-do-saldo` | 409 | `Valor acima do saldo` | a baixa abate mais do que a parcela deve. Não tem permissão que libere, ao contrário da quitação a MENOS: pagar mais do que se deve não é alçada, é engano — e o troco não teria onde ser lançado | A baixa abate mais do que a parcela deve. | — | **só contrato** |
| `urn:cabinet:erro:movimento-ja-conciliado` | 409 | `Movimento já conciliado` | conciliar um movimento que outra pessoa já conferiu. 409 e não 200 porque o segundo pedido quase sempre vem de uma tela desatualizada, e responder OK esconderia que dois operadores estavam conferindo o mesmo extrato | Este movimento já foi conciliado. | — | **só contrato** |
| `urn:cabinet:erro:nao-implementado` | 501 | `Não implementado` | a operação está no contrato e ESTE servidor ainda não a serve. É a marca da fase, não erro do pedido: 404 aqui faria a tela concluir que o caminho não existe | A apuração de custo e margem é feita pelo servidor, e este ambiente não o tem. O preço de tabela e o preço de venda sugerido continuam disponíveis. | — | mock |
| `urn:cabinet:erro:resposta-nao-json` | 0 | `Resposta não é da API` | **nenhum servidor emite este.** O CLIENTE o sintetiza quando a resposta não é do contrato — tipicamente o `index.html` do fallback da SPA chegando com 200 porque o proxy do dev não está no ar. Está declarado aqui porque um `type` que a tela lê e o contrato não conhece é a mesma dívida pelo outro lado | `/api/partners` respondeu 200 com `text/html`, e o contrato só devolve JSON. | — | **cliente** |
<!-- catalogo:fim -->

## Onde isto vive no front

| peça | papel |
| --- | --- |
| `contracts/openapi-v1.json` → `ProblemType` | a FONTE: vocabulário, status, `title`, `quando` |
| `src/mocks/api/problema.ts` | monta a resposta do MSW; `TITULO_POR_TIPO` fixa o `title` |
| `src/mocks/api/erros-canonicos.ts` | a fixture única: status, `detail` de exemplo e extensões por URN |
| `src/lib/erros.ts` | o lado da tela: lê `type`, escolhe a frase e a saída oferecida ao operador |
| `src/api/http.ts` | o cliente: `ErroDaApi`, e a síntese do `resposta-nao-json` |
