import { Stamp } from '@/components/cabinet/stamp'

/**
 * A coluna `Ativo` das listagens de cadastro, em CARIMBO.
 *
 * Estava escrita como `getValue() ? 'Sim' : 'Não'` em cinco telas — cinco
 * cópias da mesma decisão, e um "Sim" preto no meio de uma coluna de textos
 * pretos, que o olho só acha lendo linha por linha. A situação é o que o
 * operador varre a lista para encontrar; ela merece a peça que o sistema já tem
 * para situação.
 *
 * **`Ativo` → `done`, `Inativo` → `void`.** Os tons do `Stamp` são semânticos e
 * o par cai certo: `done` é o preenchido, o estado normal e resolvido; `void` é
 * literalmente o anulado — e desativação de cadastro é anular sem apagar
 * (padrão 8). O contrário (inativo preenchido) faria a lista gritar justamente a
 * linha que saiu de circulação.
 *
 * A cor não vem sozinha: os dois carimbos escrevem a palavra. Coluna que só
 * mudasse de tom seria muda para daltônico e para leitor de tela (WCAG 1.4.1) —
 * e ainda obrigaria a decorar qual cor é qual.
 */
export function CelulaAtivo({ ativo }: { ativo: boolean }) {
  return <Stamp tom={ativo ? 'done' : 'void'} label={ativo ? 'Ativo' : 'Inativo'} />
}
