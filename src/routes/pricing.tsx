"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/pricing')({
  component: PricingRoute
})

function PricingRoute() {
  return <Dashboard view="pricing" />
}
