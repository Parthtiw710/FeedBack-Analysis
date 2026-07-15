"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/winloss')({
  component: WinlossRoute
})

function WinlossRoute() {
  return <Dashboard view="winloss" />
}
