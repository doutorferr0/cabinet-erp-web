# Fase 5 — telas de detalhe de parceiro

## Problema

`$clienteId.tsx`, `$fornecedorId.tsx`, `$profissionalId.tsx` (~220 linhas cada) têm diff
normalizado de ~15 linhas. Comparação real (cliente vs fornecedor):

- Mapeamento DTO→form: `nome`/`cpf` (cliente) vs `razaoSocial`/`nomeFantasia`/`cnpjCpf`
  (fornecedor) — **isso é genuinamente diferente**, cada papel tem campos próprios.
- Query com semente de cache (`['parceiro', id]`), 3 mutations (`gravar`, `incluir`, `vincular`),
  `idDoParceiroExistente`, invalidação + navegação — **byte a byte idêntico** nos três, só troca
  o nome do recurso (`clientes`/`fornecedores`/`profissionais`) e o `role` do `corpoDeInclusao`.
- `CoberturaDaTela`: o bloco de erro + botão "Vincular esta empresa ao cadastro existente" é
  **100% idêntico**; o texto de "Gravar cria…" (caso `isNovo`) também é **100% idêntico** nos
  três (`{nome, documento, e-mail e situação}`); só o texto de "Gravar envia… apenas X" (caso
  edição) muda a lista de campos:
  - cliente: "Nome, CPF/CNPJ, E-mail e Ativo"
  - fornecedor: "Razão Social, Nome Fantasia, CNPJ/CPF, E-mail e Ativo"
  - profissional: "Nome, Nome de Apresentação, CPF/CNPJ, E-mail e Ativo"

Achado colateral: o comentário acima de `clienteDoParceiro`/`profissionalDoParceiro` diz
"Base em `fornecedorVazio`" nos três arquivos — copiado sem trocar o nome da função quando o
arquivo foi duplicado. Corrigir ao mover o comentário para o mapa do papel.

## Reuso

`src/data/parceiros-api.ts` já expõe tudo que a lógica compartilhada precisa: `obterParceiro`,
`atualizarParceiro`, `incluirParceiro`, `vincularParceiro`, `corpoDeEscrita`, `corpoDeInclusao`,
`idDoParceiroExistente`, `useDesativarParceiro`. Não duplicar nada disso — `usar-parceiro.ts`
só orquestra chamadas a essas funções.

## Implementação

```
src/features/parceiro/
  usar-parceiro.ts        # hook com query + 3 mutations + navegação, parametrizado por papel
  cobertura-parceiro.tsx  # o AvisoDeCobertura compartilhado, parametrizado pela lista de campos
  papeis/
    cliente.ts
    fornecedor.ts
    profissional.ts
```

`papeis/cliente.ts` (os outros dois seguem o mesmo shape):

```ts
import type { PartnerDto } from '@/api/gerado'
import type { PapelDeParceiro } from '@/data/parceiros-api'
import { type Cliente, clienteVazio } from '@/mocks/clientes'

export const papelCliente = {
  role: 'customer' as PapelDeParceiro,
  entidade: 'cliente',
  rota: '/cadastros/clientes',
  paramRota: 'clienteId' as const,
  camposDeEdicao: 'Nome, CPF/CNPJ, E-mail e Ativo',
  dtoParaForm(dto: PartnerDto): Cliente {
    return { ...clienteVazio(0), nome: dto.legalName, cpf: dto.document ?? '', email: dto.email ?? '', ativo: dto.active }
  },
  vazio: clienteVazio,
  corpoDeInclusao: (values: Cliente) => ({
    legalName: values.nome, tradeName: null, document: values.cpf, email: values.email, active: values.ativo,
  }),
  corpoDeEscrita: (values: Cliente, linha: PartnerDto) => ({
    legalName: values.nome, tradeName: linha.tradeName, document: values.cpf, email: values.email, active: values.ativo,
  }),
}
```

(o `tradeName: linha.tradeName` do cliente vs `tradeName: values.nomeFantasia` do fornecedor é
exatamente a diferença real — cada papel decide o que faz sentido para o campo que não tem tela.
Copiar o comportamento atual de cada arquivo literalmente, não uniformizar.)

