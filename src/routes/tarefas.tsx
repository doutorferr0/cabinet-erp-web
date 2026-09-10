import { createFileRoute } from '@tanstack/react-router'
import { TarefasTela } from '@/features/tarefas/tarefas'

export const Route = createFileRoute('/tarefas')({
  component: TarefasTela,
})
