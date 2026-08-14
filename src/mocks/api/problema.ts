import { HttpResponse } from 'msw'

/**
 * O erro do servidor falso, num lugar só — RFC 9457 Problem Details.
 *
 * Nasceu duplicado em `handlers.ts` e `crm.ts` (cópia deliberada, para não criar
 * ciclo: `handlers.ts` importa `crm.ts`). Sai daqui pela mesma razão que a
 * `aplicarFiltros` saiu: **o formato de erro é UM só, e formato em duas cópias
 * vira dois formatos.** Este módulo é folha — não importa nada do mock — então o
 * ciclo que justificava a duplicação não existe mais.
 *
 * ## O `title` é do TIPO, não da ocorrência
 *
 * O contrato define `title` como rótulo **estável** do tipo de erro. As duas
 * cópias mandavam `'Erro'` em 100% das respostas, e isso é pior do que parece:
 * o `ErroDoServidor` mostra `title` como cabeçalho e a frase da tela abaixo,
 * então no modo mock — o único ambiente que existe hoje — TODO erro aparecia
 * como "Erro" em cima e a informação útil embaixo, menor. O componente estava
 * certo; a resposta é que não distinguia nada.
 *
 * O mapa é por status porque `type` é `about:blank`: a RFC diz que, nesse caso,
 * o `title` deve ser a frase do próprio status HTTP. Um backend com tipos
 * próprios (`/erros/estoque-insuficiente`) manda o título dele — este mapa é o
 * piso, não o teto.
 */
const TITULO_POR_STATUS: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Sem permissão',
  404: 'Não encontrado',
  409: 'Conflito',
  500: 'Erro interno',
}

/** O rótulo do tipo para um status; `Erro` só no que o mapa não cobre. */
export function tituloDoStatus(status: number): string {
  return TITULO_POR_STATUS[status] ?? 'Erro'
}

/**
 * Resposta de erro no formato do contrato.
 *
 * `extras` são os MEMBROS DE EXTENSÃO da RFC, e o contrato declara dois:
 * `fields` (validação por campo) e `existingPartnerId` (409 de documento
 * repetido). Extensão nova entra no schema primeiro — solta aqui, o front a
 * descobriria por acidente.
 */
export function problemaJson(status: number, detail: string, extras: Record<string, unknown> = {}) {
  return HttpResponse.json(
    { type: 'about:blank', title: tituloDoStatus(status), status, detail, ...extras },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )
}
