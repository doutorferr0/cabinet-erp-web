/**
 * Normalização de texto da CONSULTA — minúsculas sem acento.
 *
 * Mora em `src/lib/` porque agora tem dois clientes de camadas diferentes: a
 * busca do provider mock (`src/mocks/query.ts`) e o avaliador de filtros
 * (`src/lib/filtro-de-consulta.ts`). Deixá-la em `src/mocks/` obrigaria `lib` a
 * importar de `mocks`, que é a seta errada — mock some na integração, o
 * avaliador não.
 */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}
