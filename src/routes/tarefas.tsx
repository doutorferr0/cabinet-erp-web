import { TarefasTela } from '@/features/tarefas/tarefas'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tarefas')({
  component: TarefasTela,
})
