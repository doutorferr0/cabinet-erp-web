# CI — qualidade, contrato e fronteira de dados

## Estado de implementação

O workflow `.github/workflows/ci.yml` agora executa, em um único job: codegen determinístico,
Biome em modo CI não-mutante, guardas da fronteira de dados e dos testes de rota, tipos, suíte de
testes e build. Também declara `permissions: contents: read` e cancela apenas execuções obsoletas
de pull request por branch.

Permanece fora do YAML a proteção da branch `main`: ela precisa ser configurada nas Settings do
GitHub para exigir o check `check` e branch atualizada antes do merge. Cobertura e verificação de
idade de pacotes continuam deliberadamente fora do escopo por exigirem dependência/consulta
externa e decisão própria.

Levantado em 2026-08-08 contra `.github/workflows/ci.yml` (um job, `ubuntu-latest`, Node 22,
pnpm 10). O workflow anterior fazia apenas `Codegen is up to date` → `pnpm check` →
`pnpm check-types` → `pnpm test`; a ordem atual é codegen → Biome CI → guardas de fronteira →
tipos → testes → build.

O passo do codegen continua sólido e faz exatamente o que `docs/integracao.md` promete. Os
buracos identificados neste levantamento foram fechados no workflow; a proteção de branch segue
como configuração externa.

---

## 1. `pnpm check` no CI conserta e passa — não reprova (**corrigido**)

**Severidade: alta. Está furado agora, não é hipótese.**

`package.json` define `"check": "biome check --write"`. Com `--write`, o Biome aplica as correções
e sai **0**. No CI as correções são escritas num runner descartável e jogadas fora com ele; o
passo fica verde e o código volta pro repo torto.

Medido neste repo (Biome 1.9.4, mesma config):

```
$ biome check --write mal.ts
Checked 1 file in 2ms. Fixed 1 file.
EXIT: 0            ← passa

$ biome check mal2.ts
  × Formatter would have printed the following content:
    1 │ - export·const·x···=····1
    1 │ + export·const·x·=·1;
EXIT: 1            ← reprova
```

Ou seja: **tudo que o Biome sabe consertar sozinho** — formatação, ordem de import,
`organizeImports`, boa parte das regras de `style` e `correctness` — passa o CI hoje. Só sobrevive
como falha o que ele não sabe corrigir.

Não dá pra trocar o script: `pnpm check` é o comando de desenvolvimento documentado no CLAUDE.md
e o `--write` é o ponto dele. **A correção é no workflow**, que deve rodar a variante de
verificação:

```yaml
- name: Lint and format check
  run: pnpm exec biome ci .
```

`biome ci` é o modo próprio para esteira: nunca escreve, e formata o relatório para o GitHub
(anotações inline no diff do PR). Alternativa mais conservadora: `pnpm exec biome check .` — não
escreve, mas sem as anotações.

**Antes de ligar, rodar `pnpm exec biome ci .` local uma vez.** Se o passo estava furado, pode
haver dívida acumulada que só aparece agora; ela sai com um `pnpm check` e um commit de
formatação, separado do commit que muda o workflow.

## 2. O build não é verificado — e é o build que vai pro ar (**corrigido**)

**Severidade: alta.**

O CI roda `check-types` (`tsc -b`), nunca `pnpm build` (`tsc -b && vite build`). São coisas
diferentes: o `tsc` não resolve import de asset, não avalia `import.meta.env`, não executa os
plugins (Tailwind v4, `@tanstack/router-plugin`) e não faz o code-splitting. Build quebrado com
tipos verdes é rotina em Vite.

Agrava o CLAUDE.md: **a `main` publica automaticamente em DOIS projetos Pages** — o demo
`cabinetonline.cc` (`cabinet-erp-web`) e, desde 2026-08-23, o site real `app.cabinetonline.cc`
(`cabinet-erp-app`, contra `api.cabinetonline.cc`). A Cloudflare builda por conta própria, em
paralelo ao CI, sem esperar por ele. Hoje, se o `vite build` quebrar, quem descobre é o painel da
Cloudflare depois do merge — e os sites ficam no ar com a versão anterior, sem que nada no GitHub
fique vermelho por isso. O que mudou com o segundo destino é o preço do erro: não é mais uma
vitrine desatualizada, é o sistema em uso sobre dado de produção.

O passo é barato: medido agora, `pnpm build` leva **757 ms** de `vite build` sobre o `tsc -b` que
o CI já paga.

```yaml
- name: Build
  run: pnpm build
```

Colocar **depois** de `Test`: o build é o mais lento dos dois e o feedback útil quase sempre vem
antes.

## 3. Nada impede a `main` de receber merge com CI vermelho

**Severidade: alta — e é config de repositório, não de workflow.**

