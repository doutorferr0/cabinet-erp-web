# Bateria de isolamento — casos escritos, nenhum executado

Casos de RLS multi-tenant em SQL executável. **Nada aqui rodou**, e não é descuido: este
repositório é o front do Cabinet. Não há banco, não há backend, e não existe bateria de
isolamento montada em lugar nenhum — o DoD da issue #105 pede "caso próprio na bateria de
isolamento" e a bateria é a peça que falta.

O caso vai escrito em SQL, e não em prosa, porque a regra do core exige a **prova**. Prosa
descrevendo o que deveria acontecer é a promessa de um teste; o arquivo aqui é o teste, à
espera de onde rodar.

## Como rodar, quando houver banco

```
psql -v ON_ERROR_STOP=1 -U <usuario_da_aplicacao> -d cabinet -f <caso>.sql
```

**O usuário tem de ser o da aplicação.** Superuser ignora RLS; o dono da tabela também o
ignora se faltar `FORCE`. Nos dois casos todo `select` devolve tudo, nenhum `raise
exception` dispara, e a bateria termina verde afirmando o contrário do que aconteceria em
produção. É a forma mais convincente de não testar nada.

Cada caso roda dentro de `begin … rollback`: não deixa resíduo, e pode rodar contra um banco
com dado.

## O que um caso precisa provar

Isolar é fácil demais para testar só pelo lado positivo — política que nega tudo isola
perfeitamente e quebra o sistema. Por isso cada caso confere os quatro:

1. **A sessão não vê a outra empresa** — consultando **sem** `where tenant_id`. Com o filtro
   na consulta, o teste prova que o `where` funciona, que ninguém duvida.
2. **A sessão vê a própria** — o contrapositivo. Sem ele, zero linhas passa por engano.
3. **Escrever para fora é recusado**, não descartado em silêncio. Sem `with check`, o
   `insert` passa e a linha some da vista de quem a escreveu: dado gravado onde ninguém
   procura.
4. **Sessão sem tenant não vê nada** — é o estado em que a conexão abre, antes do `SET
   LOCAL`. Linha visível aqui é uma janela em que qualquer consulta vê tudo.

## Casos

| arquivo | tabela | o que prova |
|---|---|---|
| [`vinculo-por-empresa.sql`](vinculo-por-empresa.sql) | `employee_tenants` | colaborador com vínculo em DUAS empresas não cruza contexto; o papel dele muda entre elas; e-mail de login é único na organização |

O cenário do caso é o que a decisão do user criou e não existia antes: **uma pessoa
vinculada às duas empresas**. Colaborador de uma empresa só não distingue "o RLS funciona"
de "só há dado de uma empresa".
