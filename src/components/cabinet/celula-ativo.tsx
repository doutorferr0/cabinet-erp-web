import { Badge } from '@/components/cabinet/badge'

/**
 * A coluna `Ativo` das listagens de cadastro, em BADGE. Reface 2.0, #471 (D3).
 *
 * Estava escrita como `getValue() ? 'Sim' : 'Não'` em cinco telas — cinco
 * cópias da mesma decisão, e um "Sim" preto no meio de uma coluna de textos
 * pretos, que o olho só acha lendo linha por linha.
 *
 * ## `Ativo → ok`, `Inativo → mut` — e o inativo DEIXOU de ser vermelho
 *
 * A 1.x mandava `ativo → done` e `inativo → void`, e `void` é o tom do anulado:
 * vermelho. O argumento da época era que desativar cadastro é "anular sem
 * apagar" (padrão 8). Ele estava errado no efeito: numa listagem de cadastros,
 * vermelho é a cor do que exige AÇÃO — erro, cancelamento, valor negativo —, e
 * um fornecedor que a empresa parou de usar não exige ação nenhuma. A coluna
 * pintava de alarme uma condição administrativa banal.
 *
 * `mut` é o tom certo: cadastro inativo saiu de circulação, e sair de
 * circulação é ficar em silêncio, não gritar. `bad` volta a significar só o que
 * deu errado. (Issue #471; a 2.0 é explícita — `ativo→ok`, `inativo→mut`.)
 *
 * ## A palavra continua sendo o que carrega o estado
 *
 * Os dois badges ESCREVEM. Coluna que só mudasse de tom seria muda para
 * daltônico e para leitor de tela (WCAG 1.4.1) — e ainda obrigaria a decorar
 * qual cor é qual.
 */
export function CelulaAtivo({ ativo }: { ativo: boolean }) {
  // `data-slot="stamp"` é o contrato que o próprio `badge.tsx` declara: "os
  // aliases (`Stamp`, `CelulaAtivo`) sobrescrevem `data-slot`/`data-tom` para
  // não quebrar quem os consulta". A promessa estava escrita e não cumprida
  // aqui — o alias saía como `badge`, e `produto-form.test.tsx` (que consulta
  // `[data-slot="stamp"]` desde a 1.x, quando a coluna era um `Stamp`) parou de
  // achar a célula. Quem lê o slot lê PAPEL — "o selo de estado desta linha" —,
  // não a peça que o desenha; por isso o alias mantém o nome do papel em vez de
  // vazar o `badge` que passou a implementá-lo.
  return (
    <Badge tom={ativo ? 'ok' : 'mut'} data-slot="stamp">
      {ativo ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}
