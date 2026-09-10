/**
 * EXPORTAR o relatório — CSV no cliente, PDF pela impressão do navegador.
 *
 * ## Por que o CSV é montado aqui e não pedido ao servidor
 *
 * Nenhuma das dez operações de `/api/reports` publica `format` ou aceita
 * `Accept: text/csv`. Pedir um CSV ao servidor seria inventar chamada HTTP, que
 * é o proibido nº 1 do repositório. O que a tela JÁ TEM é o envelope da página
 * carregada — e é exatamente ele que sai, com as mesmas colunas e os mesmos
 * números que estão à vista.
 *
 * ## Ponto-e-vírgula e BOM não são gosto
 *
 * O Excel em português abre `.csv` esperando `;` como separador (o `,` é o
 * separador DECIMAL da locale) e decide a codificação pelo BOM. Sem os dois, um
 * arquivo correto abre com todas as colunas empilhadas numa só e os acentos
 * quebrados — e quem recebe conclui que a exportação está com defeito.
 *
 * ## O que o arquivo NÃO promete
 *
 * O CSV cobre as linhas CARREGADAS, nunca o recorte inteiro: `pageSize` tem teto
 * de 100 no contrato, e um relatório de 4000 itens não cabe numa resposta. Quem
 * diz isso ao operador é a moldura, no rodapé, antes de ele clicar. O arquivo
 * leva o instante no NOME para que dois recortes do mesmo dia não se
 * sobrescrevam na pasta de downloads.
 */

/** O separador do Excel pt-BR. O `,` ali é decimal, não coluna. */
const SEPARADOR = ';'

/**
 * Uma célula de CSV.
 *
 * Aspas duplas sempre que o texto contém separador, aspa ou quebra — e a aspa de
 * dentro dobra, que é o escape do formato. Descrição de produto do legado tem
 * `"` e `;` com frequência (`PENDENTE 30" · PRETO; DOURADO`), e sem o escape a
 * linha inteira se desloca uma coluna para a direita a partir dali.
 */
export function celulaCsv(valor: string): string {
  if (!/[";\n\r]/.test(valor)) return valor
  return `"${valor.replaceAll('"', '""')}"`
}

/** Cabeçalho + linhas, com `\r\n` — o fim de linha que o formato pede. */
export function montarCsv(
  cabecalho: readonly string[],
  linhas: readonly (readonly string[])[],
): string {
  return [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(SEPARADOR)).join('\r\n')
}

/**
 * Nome do arquivo com o instante colado — `estoque-parado-2026-09-02-1030.csv`.
 *
 * Data e hora entram porque relatório de estoque é FOTO: dois arquivos do mesmo
 * dia são documentos diferentes, e o segundo download sobrescrevendo o primeiro
 * apagaria justamente a comparação que motivou o segundo.
 */
export function nomeDoArquivo(base: string, agora: Date = new Date()): string {
  const dd = (n: number) => String(n).padStart(2, '0')
  const data = `${agora.getFullYear()}-${dd(agora.getMonth() + 1)}-${dd(agora.getDate())}`
  return `${base}-${data}-${dd(agora.getHours())}${dd(agora.getMinutes())}.csv`
}

/**
 * Entrega o arquivo ao navegador.
 *
 * O `﻿` é o BOM — sem ele o Excel lê o UTF-8 como Latin-1 e "PENDÊNCIA"
 * vira "PENDÃŠNCIA". A URL do objeto é revogada no mesmo turno: o `click` já
 * leu o conteúdo, e deixá-la viva segura o texto inteiro na memória da aba.
 */
export function baixarCsv(nome: string, conteudo: string): void {
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** A marca no `body` que liga o `@media print` desta feature. */
export const MARCA_DE_IMPRESSAO = 'imprimindo'

/**
 * PDF = imprimir. Não há gerador de PDF no cliente e não deve haver: o navegador
 * já tem um, ele respeita a fonte e o tema do usuário, e "Salvar como PDF" é o
 * destino padrão do diálogo em toda plataforma.
 *
 * A marca sai no `afterprint` — e também num tempo zero de segurança, porque há
 * navegador que não dispara `afterprint` quando o usuário CANCELA o diálogo, e
 * uma marca presa deixaria a tela seguinte com metade da interface escondida.
 */
export function imprimirRelatorio(janela: Window = window): void {
  const corpo = janela.document.body
  corpo.dataset[MARCA_DE_IMPRESSAO] = 'relatorio'

  const limpar = () => {
    delete corpo.dataset[MARCA_DE_IMPRESSAO]
    janela.removeEventListener('afterprint', limpar)
  }
  janela.addEventListener('afterprint', limpar)

  try {
    janela.print()
  } finally {
    janela.setTimeout(limpar, 0)
  }
}