`usar-parceiro.ts`:

```ts
export function usarParceiro<T extends { ativo: boolean }>(papel: PapelDoParceiro<T>, idParam: string) {
  const isNovo = idParam === 'novo'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['parceiro', idParam],
    queryFn: () => obterParceiro(idParam),
    enabled: !isNovo,
  })
  const linha = query.data ?? null

  function aposGravar() {
    return queryClient.invalidateQueries({ queryKey: [papel.rota.split('/').pop()] })
      .then(() => void navigate({ to: papel.rota }))
  }

  const gravar = useMutation({
    mutationFn: (values: T) => {
      if (!linha) throw new Error('Sem a linha da listagem não há o que gravar.')
      return atualizarParceiro(linha.id, corpoDeEscrita(linha, papel.corpoDeEscrita(values, linha)))
    },
    onSuccess: aposGravar,
  })
  const incluir = useMutation({
    mutationFn: (values: T) => incluirParceiro(corpoDeInclusao(papel.role, papel.corpoDeInclusao(values))),
    onSuccess: aposGravar,
  })
  const jaExiste = idDoParceiroExistente(incluir.error)
  const vincular = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => vincularParceiro(id, ativo),
    onSuccess: aposGravar,
  })

  const registro = isNovo ? papel.vazio(0) : linha ? papel.dtoParaForm(linha) : null

  return { query, registro, gravar, incluir, vincular, jaExiste, isNovo }
}
```

(assinatura ilustrativa — ajustar tipos genéricos durante a implementação; o ponto que não pode
mudar é o comportamento: mesma query key, mesma invalidação, mesmo tratamento de 409.)

`cobertura-parceiro.tsx` recebe `camposDeEdicao: string` e reproduz o `CoberturaDaTela` atual
palavra por palavra, só interpolando a lista de campos no branch de edição.

Cada rota (`$clienteId.tsx` etc.) fica reduzida a: `useParams`, `isConsulta`, chamar
`usarParceiro(papelCliente, clienteId)`, os 3 estados de render (skeleton/erro/não encontrado,
iguais aos de hoje) e o JSX do form com `<CoberturaParceiro campos={papelCliente.camposDeEdicao} … />`.

## Pré-requisito — cobrir o ponto cego antes de mexer

`/cadastros/clientes/<id>` (detalhe por id, fora do `/novo`) **não tem teste hoje** — só
`/cadastros/clientes/novo` e a listagem estão cobertos. Fornecedor e Profissional já testam
detalhe por id (`renderRoute('/cadastros/fornecedores/7a1d6f30-…')`,
`renderRoute('/cadastros/profissionais/7a1d6f30-…')`). Antes de tocar em `$clienteId.tsx`,
escrever em `src/features/cliente/cliente-form.test.tsx` um teste espelhando o de fornecedor:
`renderRoute('/cadastros/clientes/<uuid-do-seed>')` esperando o formulário carregado com os
dados do parceiro (usar `parc-0002`, que é o cliente existente no seed do MSW, ou o uuid usado
pelos outros dois testes se o seed for equivalente).

## Verificação

- O teste novo de cliente por id passa **antes** do refactor (contra o código atual) — prova que
  a rota de hoje já funciona e dá uma rede de segurança real para a extração.
- Depois do refactor, os testes de detalhe dos 3 papéis (incluindo o novo de cliente) continuam
  verdes sem alteração no arquivo de teste.
- Fluxo manual: abrir `/cadastros/clientes/parc-0002`, editar e gravar, confirmar invalidação da
  listagem; testar o 409 de documento duplicado (criar cliente com documento já usado por outro
  papel) e o botão "Vincular esta empresa ao cadastro existente".

## Critério de saída

3 rotas de ~220 linhas caem para ~60–80 cada. `usar-parceiro.ts` e `cobertura-parceiro.tsx`
concentram a lógica e o texto compartilhados uma vez. Commits separados: primeiro o teste novo
(`test: cobre detalhe de cliente por id`), depois o refactor
(`refactor: extrai usar-parceiro e cobertura-parceiro`).