> **Reconferido em 2026-08-13 pela API, e continua aberto:**
> `GET /repos/{owner}/{repo}/branches/main/protection` responde **404 "Branch not protected"** e
> `GET /rulesets` devolve lista **vazia**. Não é suposição de quem escreveu em 08/08 — é o estado
> de hoje. Vale mais aqui do que na maioria dos repos: a `main` publica sozinha nos dois
> destinos — `cabinetonline.cc` (demo) e `app.cabinetonline.cc` (produção real, desde
> 2026-08-23) —, então merge é publicação, e nada exige o check verde antes dela.

O CLAUDE.md diz "CI vermelho = sessão não terminou", mas isso é disciplina, não trava. Sem
proteção de branch, um merge entra com o check falhando (ou ainda rodando) e a Cloudflare publica.

Fora do repo, em Settings → Branches → `main`:

- **Require status checks to pass** marcando o job `check` do workflow CI.
- **Require branches to be up to date before merging** — pega a incompatibilidade semântica entre
  duas branches verdes isoladamente. Exatamente o caso do merge de 2026-08-08: `main` e
  `refactor/reduz-duplicacao` passavam separadas e a integração precisava ser verificada
  (passou, mas por sorte, não por guarda).

Sem isto, os itens 1 e 2 valem menos: descobrir a falha não é o mesmo que impedir o merge.

## 4. Higiene de execução: `concurrency` e `permissions` (**corrigido**)

**Severidade: média (custo e segurança, não qualidade de código).**

Nenhum dos dois está declarado.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
```

- Sem `concurrency`, três pushes seguidos numa branch mantêm **três** runs vivos; só o último
  interessa. Em branch de trabalho com push frequente é o maior desperdício de minutos da conta.
  Ressalva: `cancel-in-progress` em `push: main` cancela a validação de um commit já mergeado —
  se isso incomodar, restringir o cancelamento a PR com
  `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- Sem `permissions`, o `GITHUB_TOKEN` recebe o padrão da organização, que pode ser escrita. Este
  workflow só lê o código. Declarar o mínimo é gratuito.

## 5. Branch sem PR não roda CI

**Severidade: baixa.**

O gatilho é `push: [main]` + `pull_request: [main]`. Branch empurrada sem PR aberto não é
validada — mas a Cloudflare **builda o preview dela mesmo assim** (nos dois projetos), e o
CLAUDE.md manda usar preview para mostrar trabalho em andamento. Então existe URL publicada de código que nenhum check
tocou.

Duas saídas, e a segunda é a recomendada:

- `push: branches-ignore: [main]` além do gatilho atual — valida tudo, mas dobra o gasto em quem
  abre PR (push e PR disparam o mesmo trabalho).
- Deixar como está e tratar preview de branch sem PR como rascunho — que é o que ele é. Só vale
  registrar a expectativa, para ninguém ler "tem preview" como "passou no CI".

---

## Guardas específicas deste repo (a parte que vale mais)

Lint genérico não sabe nada sobre as regras que realmente quebram este projeto. Estas são as
regras do CLAUDE.md que dá para mecanizar com `grep` num passo de workflow — baratas, e cada uma
já custou uma correção manual.

### 5.1 A tela não chama o cliente gerado direto — **guardado no workflow**

Regra: "tela NUNCA importa `fetch*` de `src/mocks/` nem chama o cliente gerado direto — pede a
`data.<recurso>`". Importar **tipo** de `@/api/gerado` é obrigatório (o CLAUDE.md proíbe escrever
à mão tipo que o contrato define); o que não pode é importar **função**.

Conferido antes da guarda: 26 imports de `@/api/gerado` em `src/features/` e `src/routes/` eram todos
`import type`. Os 14 imports de valor estão em `src/data/` (11) e `src/mocks/api/` (3, os handlers
do MSW, que precisam dos schemas). A guarda agora reprova qualquer import de valor fora da
fronteira permitida.

```yaml
- name: Fronteira de dados (tela não chama o cliente gerado)
  run: |
    if rg -n -P '^[[:space:]]*import[[:space:]]+(?!type\b)(?:.*from[[:space:]]+)?(?:\x27|")@/api/gerado(?:\x27|")' \
         src --glob '*.ts' --glob '*.tsx' \
         | grep -Ev '^src/(data|api|mocks/api)/'; then
      echo '::error::import de VALOR de @/api/gerado fora de src/data — a tela pede a data.<recurso>, ver CLAUDE.md'
      exit 1
    fi
```

### 5.2 Teste de rota usa `renderRoute`, não `createMemoryHistory` local — **guardado no workflow**

Regra: "não recriar `setup()` local com `createMemoryHistory`". A violação histórica de
`src/app/shell.test.tsx` foi migrada para `renderRoute`; a ocorrência permitida agora vive apenas
em `src/test/utils.tsx`, dentro do helper oficial.

Não há allowlist de teste de aplicação: o workflow reprova qualquer ocorrência fora de
`src/test/`.

