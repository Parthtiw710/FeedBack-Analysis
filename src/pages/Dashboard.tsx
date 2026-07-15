"use client"

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSubmissionsFn } from '../server/functions/submission';
import {
  getAnalyticsVolumeFn,
  getAnalyticsNpsFn,
  getAnalyticsScoresFn,
  getAnalyticsPriorityFn,
  getAnalyticsSentimentFn,
  getAnalyticsChurnFn,
  getAnalyticsWinLossFn,
} from '../server/functions/analytics';

import Sidebar from '../partials/Sidebar';
import Header from '../partials/Header';

import {
  DashboardCard01,
  DashboardCard02,
  DashboardCard03,
  DashboardCard04,
  DashboardCard05,
  DashboardCard06,
  DashboardCard07,
  DashboardCard08,
  DashboardCard09,
  DashboardCard10,
  DashboardCard11,
  DashboardCard12,
  DashboardCard13
} from '../components/OverviewCards';
import type { DashboardMetrics } from '../components/OverviewCards';

import {
  SubmissionsView,
  RawDataView,
  NpsView,
  ScoresView,
  CategoriesView,
  PriorityView,
  VolumeView,
  SentimentView,
  ChurnView,
  WinLossView,
  PricingView,
  InsightsView
} from '../components/DashboardViews';
import { DocsView } from '../components/DocsView';

interface DashboardProps {
  view?: string;
}

function Dashboard({ view = 'overview' }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const [volume, nps, scores, priority, sentiment, churn, winloss, submissionsData] = await Promise.all([
        getAnalyticsVolumeFn({ data: {} }),
        getAnalyticsNpsFn({ data: { days: 180 } }),
        getAnalyticsScoresFn({ data: { days: 180 } }),
        getAnalyticsPriorityFn({ data: { days: 180 } }),
        getAnalyticsSentimentFn({ data: { days: 180 } }),
        getAnalyticsChurnFn({ data: { days: 180 } }),
        getAnalyticsWinLossFn({ data: { days: 180 } }),
        getSubmissionsFn({ data: {} }),
      ]);
      return {
        volume: volume as any,
        nps: nps as any,
        scores: scores as any,
        priority: priority as any,
        sentiment: sentiment as any,
        churn: churn as any,
        winloss: winloss as any,
        submissions: { rows: submissionsData.submissions || [] }
      };
    },
    enabled: view === 'overview',
  });

  const getTitle = () => {
    switch (view) {
      case 'overview': return 'Overview Dashboard';
      case 'submissions': return 'Processed Submissions';
      case 'raw': return 'Raw Submissions';
      case 'nps': return 'NPS Score';
      case 'scores': return 'Form Scores';
      case 'categories': return 'Categories';
      case 'priority': return 'Priorities';
      case 'volume': return 'Volume Trend';
      case 'sentiment': return 'Sentiment Breakdown';
      case 'churn': return 'Churn Reasons';
      case 'winloss': return 'Win / Loss Outcomes';
      case 'pricing': return 'Pricing Perceptions';
      case 'insights': return 'AI Insights';
      case 'docs': return 'Developer Documentation';
      default: return 'Dashboard';
    }
  };

  const isTest = typeof window !== 'undefined' ? !localStorage.getItem('token') : true;

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Full-width Yellow banner behind sidebar */}
      {isTest && (
        <div className="absolute top-0 left-0 right-0 bg-[#f3eae0] dark:bg-[#282524] border-b border-[#f3dfc0] dark:border-[#3f3321] text-[#d97706] dark:text-[#f59e0b] text-xs font-semibold px-4 py-2.5 text-center z-30 shrink-0">
          ⚠️ Viewing Simulated / Test Client Environment. Register or sign in via the profile dropdown to manage your own feedback pipelines.
        </div>
      )}

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className={`relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden ${isTest ? 'pt-[38px]' : ''}`}>
        {/* Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow bg-gray-50 dark:bg-gray-900/10">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Dashboard actions */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              {/* Left: Title */}
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{getTitle()}</h1>
              </div>
            </div>

            {/* Dashboard View Routing */}
            {view === 'overview' ? (
              isLoading ? (
                <div className="flex items-center justify-center p-24">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                  <span className="ml-4 text-gray-500 dark:text-gray-400 font-medium">Aggregating real-time feedback metrics...</span>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-6">
                  {/* Card 1 to 13 with live database metric bindings */}
                  <DashboardCard01 metrics={metrics || {}} />
                  <DashboardCard02 metrics={metrics || {}} />
                  <DashboardCard03 metrics={metrics || {}} />
                  <DashboardCard04 metrics={metrics || {}} />
                  <DashboardCard05 metrics={metrics || {}} />
                  <DashboardCard06 metrics={metrics || {}} />
                  <DashboardCard07 metrics={metrics || {}} />
                  <DashboardCard08 metrics={metrics || {}} />
                  <DashboardCard09 metrics={metrics || {}} />
                  <DashboardCard10 metrics={metrics || {}} />
                  <DashboardCard11 metrics={metrics || {}} />
                  <DashboardCard12 metrics={metrics || {}} />
                  <DashboardCard13 metrics={metrics || {}} />
                </div>
              )
            ) : (
              <div className="space-y-6 animate-fadeIn">
                {view === 'submissions' && <SubmissionsView />}
                {view === 'raw' && <RawDataView />}
                {view === 'nps' && <NpsView />}
                {view === 'scores' && <ScoresView />}
                {view === 'categories' && <CategoriesView />}
                {view === 'priority' && <PriorityView />}
                {view === 'volume' && <VolumeView />}
                {view === 'sentiment' && <SentimentView />}
                {view === 'churn' && <ChurnView />}
                {view === 'winloss' && <WinLossView />}
                {view === 'pricing' && <PricingView />}
                {view === 'insights' && <InsightsView />}
                {view === 'docs' && <DocsView />}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;