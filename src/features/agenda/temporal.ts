/**
 * DONO ÚNICO do polyfill do `Temporal`, e o motivo de ele não morar mais no
 * `src/main.tsx`.
 *
 * Dois consumidores dependem do global, não um: o `@schedule-x/calendar`, que
 * usa `Temporal` sem importá-lo (#230), e o NOSSO `./eventos`, que monta os
 * eventos da lib com `Temporal.Instant.from`. Enquanto o carregamento morava na
 * entrada da aplicação, os dois eram servidos de graça — e o preço era 20.125 B
 * gzip no chunk de ENTRADA, pagos em toda página, inclusive na de login, por
 * causa de uma tela só. Medido na #227: 68% de tudo que as três libs de
 * planning custavam no primeiro carregamento.
 *
 * Aqui o polyfill viaja no chunk da agenda, que é lazy, e cada módulo que usa
 * `Temporal` declara a dependência importando ESTE arquivo. É `import` de
 * efeito colateral de propósito: o Biome trata bare import como barreira e não
 * o reordena, então a linha fica onde foi posta — o que um `import { x } from`
 * não garantiria, já que `@schedule-x/…` vem antes de `temporal-…` na ordem
 * alfabética e o polyfill acabaria embaixo da lib que ele existe para servir.
 */
import 'temporal-polyfill/global'
