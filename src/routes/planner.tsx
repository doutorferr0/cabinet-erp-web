import { createFileRoute } from '@tanstack/react-router'
import { PlannerTela } from '@/features/planner/planner'

export const Route = createFileRoute('/planner')({
  component: PlannerTela,
})
