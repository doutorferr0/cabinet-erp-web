import { moduloDaRota } from '@/app/modulo'
import { DO_MODULO, FORMAS } from '@/components/cabinet/forma'
import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * O FAVICON É A FORMA DO MÓDULO EM QUE O OPERADOR ESTÁ (Reface 2.0, D35).
 *
 * Quem opera um ERP passa o dia com seis abas do MESMO sistema abertas — o
 * orçamento numa, a ordem de compra noutra, o estoque na terceira. Com um ícone
 * só para tudo, a aba certa se acha lendo o título truncado em 12 caracteres.
 * Trocar o favicon por módulo transforma a barra de abas num mapa, e é a mesma
 * gramática da tela: quem viu a caixa no vazio de Compras reconhece a caixa na
 * aba.
 *
 * ## Por que trocar o `href` em vez de servir arquivos
 *
 * Sete SVGs em `public/` seriam sete arquivos a manter em sincronia com o
 * `FORMAS` daqui, e divergiriam na primeira forma corrigida — o desenho é dado,
 * e dado tem um dono só. O data URI é montado a partir da MESMA tabela.
 *
 * A cor sai do documento vivo (`getComputedStyle`), e é o que faz o ícone
 * acompanhar o tema: no escuro o traço é claro, porque `--n-900` inverte. Um
 * hex fixo aqui daria um favicon preto sobre aba escura.
 */
export function useFaviconDoModulo() {
  const pathname = useRouterState({ select: (estado) => estado.location.pathname })

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    const [tipo, matiz] = DO_MODULO[moduloDaRota(pathname) ?? 'boletim']
    const raiz = getComputedStyle(document.documentElement)
    const tinta = raiz.getPropertyValue('--n-900').trim() || '#16140f'
    const cor = raiz.getPropertyValue(`--mod-${matiz}`).trim() || 'none'
    const [externa, ...resto] = FORMAS[tipo]
    const interna = resto.at(-1) as string
    // Fio de 3 no viewBox de 64: em 16px de aba o fio de tela some, e aqui não
    // há `non-scaling-stroke` que valha — o navegador rasteriza uma vez só.
    link.href = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${tinta}" stroke-width="3" stroke-linejoin="miter"><path d="${externa}"/><path d="${interna}" fill="${cor}"/></svg>`,
    )}`
  }, [pathname])
}
