"use client"

import { Link } from '@tanstack/react-router';
import LineChart01 from '../charts/LineChart01';
import LineChart02 from '../charts/LineChart02';
import BarChart01 from '../charts/BarChart01';
import BarChart02 from '../charts/BarChart02';
import BarChart03 from '../charts/BarChart03';
import DoughnutChart from '../charts/DoughnutChart';
import { chartAreaGradient } from '../charts/ChartjsConfig';
import { adjustColorOpacity, getCssVariable } from '../utils/Utils';

export interface DashboardMetrics {
  volume?: {
    timeSeries: Array<{
      date: string;
      total: number;
      csat?: number;
    }>;
  };
  nps?: {
    npsScore: number | null;
    promoters: number;
    passives: number;
    detractors: number;
  };
  scores?: {
    scores: Array<{
      form_type: string;
      avg_primary: string;
      count: number | string;
      min_primary?: number | string;
      max_primary?: number | string;
    }>;
  };
  priority?: {
    priority: Array<{
      form_type: string;
      priority: string;
      count: number | string;
    }>;
  };
  sentiment?: {
    sentiment: Array<{
      form_type: string;
      sentiment_label: string;
      count: number | string;
    }>;
  };
  submissions?: {
    rows: Array<{
      id: string | number;
      submission_id?: string;
      form_type: string;
      category?: string;
      score_primary?: number | string | null;
      processed_at: string;
    }>;
  };
  churn?: {
    churn: Array<{
      reason: string;
      count: number | string;
    }>;
  };
  winloss?: {
    outcomes: Array<{
      outcome: string;
      count: number | string;
    }>;
  };
}

