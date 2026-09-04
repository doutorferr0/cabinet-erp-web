import {
  MARCA_DE_IMPRESSAO,
  celulaCsv,
  imprimirRelatorio,
  montarCsv,
  nomeDoArquivo,
} from '@/features/relatorios/exportar'
import { describe, expect, it, vi } from 'vitest'

/**
 * AS REGRAS DO ARQUIVO — o que o CSV promete e o que a impressão faz.
 *
 * Os dois defeitos que estes casos travam já custaram planilha errada em
 * sistema de verdade:
 *
 * 1. **Descrição com aspa ou ponto-e-vírgula desloca a linha inteira.** O
 *    catálogo do legado tem `PENDENTE 30" · PRETO; DOURADO` de sobra, e sem o
 *    escape do formato tudo a partir dali cai uma coluna à direita — a planilha
 *    abre, ninguém vê erro, e o valor de um item aparece na coluna do saldo.
 * 2. **A marca de impressão presa no `body`.** Se ela não sair, a tela seguinte
 *    imprime com metade da interface escondida, e o operador só descobre no
 *    papel.
 */

describe('célula de CSV', () => {
  it('texto simples sai como está — aspas em tudo não ajudam ninguém', () => {
    expect(celulaCsv('PENDENTE VIDRO FUMÊ')).toBe('PENDENTE VIDRO FUMÊ')
  })

  it('ponto-e-vírgula vira campo entre aspas — senão a linha desloca', () => {
    expect(celulaCsv('PRETO; DOURADO')).toBe('"PRETO; DOURADO"')
  })

  it('a aspa de dentro DOBRA, que é o escape do formato', () => {
    expect(celulaCsv('PENDENTE 30" FUMÊ')).toBe('"PENDENTE 30"" FUMÊ"')
  })

  it('quebra de linha também entra entre aspas', () => {
    expect(celulaCsv('ARANDELA\nTUBULAR')).toBe('"ARANDELA\nTUBULAR"')
  })
})

describe('montar CSV', () => {
  it('cabeçalho e linhas, com `;` e `\\r\\n` — é o que o Excel pt-BR espera', () => {
    const csv = montarCsv(
      ['Descrição', 'Saldo'],
      [
        ['PENDENTE', '12'],
        ['ARANDELA; TUBULAR', '1'],
      ],
    )

    expect(csv).toBe('Descrição;Saldo\r\nPENDENTE;12\r\n"ARANDELA; TUBULAR";1')
  })
})

describe('nome do arquivo', () => {
  it('carrega o instante — dois recortes do mesmo dia são documentos diferentes', () => {
    const nome = nomeDoArquivo('estoque-valorizado', new Date(2026, 8, 2, 10, 30))
    expect(nome).toBe('estoque-valorizado-2026-09-02-1030.csv')
  })

  it('mês e dia com dois dígitos — senão a ordenação da pasta embaralha', () => {
    expect(nomeDoArquivo('estoque-parado', new Date(2026, 0, 5, 9, 7))).toBe(
      'estoque-parado-2026-01-05-0907.csv',
    )
  })
})

describe('imprimir', () => {
  it('marca o corpo, chama a impressão e TIRA a marca', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)

    imprimirRelatorio(window)

    expect(print).toHaveBeenCalledOnce()
    // A marca sai no `afterprint` — e num tempo zero de segurança, porque há
    // navegador que não dispara `afterprint` quando o diálogo é cancelado.
    await new Promise((resolve) => setTimeout(resolve, 1))
    expect(document.body.dataset[MARCA_DE_IMPRESSAO]).toBeUndefined()

    vi.unstubAllGlobals()
  })
})
