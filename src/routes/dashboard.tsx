import { createFileRoute } from '@tanstack/react-router'
import { DashboardTela } from '@/features/dashboard/dashboard'

export const Route = createFileRoute('/dashboard')({
  component: DashboardTela,
})
