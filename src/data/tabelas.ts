import { EMPRESAS } from '@/mocks/colaboradores'
import { AMBIENTES } from '@/mocks/orcamentos'
import { DESTINOS, FORNECEDORES_DOC } from '@/mocks/pedidos-compra'
import {
  ACABAMENTOS,
  EMPRESAS_COMPRADORAS,
  ORIGENS_PRODUTO,
  TIPOS_VALOR,
  UNIDADES,
} from '@/mocks/produtos'

/**
 * TABELAS DE APOIO — opções de combo que não são um recurso próprio.
 *
 * Hoje são listas locais (fase mock). Na integração viram `GET /tabelas/<nome>`
 * ou enums do OpenAPI; centralizar aqui evita caçar constante espalhada por
 * `src/mocks/` na hora da troca.
 *
 * TODO(contract): confirmar cada lista contra o backend. As marcadas como
 * INVENTADA não vieram da transcrição — o print mostrava só `[combo]`, sem as
 * opções (ver `docs/integracao.md`).
 */
export const tabelas = {
  /** INVENTADA — §6.1 não capturou as opções de unidade. */
  unidades: UNIDADES,
  /** Da transcrição (acabamentos vistos nos produtos). */
  acabamentos: ACABAMENTOS,
  /** INVENTADA — coluna `Tipo de Valor` cortada na captura §6.3. */
  tiposValor: TIPOS_VALOR,
  /** Tabela oficial de origem da mercadoria (ICMS) — NÃO é invenção. */
  origensProduto: ORIGENS_PRODUTO,
  /** Empresas do grupo — mesmas do CompanySwitcher (§9 padrão 7). */
  empresasCompradoras: EMPRESAS_COMPRADORAS,
  /** Empresas do cadastro de colaborador. */
  empresas: EMPRESAS,
  /** Fornecedores que aparecem nos documentos §7.1/§7.3. */
  fornecedoresDocumento: FORNECEDORES_DOC,
  /** Ambientes da obra (`Ambiente F5`) — INVENTADA, §8.2 tem a grade vazia. */
  ambientes: AMBIENTES,
  /** Destino do item comprado — derivado da observação §7.4. */
  destinos: DESTINOS,
  /** Seletor "qual código exibir" nos documentos e no produto. */
  codigoProduto: ['Fornecedor', 'Nosso Código', 'Código Reduzido'],
  /** Séries de documento (§8.2 mostra `1`). */
  series: ['1', '2', '3'],
} as const satisfies Record<string, readonly string[]>

/**
 * Os 19 kinds do padrão `[combo]`/`[combo +...]` (§9 padrão 2) NÃO moram aqui:
 * vêm de `GET /api/catalog-lookups` via `useLookupOptions` (`src/data/lookups-api.ts`).
 * O que sobra neste arquivo são as listas que o contrato não expõe como kind.
 */
