import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/cadastros` MORREU como lugar — e morrer calado seria o defeito.
 *
 * A taxonomia não tem mais um grupo "Cadastros": cadastro mora no processo que
 * o usa (auditoria §6; a seção própria de Pessoas e Catálogo é o resto da mesma
 * decisão). A rota-mãe continua existindo porque as filhas continuam —
 * `/cadastros/clientes`, `/cadastros/produtos` e as outras são endereços que
 * operador tem no favorito do navegador e que teste, paleta e barra ainda
 * publicam. O que deixou de fazer sentido é o ÍNDICE: uma tela que dizia
 * "escolha uma opção no menu de Cadastros" para um menu que não tem mais esse
 * grupo.
 *
 * Redireciona para Vendas porque é o processo que consome o cadastro mais
 * pedido (cliente), e leva `?de=cadastros` para o hub poder dizer o que mudou.
 * `replace` de propósito: sem ele, o `Voltar` do navegador cairia aqui de novo e
 * o operador ficaria preso num pingue-pongue entre duas telas.
 */
export const Route = createFileRoute('/cadastros/')({
  beforeLoad: () => {
    throw redirect({ to: '/vendas', search: { de: 'cadastros' }, replace: true })
  },
})