```yaml
- name: Testes de rota usam os helpers de src/test
  run: |
    if grep -rln "createMemoryHistory" src | grep -v '^src/test/'; then
      echo '::error::use renderRoute/renderWithQuery de src/test/utils.tsx, ver CLAUDE.md'
      exit 1
    fi
```

### 5.3 O que **não** dá para mecanizar assim

- **"Tela não importa `fetch*` de `src/mocks/`"** tem exceção legítima e documentada:
  `src/components/cabinet/blocks.tsx` importa `fetchCep` de `@/mocks/ceps`, que é a busca de CEP
  mockada do padrão 3. Um grep cru fica vermelho por causa dela. Escrever a guarda com allowlist
  de um item só troca uma regra clara por uma exceção escondida no YAML — melhor deixar para a
  revisão humana, que é onde ela já está funcionando.
- **"Dinheiro em centavos, nunca float"** e **"campo vem da transcrição, não inventado"** são
  semânticas, não padrões de texto. Guarda por grep aqui gera falso positivo e treina todo mundo
  a ignorar o passo.
- **"Não criar atalho customizado novo"**: mecanizável só como "`src/lib/shortcuts.ts` não cresce",
  o que é um diff-guard e não um grep. Baixo retorno.

---

## Cobertura de teste

Não há `--coverage` no CI e não há limiar. O CLAUDE.md exige "componente novo = teste novo
mínimo", que é a intenção certa e não é o que um limiar global mede: 427 testes hoje dão um número
qualquer, e fixar esse número como piso premia teste de encher linha. (**486 testes em 73
arquivos** em 2026-08-13 — o número da frase muda a cada semana, que é justamente o argumento.)

Proposta, se entrar: `vitest run --coverage` publicando **relatório**, sem `thresholds`, por dois
ou três meses. Depois disso existe série histórica e o piso pode ser calibrado em cima de dado, em
vez de chutado. Requer `@vitest/coverage-v8` — nova dependência, e o `minimumReleaseAge: 10080`
significa 7 dias de espera; planejar com folga.

## Supply chain

`pnpm-workspace.yaml` fixa `minimumReleaseAge: 10080` (7 dias), política pós-incidente e sem
exceções desde 2026-08-07. **O CI não a verifica.** Ele roda `pnpm install --frozen-lockfile`, que
instala o que o lockfile manda sem re-resolver — a política é aplicada na máquina de quem
adicionou a dependência. Um lockfile gerado onde a config não valeu (pnpm de outra versão, ou
`--no-frozen-lockfile`) entra sem que nada acuse.

Guarda possível: num PR que mexeu em `pnpm-lock.yaml`, extrair as versões novas e consultar a data
de publicação no registry, reprovando o que tiver menos de 7 dias. É um script, não uma linha de
YAML — dimensionar antes de prometer. Enquanto não existir, vale saber que a política é honrada
por convenção, não por trava.

---

## Resultado e próximos passos

1. **Aplicado:** Biome CI não-mutante, build, `concurrency`, `permissions`, guardas 5.1 e 5.2.
2. **Configuração externa pendente:** proteger `main` exigindo o job `check` e branch atualizada.
3. **Futuro deliberado:** cobertura e supply-chain automatizado, somente após definir dependência,
   fonte de publicação e política de falha.
4. **Candidata nova, decisão do user:** `python3 docs/design/medir-contraste.py --conferir` (2026-08-13)
   pergunta se as tabelas de contraste e o frontmatter do `DESIGN.md` ainda batem com
   `src/index.css`, e sai 1 quando não. Hoje é comando manual, e comando manual não é guarda —
   ninguém roda. Como passo do CI custaria **python num job que hoje é só node**; é a única
   objeção real, já que o script não tem dependência externa e roda em ~50 ms. Fica proposto,
   não aplicado: mexer no `ci.yml` é fora da zona de quem escreveu isto.

Itens de workflow e a migração do helper foram mantidos no mesmo fechamento porque a guarda 5.2
precisava nascer sem exceção.

## Um job ou vários

Manter **um job**. A tentação é paralelizar lint/tipos/teste em jobs separados para feedback mais
rápido, mas aqui cada job extra repaga `checkout` + `pnpm install` (o custo dominante), e o
trabalho útil é curto: suíte inteira em **18,6 s** (63 arquivos, 427 testes) e build em **757 ms**
— medição de 2026-08-08, em máquina ociosa. **Não comparar com uma rodada local qualquer:** com
build e browser disputando a máquina, a mesma suíte foi a 151 s e reprovou 7 arquivos por
contenção, e a MESMA árvore fechou verde em seguida com `--maxWorkers=2`. Falha de suíte cheia em
máquina ocupada não é regressão até ser reproduzida limitando os workers.
Três jobs paralelos triplicariam a instalação para economizar segundos. A ordem sequencial atual
— codegen, lint, tipos, teste, build — já põe o mais barato e mais provável primeiro.
