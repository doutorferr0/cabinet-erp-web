#!/usr/bin/env node
/**
 * SEMEADURA DO PAR VIVO — um comando, do banco cru até o login funcionando.
 *
 * O `ao-vivo.test.ts` e o `CLAUDE.md` deste repo mandavam, até esta leva, decorar
 * quatro comandos no outro repositório. Enquanto foi assim, as baterias que
 * dependem do par não rodaram — e a #341 mediu o preço: 27 declarações de
 * ausência falsas em 48 horas, sem nada avisar. Ritual não é guarda.
 *
 * ## Os quatro passos, e por que o primeiro é condicional
 *
 * 1. **bootstrap de superusuário** (`scripts/preparar-banco.sql` do api): cria o
 *    papel dono `cabinet_owner` — que NÃO é superusuário, e é isso que faz o
 *    `FORCE ROW LEVEL SECURITY` valer também para ele — e a extensão `unaccent`,
 *    de que a migração `0004` depende para criar `sem_acento()`.
 *
 *    Em desenvolvimento quem entrega esse `.sql` é o `docker-entrypoint-initdb.d`
 *    do `docker-compose.yml` do api, na criação do volume. Num **service
 *    container do GitHub Actions não há initdb** — service container não monta
 *    volume —, então lá o passo tem de ser dado à mão. Daí a condicional:
 *    `DATABASE_URL_SUPERUSUARIO` presente significa "este banco subiu sem
 *    bootstrap"; ausente significa "o compose já fez".
 *
 * 2. `migrate` — com a URL do DONO do schema.
 * 3. `db:runtime` — cria o papel de LOGIN. `migrate` sozinho deixa o banco sem
 *    ele (a migração cria `cabinet_app`, que é NOLOGIN): o servidor sobe,
 *    responde `/health` e devolve 500 na primeira consulta.
 * 4. `seed:dev` — duas empresas, colaborador com senha de verdade, catálogo,
 *    parceiros, orçamentos e pedidos. É o que dá ao E2E um catálogo para listar
 *    e ao login um usuário para aceitar.
 *
 * ## Por que o passo 1 mora AQUI e não lá
 *
 * Ele deveria ser `pnpm setup:ci` no api, e a PR está aberta
 * (`doutorferr0/cabinet-erp-api#221`). Ela não pôde mergear ainda: o
 * `check:contract` de lá reprova porque a cópia do contrato está 28 operações
 * atrás da `main` DESTE repo, e sincronizar arrasta dívida de outros trilhos —
 * as operações novas precisam de motivo declarado em três allowlists de lá.
 *
 * Fazer o CI daqui esperar por aquilo seria trocar um bloqueio por outro. Então
 * este script chama o `.sql` do api pelo caminho, com `psql`, e some quando a
 * #221 mergear: as quatro linhas viram `pnpm --dir <api> setup:ci`.
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const API = path.resolve(process.env.CABINET_API_DIR ?? '../cabinet-erp-api')

if (!existsSync(path.join(API, 'package.json'))) {
  console.error(
    `não achei o checkout do cabinet-erp-api em ${API}.
Aponte CABINET_API_DIR para ele — o padrão é o repositório irmão, que é a convenção do CLAUDE.md.`,
  )
  process.exit(2)
}

function rodar(comando, argumentos, opcoes = {}) {
  console.log(`· ${comando} ${argumentos.join(' ')}`)
  execFileSync(comando, argumentos, { stdio: 'inherit', ...opcoes })
}

const superusuario = process.env.DATABASE_URL_SUPERUSUARIO
if (superusuario) {
  // `psql` PRESENTE, conferido antes de usar. Sem isto o `execFileSync` estoura
  // com um despejo de stack do Node cujo `ENOENT` não diz qual binário faltou —
  // medido nesta máquina, que não tem `postgresql-client`. O runner do CI tem;
  // quem roda com Postgres próprio no micro pode não ter, e a mensagem tem de
  // dizer as duas saídas.
  try {
    execFileSync('psql', ['--version'], { stdio: 'ignore' })
  } catch {
    console.error(
      `DATABASE_URL_SUPERUSUARIO está definida, mas \`psql\` não está no PATH.
Ele é o que entrega o bootstrap de superusuário onde não houve \`initdb\`.
  · no CI: o runner do GitHub já traz o postgresql-client
  · no seu micro: instale o cliente, OU tire a variável e deixe o compose do api
    fazer o passo (\`pnpm db:up\` lá monta o .sql em docker-entrypoint-initdb.d)`,
    )
    process.exit(2)
  }

  const bootstrap = path.join(API, 'scripts', 'preparar-banco.sql')
  // `ON_ERROR_STOP=1` porque o padrão do psql é seguir depois do erro e sair 0:
  // sem isso, um bootstrap que falhou pela metade só apareceria na migração
  // seguinte, com uma mensagem sobre `sem_acento()` que não aponta para cá.
  rodar('psql', [superusuario, '-v', 'ON_ERROR_STOP=1', '-q', '-f', bootstrap])
} else {
  console.log('· bootstrap pulado (sem DATABASE_URL_SUPERUSUARIO — o compose do api já o fez)')
}

for (const alvo of ['migrate', 'db:runtime', 'seed:dev']) {
  rodar('pnpm', ['--dir', API, alvo])
}
