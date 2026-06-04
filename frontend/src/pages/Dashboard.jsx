import React, { useState, useEffect } from 'react';

import Sidebar from '../partials/Sidebar';
import Header from '../partials/Header';
import FilterButton from '../components/DropdownFilter';
import Datepicker from '../components/Datepicker';

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

function Dashboard({ view = 'overview' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    volume: null,
    nps: null,
    scores: null,
    priority: null,
    sentiment: null,
    churn: null,
    winloss: null,
    submissions: null,
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

  useEffect(() => {
    if (view !== 'overview') return;
    
    let isMounted = true;
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const [volume, nps, scores, priority, sentiment, churn, winloss, submissions] = await Promise.all([
          fetch('/analytics/volume').then(r => r.json()),
          fetch('/analytics/nps?days=30').then(r => r.json()),
          fetch('/analytics/scores?days=30').then(r => r.json()),
          fetch('/analytics/priority?days=30').then(r => r.json()),
          fetch('/analytics/sentiment?days=30').then(r => r.json()),
          fetch('/analytics/churn?days=30').then(r => r.json()),
          fetch('/analytics/winloss?days=30').then(r => r.json()),
          fetch('/submissions').then(r => r.json()),
        ]);

        if (isMounted) {
          setMetrics({ volume, nps, scores, priority, sentiment, churn, winloss, submissions });
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading overview metrics:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchOverviewData();
    return () => { isMounted = false; };
  }, [view]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {!localStorage.getItem('token') && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs font-semibold px-4 py-2.5 text-center z-40 shrink-0">
            ⚠️ Viewing Simulated / Test Client Environment. Register or sign in via the profile dropdown to manage your own feedback pipelines.
          </div>
        )}
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

              {/* Right: Actions (Only on Overview) */}
              {view === 'overview' && (
                <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                  <FilterButton align="right" />
                  <Datepicker align="right" />
                </div>
              )}
            </div>

            {/* Dashboard View Routing */}
            {view === 'overview' ? (
              loading ? (
                <div className="flex items-center justify-center p-24">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                  <span className="ml-4 text-gray-500 dark:text-gray-400 font-medium">Aggregating real-time feedback metrics...</span>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-6">
                  {/* Card 1 to 13 with live database metric bindings */}
                  <DashboardCard01 metrics={metrics} />
                  <DashboardCard02 metrics={metrics} />
                  <DashboardCard03 metrics={metrics} />
                  <DashboardCard04 metrics={metrics} />
                  <DashboardCard05 metrics={metrics} />
                  <DashboardCard06 metrics={metrics} />
                  <DashboardCard07 metrics={metrics} />
                  <DashboardCard08 metrics={metrics} />
                  <DashboardCard09 metrics={metrics} />
                  <DashboardCard10 metrics={metrics} />
                  <DashboardCard11 metrics={metrics} />
                  <DashboardCard12 metrics={metrics} />
                  <DashboardCard13 metrics={metrics} />
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