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
  return <Badge tom={ativo ? 'ok' : 'mut'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
}
