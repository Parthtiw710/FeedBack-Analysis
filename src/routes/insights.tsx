"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/insights')({
  component: InsightsRoute
})

function InsightsRoute() {
  return <Dashboard view="insights" />
}
