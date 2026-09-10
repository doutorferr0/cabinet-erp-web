import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MAPA_DE_ATALHOS, SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'

/**
 * A TELA QUE O OPERADOR CONSULTA — legado à esquerda, tecla de hoje à direita.
 *
 * ## Por que existe uma tela, e não só uma linha no manual
 *
 * O sistema que estas pessoas operam há anos usa F3-F6, e aqui essas teclas são
 * PROIBIDAS (CLAUDE.md — F3 busca do navegador, F5 recarrega, F6 troca de
 * painel). Remapear sem dizer para onde deixa a pessoa concluindo que a tecla
 * quebrou: ela aperta F6 esperando o produto, o navegador muda de painel, e não
 * há em lugar nenhum do produto onde ler que a tecla virou `Alt+P`. A coluna do
 * legado é a metade que importa — sem ela isto seria uma lista de teclas novas,
 * que quem já sabia não precisa e quem não sabia não procura.
 *
 * ## A tabela é o dado, não texto
 *
 * As linhas vêm de `MAPA_DE_ATALHOS`, no mesmo arquivo que declara as teclas, e
 * `mapa-de-atalhos.test.ts` cobra uma linha por atalho. Tela que reescrevesse a
 * tabela à mão seria a quarta cópia da mesma lista — as três anteriores (a
 * decisão de 2026-07-28, a issue #362 e os comentários do registry) já
 * divergiram do código.
 *
 * ## O que esta tela NÃO afirma
 *
 * Que as combinações foram testadas na máquina de quem opera. A coluna do
 * navegador é conferência da documentação de Chrome e Edge (2026-08-28), e está
 * dita como tal: extensão instalada, layout de teclado e leitor de tela mudam a
 * resposta, e nada disso aparece num manual de fabricante. Quem fecha essa conta
 * é a validação com os operadores — `docs/atalhos-para-validacao.md`.
 */
export function MapaDeAtalhosTela() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <PageHeader titulo="Atalhos do teclado" />
      {/* Prosa de tela, e não `subtitulo`: o subtítulo do cabeçalho diz o que a
          tela TEM ("14 atalhos"), em uma linha. Isto é a regra da casa sobre
          atalho, que precisa das três frases. */}
      <p className="max-w-prose text-muted-foreground text-sm">
        Toda ação do Cabinet é alcançável pelo mouse — nenhum fluxo depende de tecla memorizada. Os
        atalhos abaixo são conveniência para quem vem do sistema antigo, e a coluna da esquerda
        mostra a tecla que fazia a mesma coisa lá.
      </p>

      <Painel titulo="Do sistema antigo para o Cabinet">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tecla no sistema antigo</TableHead>
              <TableHead scope="col">O que faz</TableHead>
              <TableHead scope="col">Tecla aqui</TableHead>
              <TableHead scope="col">Onde vale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MAPA_DE_ATALHOS.map((linha) => (
              <TableRow key={`${linha.legado ?? ''}-${linha.atalho ?? ''}`}>
                <TableCell className="text-muted-foreground">
                  {linha.legado ?? '— (não existia)'}
                </TableCell>
                <TableCell>{linha.acao}</TableCell>
                <TableCell>
                  {linha.atalho ? (
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {shortcutLabel(SHORTCUTS[linha.atalho])}
                    </kbd>
                  ) : (
                    // Linha sem substituto é informação, não buraco: quem procura
                    // o F3 precisa ler que ele não foi remapeado.
                    <span className="text-muted-foreground text-sm">sem tecla equivalente</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{linha.onde}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Painel>

      <Painel titulo="O que o navegador faz com a mesma tecla">
        <div className="flex flex-col gap-3">
          <p className="max-w-prose text-muted-foreground text-sm">
            Conferido na documentação oficial de Chrome e Edge em 28/08/2026. Onde o navegador
            também usa a combinação, o Cabinet a intercepta antes — a tecla faz o que está na tabela
            acima, não o que o navegador faria.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Tecla</TableHead>
                <TableHead scope="col">Chrome</TableHead>
                <TableHead scope="col">Edge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MAPA_DE_ATALHOS.filter((linha) => linha.atalho !== null).map((linha) => (
                <TableRow key={linha.atalho}>
                  <TableCell>
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {linha.atalho && shortcutLabel(SHORTCUTS[linha.atalho])}
                    </kbd>
                  </TableCell>
                  <TableCell className="text-sm">
                    {linha.navegador.chrome ?? 'Não usa esta combinação'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {linha.navegador.edge ?? 'Não usa esta combinação'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="max-w-prose text-muted-foreground text-xs">
            Isto é o que os fabricantes publicam. Extensão instalada, layout de teclado diferente ou
            leitor de tela ligado podem mudar a resposta na sua máquina — se alguma tecla daqui
            fizer outra coisa aí, avise: é exatamente o que estamos querendo saber.
          </p>
        </div>
      </Painel>

      <Painel titulo="Achar um registro">
        <p className="max-w-prose text-muted-foreground text-sm">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            {shortcutLabel(SHORTCUTS.busca)}
          </kbd>{' '}
          — ou o campo de busca no alto da tela — abre a caixa que vai para qualquer tela, inclui
          registro novo e procura cliente, fornecedor, profissional, produto, orçamento e pedido de
          venda. Procura pelo nome, pelo código, pelo CNPJ/CPF e pelo número do documento; a partir
          de três letras, e mostrando os primeiros de cada tipo — quando há mais, a caixa diz
          quantos.
        </p>
      </Painel>
    </div>
  )
}
