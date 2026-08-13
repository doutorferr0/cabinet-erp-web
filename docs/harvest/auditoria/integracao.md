# Trilha de auditoria — nota de integração

Fonte: [supabase/supa_audit](https://github.com/supabase/supa_audit) `supa_audit--0.3.1.sql`,
Apache-2.0 (ver `NOTICE`). Código adaptado: `cabinet_audit.sql`.

**Estado: staged, e mais staged que os outros dois itens** — este arquivo é SQL de servidor, e o
servidor é trilho de outro desenvolvedor. Aqui ele é entrega de material, não implantação. Quem
aplica, aplica no repo do backend.

## Por que a tabela não é global

O supa_audit cria um schema `audit` e uma tabela `audit.record_version` para o banco inteiro. Num
Supabase de um inquilino só, é o desenho certo.

No Cabinet o isolamento tem dois níveis (@arquitetura): **nível 1, organização = schema Postgres
dedicado**; **nível 2, empresa (CNPJ) = `tenant_id` dentro do schema**. Uma tabela de auditoria
global atravessa os dois:

- Junta numa tabela só o dado operacional de todas as organizações — exatamente o que o schema
  dedicado existe para impedir. E dado operacional é o que a trilha guarda: `record` é a **linha
  inteira** em jsonb.
- Deixa de haver "promover uma organização a banco dedicado sem reescrita", que @arquitetura
  registra como preparo obrigatório. A trilha ficaria para trás, no banco antigo.
- Faz a trilha depender do `search_path` correto para escrever no lugar certo — a mesma fraqueza de
  estado de runtime que @arquitetura manda concentrar num ponto único, agora espalhada por um
  gatilho em cada tabela.

Por isso `cabinet_audit.sql` é template com `@org@`: cada organização ganha a sua tabela e as suas
funções, criadas pela mesma migração que já itera os schemas.

O custo é honesto: relatório de plataforma "quanto se escreve por organização" passa a ser N
consultas, uma por schema. Isso já é verdade para todo o resto do dado operacional, e @arquitetura
já responde — job que itera organização por organização, cada uma em transação escopada.

## O `tenant_id` sai da linha, e a sessão só confirma

O gatilho lê `tenant_id` de `NEW`/`OLD` e **compara** com `app.current_tenant`. Divergência é
exceção, não registro.

Tirar da sessão seria mais simples e estaria errado: a trilha passaria a registrar o contexto de
quem escreveu em vez do dono do dado, e as duas coisas divergem exatamente no caso que a auditoria
existe para pegar. Ler da linha e confirmar contra a sessão faz a auditoria detectar a escrita
fora de escopo em vez de documentá-la como se fosse normal.

Efeito colateral desejado: tabela sem `tenant_id` não é auditável por esta função, e `auditar()`
recusa na criação em vez de deixar quebrar na primeira escrita.

## Append-only de verdade

Três camadas, e a terceira é a que fecha:

1. `revoke all ... from public`, `grant select` só para `cabinet_app`.
2. `security definer` no gatilho: o app não precisa de INSERT na trilha, e portanto não o tem.
3. `force row level security` **sem política de UPDATE nem de DELETE**. Sem FORCE, o dono da tabela
   ignora as políticas e vira o caminho de fuga — @arquitetura registra isso como o pitfall nº 1 de
   produção. Com FORCE e sem política, `update`/`delete` na trilha não existe para ninguém que
   passe pelo RLS.

Quem pode apagar continua sendo quem tem DDL: superusuário e dono podem `drop table`. Isso não se
resolve dentro do banco — se resolve com retenção fora dele (WAL archiving, réplica lógica,
export), e está fora do escopo deste arquivo.

## O oid não sobrevive ao restore

O original guarda `table_oid` e o usa dentro do hash que gera `record_id`. Oid não é estável: um
`pg_restore` recria as tabelas e reatribui oids. Depois de um restore, o mesmo registro passa a
gerar um `record_id` diferente, e o histórico dele fica partido em dois — sem erro, sem aviso, e o
`select ... where record_id = ...` devolve metade.

`cabinet_audit.sql` guarda `table_schema` + `table_name` e usa o nome qualificado no hash. Custa
mais bytes por linha e sobrevive a restore. Renomear tabela parte o histórico do mesmo jeito, mas
renomear tabela é migração — evento consciente, com lugar para migrar a trilha junto.

## TRUNCATE

O gatilho de TRUNCATE do original foi **removido**, não esquecido. TRUNCATE é statement-level: não
tem linha, logo não tem `tenant_id`, e a trilha registraria "alguém truncou" sem poder dizer de
quem era o dado. Pior: TRUNCATE ignora RLS por completo, então o registro daria falsa sensação de
cobertura.

A resposta certa é não conceder TRUNCATE ao papel do app — o que já é verdade, porque `cabinet_app`
não é dono de tabela nenhuma. TRUNCATE em tabela com tenant é operação de manutenção e pertence à
superfície administrativa separada, com trilha própria.

## O que falta decidir (backend)

1. **`app.current_employee`.** O gatilho lê esse GUC para responder "quem". Ele precisa ser posto
   no mesmo `SET LOCAL` que já põe `app.current_tenant`, no ponto único de resolução. Se o backend
   não expuser, a coluna fica nula e a trilha responde "o quê" sem responder "quem" — metade do
   valor.
2. **Quais tabelas auditar.** O gatilho é por linha e escreve uma linha de jsonb por escrita. Em
   tabela de alto volume (movimento de estoque, log de importação) isso dobra o volume de escrita.
   Lista explícita, tabela a tabela, começando pelas que sustentam decisão: parceiro, produto,
   preço, orçamento, pedido, vínculo de papel.
3. **Colunas omitidas.** `auditar('employees', 'password_hash', 'totp_secret')`. A lista é
   auditoria de segurança em si — vale revisão no PR que a define.
4. **Retenção e partição.** A tabela cresce sem teto. Partição mensal por `ts` é o caminho usual;
   com a PK composta `(tenant_id, id)` a chave de partição teria de entrar na PK, o que muda o
   desenho. Decisão do backend, e é melhor tomá-la antes da primeira linha do que depois de dez
   milhões.
5. **`id` compartilhado entre tenants.** `generated always as identity` é uma sequência por schema,
   não por tenant. Um tenant que observe os próprios ids consegue inferir o volume de escrita dos
   vizinhos pelos buracos. É vazamento fraco, e o preço de trocar é perder a ordem total dentro da
   organização. Fica registrado como escolha, não como descuido.
6. **`pgAudit` é complementar, não substituto.** @regras já registra: pgAudit loga sessão e comando
   no log do servidor; isto aqui guarda o dado. Perguntas diferentes, os dois cabem.

## O que o front precisa disto

Nada, por enquanto. Quando a tela de Auditoria existir, ela lê `record_version` por um caminho do
contrato — não por SQL. Fica anotado o que a tela vai querer e que já está na tabela: filtro por
tabela, por período, por `record_id` (histórico de um registro) e por `employee_id`.