// Helper to format dates to MM-DD-YYYY for ChartJS parser
const toChartDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${m}-${d}-${y}`;
};

const fmtDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Card 01 - Total Submissions Volume
export function DashboardCard01({ metrics }: { metrics: DashboardMetrics }) {
  const timeSeries = metrics.volume?.timeSeries || [];
  const totalSubmissions = timeSeries.reduce((sum, item) => sum + (item.total || 0), 0);

  const chartData = {
    labels: timeSeries.map(item => toChartDate(item.date)),
    datasets: [
      {
        data: timeSeries.map(item => item.total || 0),
        fill: true,
        backgroundColor: function (context: any) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0.2) }
          ]);
        },
        borderColor: getCssVariable('--color-violet-500'),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.2,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-5 pt-5 pb-4">
        <header className="flex justify-between items-start">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Total Feedback</h2>
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mt-1">Submissions</div>
        <div className="flex items-start mt-2">
          <div className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">{totalSubmissions.toLocaleString()}</div>
        </div>
      </div>
      <div className="grow max-sm:max-h-24 xl:max-h-24">
        {timeSeries.length > 0 && <LineChart01 data={chartData} width={389} height={96} />}
      </div>
    </div>
  );
}

// Card 02 - NPS Score
export function DashboardCard02({ metrics }: { metrics: DashboardMetrics }) {
  const npsScore = metrics.nps?.npsScore;
  const timeSeries = metrics.volume?.timeSeries || [];

  const chartData = {
    labels: timeSeries.map(item => toChartDate(item.date)),
    datasets: [
      {
        data: timeSeries.map(() => npsScore || 0),
        fill: true,
        backgroundColor: function (context: any) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-emerald-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-emerald-500'), 0.2) }
          ]);
        },
        borderColor: getCssVariable('--color-emerald-500'),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-5 pt-5 pb-4">
        <header className="flex justify-between items-start">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">NPS Score</h2>
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mt-1">Loyalty Metric</div>
        <div className="flex items-start mt-2">
          <div className="text-3xl font-extrabold text-emerald-500">{npsScore !== null && npsScore !== undefined ? (npsScore > 0 ? `+${npsScore}` : npsScore) : '—'}</div>
        </div>
      </div>
      <div className="grow max-sm:max-h-24 xl:max-h-24">
        {timeSeries.length > 0 && <LineChart01 data={chartData} width={389} height={96} />}
      </div>
    </div>
  );
}

// Card 03 - Avg CSAT Score
export function DashboardCard03({ metrics }: { metrics: DashboardMetrics }) {
  const csatInfo = metrics.scores?.scores?.find(s => s.form_type === 'csat');
  const avgCsat = csatInfo ? parseFloat(csatInfo.avg_primary).toFixed(1) : '—';
  const timeSeries = metrics.volume?.timeSeries || [];

  const chartData = {
    labels: timeSeries.map(item => toChartDate(item.date)),
    datasets: [
      {
        data: timeSeries.map(item => item.csat || (csatInfo ? parseFloat(csatInfo.avg_primary) : 0)),
        fill: true,
        backgroundColor: function (context: any) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-sky-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-sky-500'), 0.2) }
          ]);
        },
        borderColor: getCssVariable('--color-sky-500'),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-5 pt-5 pb-4">
        <header className="flex justify-between items-start">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Average CSAT</h2>
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mt-1">Satisfaction Rating</div>
        <div className="flex items-start mt-2">
          <div className="text-3xl font-extrabold text-sky-500">{avgCsat}</div>
          {csatInfo && <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-2 ml-2">({csatInfo.count} resp)</div>}
        </div>
      </div>
      <div className="grow max-sm:max-h-24 xl:max-h-24">
        {timeSeries.length > 0 && <LineChart01 data={chartData} width={389} height={96} />}
      </div>
    </div>
  );
}

// Card 04 - Form Type Volume Bar Chart
export function DashboardCard04({ metrics }: { metrics: DashboardMetrics }) {
  const scores = metrics.scores?.scores || [];

  const chartData = {
    labels: scores.map(s => s.form_type),
    datasets: [
      {
        label: 'Submissions count',
        data: scores.map(s => Number(s.count)),
        backgroundColor: getCssVariable('--color-violet-500'),
        hoverBackgroundColor: getCssVariable('--color-violet-600'),
        barPercentage: 0.5,
        categoryPercentage: 0.7,
        borderRadius: 4,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Feedback Volume by Form Channel</h2>
      </header>
      <div className="p-5 grow">
        {scores.length > 0 ? (
          <BarChart01 data={chartData} width={595} height={200} />
        ) : (
          <div className="flex items-center justify-center h-44 text-sm text-gray-400">No score records found.</div>
        )}
      </div>
    </div>
  );
}

// Card 05 - Submission Velocity Line Chart
export function DashboardCard05({ metrics }: { metrics: DashboardMetrics }) {
  const timeSeries = metrics.volume?.timeSeries || [];
  let runningSum = 0;
  const cumulativeData = timeSeries.map((day: any) => {
    runningSum += day.total || 0;
    return runningSum;
  });

  const chartData = {
    labels: timeSeries.map(item => toChartDate(item.date)),
    datasets: [
      {
        label: 'Cumulative Submissions',
        data: cumulativeData,
        borderColor: getCssVariable('--color-emerald-500'),
        fill: false,
        borderWidth: 2,
        tension: 0.2,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Cumulative Feedback Growth</h2>
      </header>
      <div className="p-5 grow">
        {timeSeries.length > 0 ? (
          <LineChart02 data={chartData} width={595} height={200} />
        ) : (
          <div className="flex items-center justify-center h-44 text-sm text-gray-400">No volume time series.</div>
        )}
      </div>
    </div>
  );
}

// Card 06 - NPS Distribution Doughnut Chart
export function DashboardCard06({ metrics }: { metrics: DashboardMetrics }) {
  const nps = metrics.nps || { promoters: 0, passives: 0, detractors: 0 };
  const total = nps.promoters + nps.passives + nps.detractors || 1;

  const chartData = {
    labels: ['Promoters', 'Passives', 'Detractors'],
    datasets: [
      {
        label: 'NPS Ratio',
        data: [
          +((nps.promoters / total) * 100).toFixed(1),
          +((nps.passives / total) * 100).toFixed(1),
          +((nps.detractors / total) * 100).toFixed(1)
        ],
        backgroundColor: [
          getCssVariable('--color-emerald-500'),
          getCssVariable('--color-amber-500'),
          getCssVariable('--color-rose-500')
        ],
        hoverBackgroundColor: [
          getCssVariable('--color-emerald-600'),
          getCssVariable('--color-amber-600'),
          getCssVariable('--color-rose-600')
        ],
        borderWidth: 0,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">NPS Segment Breakdown</h2>
      </header>
      <div className="p-5 grow flex flex-col justify-center">
        {total > 1 || nps.promoters || nps.detractors ? (
          <DoughnutChart data={chartData} width={389} height={200} />
        ) : (
          <div className="flex items-center justify-center h-44 text-sm text-gray-400">No NPS distribution data.</div>
        )}
      </div>
    </div>
  );
}

// Card 07 - Form Types Summary Table
export function DashboardCard07({ metrics }: { metrics: DashboardMetrics }) {
  const scores = metrics.scores?.scores || [];

  return (
    <div className="col-span-full xl:col-span-8 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Channel Performance Metrics</h2>
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                <th className="py-2.5 px-2">Form Type</th>
                <th className="py-2.5 px-2">Submissions</th>
                <th className="py-2.5 px-2">Avg Rating</th>
                <th className="py-2.5 px-2">Min Rating</th>
                <th className="py-2.5 px-2">Max Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-700/55 text-gray-600 dark:text-gray-300 font-mono text-xs">
              {scores.map((s) => (
                <tr key={s.form_type} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                  <td className="py-2.5 px-2 font-sans font-bold text-gray-800 dark:text-gray-100">{s.form_type}</td>
                  <td className="py-2.5 px-2">{s.count}</td>
                  <td className="py-2.5 px-2">
                    <span className="font-sans px-2 py-0.5 rounded-full font-bold bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400">{s.avg_primary}</span>
                  </td>
                  <td className="py-2.5 px-2">{s.min_primary || '—'}</td>
                  <td className="py-2.5 px-2">{s.max_primary || '—'}</td>
                </tr>
              ))}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">No form performance records.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Card 08 - Priorities Trend Line Chart
export function DashboardCard08({ metrics }: { metrics: DashboardMetrics }) {
  const priorities = metrics.priority?.priority || [];
  const forms = [...new Set(priorities.map(p => p.form_type))];

  const criticalCounts = forms.map(f => {
    const row = priorities.find(p => p.form_type === f && p.priority === 'critical');
    return row ? Number(row.count) : 0;
  });

  const highCounts = forms.map(f => {
    const row = priorities.find(p => p.form_type === f && p.priority === 'high');
    return row ? Number(row.count) : 0;
  });

  const chartData = {
    labels: forms,
    datasets: [
      {
        label: 'Critical Priority',
        data: criticalCounts,
        borderColor: getCssVariable('--color-rose-500'),
        borderWidth: 2,
        fill: false,
        tension: 0.2,
      },
      {
        label: 'High Priority',
        data: highCounts,
        borderColor: getCssVariable('--color-amber-500'),
        borderWidth: 2,
        fill: false,
        tension: 0.2,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-8 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Critical & High Priority Distribution</h2>
      </header>
      <div className="p-5 grow">
        {priorities.length > 0 ? (
          <LineChart02 data={chartData} width={595} height={200} />
        ) : (
          <div className="flex items-center justify-center h-44 text-sm text-gray-400">No priority metrics.</div>
        )}
      </div>
    </div>
  );
}

// Card 09 - Sentiment Stacked Bar Chart
export function DashboardCard09({ metrics }: { metrics: DashboardMetrics }) {
  const sentiment = metrics.sentiment?.sentiment || [];
  const forms = [...new Set(sentiment.map(s => s.form_type))];

  const positive = forms.map(f => {
    const row = sentiment.find(s => s.form_type === f && s.sentiment_label === 'positive');
    return row ? Number(row.count) : 0;
  });
  const neutral = forms.map(f => {
    const row = sentiment.find(s => s.form_type === f && s.sentiment_label === 'neutral');
    return row ? Number(row.count) : 0;
  });
  const negative = forms.map(f => {
    const row = sentiment.find(s => s.form_type === f && s.sentiment_label === 'negative');
    return row ? Number(row.count) : 0;
  });

  const chartData = {
    labels: forms,
    datasets: [
      {
        label: 'Positive',
        data: positive,
        backgroundColor: getCssVariable('--color-emerald-500'),
        hoverBackgroundColor: getCssVariable('--color-emerald-600'),
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Neutral',
        data: neutral,
        backgroundColor: getCssVariable('--color-amber-500'),
        hoverBackgroundColor: getCssVariable('--color-amber-600'),
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Negative',
        data: negative,
        backgroundColor: getCssVariable('--color-rose-500'),
        hoverBackgroundColor: getCssVariable('--color-rose-600'),
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Sentiment Ratio by Form Type</h2>
      </header>
      <div className="p-5 grow">
        {sentiment.length > 0 ? (
          <BarChart02 data={chartData} width={595} height={200} />
        ) : (
          <div className="flex items-center justify-center h-44 text-sm text-gray-400">No sentiment logs.</div>
        )}
      </div>
    </div>
  );
}

// Card 10 - Recent Submissions Table
export function DashboardCard10({ metrics }: { metrics: DashboardMetrics }) {
  const rows = metrics.submissions?.rows?.slice(0, 5) || [];

  return (
    <div className="col-span-full xl:col-span-8 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Recent Customer Submissions</h2>
        <Link to="/submissions" className="text-xs font-semibold text-violet-500 hover:text-violet-600">View All</Link>
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 uppercase font-bold">
                <th className="py-2.5 px-2">ID</th>
                <th className="py-2.5 px-2">Channel</th>
                <th className="py-2.5 px-2">Category</th>
                <th className="py-2.5 px-2">Score</th>
                <th className="py-2.5 px-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-700/55 text-gray-600 dark:text-gray-300 font-mono">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                  <td className="py-2.5 px-2 text-gray-400">#{r.submission_id || r.id}</td>
                  <td className="py-2.5 px-2">
                    <span className="font-sans px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-semibold text-gray-700 dark:text-gray-300">{r.form_type}</span>
                  </td>
                  <td className="py-2.5 px-2 text-violet-500 dark:text-violet-400 font-sans font-medium">{r.category || '—'}</td>
                  <td className="py-2.5 px-2">
                    <span className="font-sans px-2 py-0.5 rounded-full font-bold bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400">{r.score_primary ?? '—'}</span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-400">{new Date(r.processed_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">No submissions records.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Card 11 - Churn Reasons Bar Chart
export function DashboardCard11({ metrics }: { metrics: DashboardMetrics }) {
  const churn = metrics.churn?.churn || [];

  const chartData = {
    labels: churn.map(c => c.reason || 'unknown'),
    datasets: [
      {
        label: 'Churn count',
        data: churn.map(c => Number(c.count)),
        backgroundColor: getCssVariable('--color-rose-500'),
        hoverBackgroundColor: getCssVariable('--color-rose-600'),
        barPercentage: 0.5,
        categoryPercentage: 0.7,
        borderRadius: 4,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Primary Churn Drivers</h2>
      </header>
      <div className="p-5 grow">
        {churn.length > 0 ? (
          <BarChart03 data={chartData} width={389} height={200} />
        ) : (
          <div className="flex items-center justify-center h-44 text-sm text-gray-400">No churn driver data.</div>
        )}
      </div>
    </div>
  );
}

// Card 12 - Recent Activity Feed (Timeline)
export function DashboardCard12({ metrics }: { metrics: DashboardMetrics }) {
  const rows = metrics.submissions?.rows?.slice(0, 5) || [];

  return (
    <div className="col-span-full xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">System Activity Stream</h2>
      </header>
      <div className="p-5">
        {rows.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">No activity logged.</div>
        ) : (
          <ul className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
            {rows.map((r) => (
              <li key={r.id} className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-4.5 h-4.5 rounded-full border-2 border-white dark:border-gray-800 bg-violet-500"></div>
                <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-0.5">{fmtDate(r.processed_at)}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Received new <span className="font-bold text-violet-500 dark:text-violet-400">{r.form_type}</span> submission. Primary score of <span className="font-semibold text-gray-800 dark:text-white">{r.score_primary ?? 'N/A'}</span>.
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Card 13 - Win / Loss Deal Outcomes Bar Chart
export function DashboardCard13({ metrics }: { metrics: DashboardMetrics }) {
  const outcomes = metrics.winloss?.outcomes || [];

  const chartData = {
    labels: outcomes.map(o => o.outcome),
    datasets: [
      {
        label: 'Deals Count',
        data: outcomes.map(o => Number(o.count)),
        backgroundColor: outcomes.map(o => o.outcome === 'won' ? getCssVariable('--color-emerald-500') : getCssVariable('--color-rose-500')),
        hoverBackgroundColor: outcomes.map(o => o.outcome === 'won' ? getCssVariable('--color-emerald-600') : getCssVariable('--color-rose-600')),
        barPercentage: 0.5,
        categoryPercentage: 0.7,
        borderRadius: 4,
      }
    ]
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">Win / Loss Distribution</h2>
      </header>
      <div className="p-5 grow">
        {outcomes.length > 0 ? (
          <BarChart03 data={chartData} width={389} height={200} />
        ) : (
          <div className="flex items-center justify-center h-44 text-sm text-gray-400">No win/loss data.</div>
        )}
      </div>
    </div>
  );
}
