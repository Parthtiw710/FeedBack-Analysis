"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/churn')({
  component: ChurnRoute
})

function ChurnRoute() {
  return <Dashboard view="churn" />
}
