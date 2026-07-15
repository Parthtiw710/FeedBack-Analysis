"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/sentiment')({
  component: SentimentRoute
})

function SentimentRoute() {
  return <Dashboard view="sentiment" />
}
