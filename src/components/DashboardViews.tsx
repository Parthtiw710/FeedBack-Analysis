"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { getProcessedSubmissionsFn, getRawSubmissionsFn, deleteSubmissionFn } from '../server/functions/submission';
import {
  getAnalyticsNpsFn,
  getAnalyticsScoresFn,
  getAnalyticsCategoriesFn,
  getAnalyticsPriorityFn,
  getAnalyticsVolumeFn,
  getAnalyticsSentimentFn,
  getAnalyticsChurnFn,
  getAnalyticsWinLossFn,
  getAnalyticsPricingFn,
} from '../server/functions/analytics';
import { getInsightsFn, runAgentInsightsFn, deleteInsightFn } from '../server/functions/insights';

export const apiCache: Record<string, any> = {};

// Common Helpers
const scoreClass = (v: any) => {
  if (v == null) return 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400';
  const n = Number(v);
  if (n >= 8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (n >= 5) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
};

const segClass = (v: any) => {
  if (!v) return 'bg-gray-100 text-gray-500 dark:bg-gray-700/50';
  const l = String(v).toLowerCase();
  if (l.includes('promot') || l.includes('positive') || l.includes('high') || l.includes('won')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  }
  if (l.includes('detract') || l.includes('negative') || l.includes('critical') || l.includes('lost') || l.includes('too expensive')) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
  }
  if (l.includes('passive') || l.includes('neutral') || l.includes('medium') || l.includes('great value')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  }
  return 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400';
};

const fmtDate = (d: any) => new Date(d).toLocaleString();

const LoadingState = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
    <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading metrics...</span>
  </div>
);

const EmptyState = ({ message = "No data available" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
    <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
    <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
  </div>
);

// Static references to avoid re-creation on render loops
const EMPTY_ARRAY: any[] = [];
const SUBMISSIONS_INITIAL_STATE = { pagination: { pageSize: 17 } };
const RAW_INITIAL_STATE = { pagination: { pageSize: 17 } };

// Form Filter Pills Component
interface FormTypePillsProps {
  formTypes: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

function FormTypePills({ formTypes, activeFilter, onFilterChange }: FormTypePillsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => onFilterChange('all')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeFilter === 'all'
          ? 'bg-violet-500 text-white shadow-sm'
          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
      >
        All Forms
      </button>
      {formTypes.map((ft) => (
        <button
          key={ft}
          onClick={() => onFilterChange(ft)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeFilter === ft
            ? 'bg-violet-500 text-white shadow-sm'
            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}
        >
          {ft}
        </button>
      ))}
    </div>
  );
}

// Payload Formatter Component
function PayloadFormatter({ payload }: { payload: any }) {
  const [isOpen, setIsOpen] = useState(false);
  let data = payload;
  if (typeof payload === 'string') {
    try {
      data = JSON.parse(payload);
    } catch (e) {
      return <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{payload}</span>;
    }
  }

  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return <span className="text-xs text-gray-400 font-mono">—</span>;
  }

  const keys = Object.keys(data);
  const preview = keys.slice(0, 2).join(', ') + (keys.length > 2 ? '...' : '');

  return (
    <div className="text-xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 cursor-pointer hover:text-violet-500 transition duration-150 py-1"
      >
        <svg className={`w-3.5 h-3.5 transform transition-transform ${isOpen ? 'rotate-90 text-violet-500' : 'text-gray-400 dark:text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-mono text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{preview}</span>
        <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{keys.length} fields</span>
      </div>
      {isOpen && (
        <div className="mt-2 pl-4 border-l border-gray-100 dark:border-gray-700 space-y-1.5 max-h-60 overflow-y-auto font-mono bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
          {keys.map((key: string) => {
            const val = data[key];
            let valStr = String(val);
            let valClass = "text-gray-600 dark:text-gray-300";
            if (val === null || val === undefined) {
              valStr = "null";
              valClass = "text-gray-400 italic";
            } else if (typeof val === 'boolean') {
              valClass = val ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold";
            } else if (typeof val === 'number') {
              valClass = "text-amber-500";
            } else if (typeof val === 'object') {
              valStr = JSON.stringify(val, null, 2);
              valClass = "text-blue-400";
            }
            return (
              <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="text-gray-400 dark:text-gray-500 font-medium mr-2">{key}:</span>
                <span className={valClass}>{valStr}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 1. SubmissionsView
export function SubmissionsView() {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(100);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['processedSubmissions', limit],
    queryFn: () => getProcessedSubmissionsFn({ data: { limit } }).then(r => r.processedSubmissions || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSubmissionFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.setQueryData(['processedSubmissions', limit], (old: any[]) => old?.filter(r => r.submission_id !== id && r.id !== id));
      setToastMsg(`Deleted #${id}`);
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  const deleteMutRef = useRef(deleteMut);
  useEffect(() => {
    deleteMutRef.current = deleteMut;
  });

  const handleDelete = useCallback((id: number) => {
    deleteMutRef.current.mutate(id);
  }, []);

  const rows = data ?? EMPTY_ARRAY;

  const formTypes = useMemo(() => {
    return [...new Set(rows.map(r => r.form_type).filter(Boolean))].sort() as string[];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return activeFilter === 'all' ? rows : rows.filter(r => r.form_type === activeFilter);
  }, [rows, activeFilter]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'submission_id', header: 'ID', size: 60,
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-400">#{getValue() as any}</span>
    },
    {
      accessorKey: 'form_type', header: 'Form Type',
      cell: ({ getValue }) => <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">{getValue() as any}</span>
    },
    {
      accessorKey: 'score_primary', header: 'Score',
      cell: ({ getValue }) => { const v = getValue() as any; return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreClass(v)}`}>{v ?? '—'}</span>; }
    },
    {
      accessorKey: 'nps_segment', header: 'NPS / Priority',
      cell: ({ row }) => { const v = row.original.nps_segment || row.original.priority || ''; return v ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${segClass(v)}`}>{v}</span> : <span className="text-gray-400">—</span>; }
    },
    {
      accessorKey: 'category', header: 'Category',
      cell: ({ getValue }) => <span className="font-mono text-xs text-violet-500 dark:text-violet-400">{(getValue() as any) || '—'}</span>
    },
    {
      accessorKey: 'sentiment_label', header: 'Sentiment',
      cell: ({ getValue }) => { const v = getValue() as any; return v ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${segClass(v)}`}>{v}</span> : <span className="text-gray-400">—</span>; }
    },
    {
      accessorKey: 'payload', header: 'Payload', enableSorting: false,
      cell: ({ getValue }) => <PayloadFormatter payload={getValue()} />
    },
    {
      accessorKey: 'processed_at', header: 'Processed At',
      cell: ({ getValue }) => <span className="text-xs text-gray-400">{fmtDate(getValue())}</span>
    },
    {
      id: 'actions', header: '', enableSorting: false,
      cell: ({ row }) => (
        <button onClick={() => { if (window.confirm(`Delete #${row.original.submission_id}?`)) handleDelete(row.original.submission_id); }}
          className="p-1 text-gray-400 hover:text-red-500 transition rounded">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )
    },
  ], [handleDelete]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: SUBMISSIONS_INITIAL_STATE,
  });

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            Processed Submissions
            <span className="text-xs bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
              {table.getFilteredRowModel().rows.length} entries
            </span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Processed fields, scores, sentiment and categorized feedback records.</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search…"
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500 w-40" />
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs font-semibold rounded border border-gray-200 dark:border-gray-600">
            {[50, 100, 250, 500].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {toastMsg && <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-lg">{toastMsg}</div>}

      <FormTypePills formTypes={formTypes} activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {isLoading ? <LoadingState /> : isError ? <EmptyState message="Error loading submissions." /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} className="border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                    {hg.headers.map(h => (
                      <th key={h.id} className="py-3 px-2 whitespace-nowrap select-none"
                        onClick={h.column.getToggleSortingHandler()} style={{ cursor: h.column.getCanSort() ? 'pointer' : 'default' }}>
                        <span className="flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-sm text-gray-600 dark:text-gray-300">
                {table.getRowModel().rows.length === 0
                  ? <tr><td colSpan={columns.length} className="py-12 text-center text-gray-400 text-sm">No submissions found.</td></tr>
                  : table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="py-3 px-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {table.getFilteredRowModel().rows.length} total</span>
            <div className="flex gap-1">
              {(['«', '‹', '›', '»'] as const).map((label, i) => {
                const actions = [() => table.setPageIndex(0), () => table.previousPage(), () => table.nextPage(), () => table.setPageIndex(table.getPageCount() - 1)];
                const disabled = [!table.getCanPreviousPage(), !table.getCanPreviousPage(), !table.getCanNextPage(), !table.getCanNextPage()][i];
                return <button key={label} onClick={actions[i]} disabled={disabled}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition">{label}</button>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// 2. RawDataView
export function RawDataView() {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(100);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rawSubmissions', limit],
    queryFn: () => getRawSubmissionsFn({ data: { limit } }).then(r => r.rows || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSubmissionFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.setQueryData(['rawSubmissions', limit], (old: any[]) => old?.filter(r => r.id !== id));
      setToastMsg(`Deleted #${id}`);
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  const deleteMutRef = useRef(deleteMut);
  useEffect(() => {
    deleteMutRef.current = deleteMut;
  });

  const handleDelete = useCallback((id: number) => {
    deleteMutRef.current.mutate(id);
  }, []);

  const rows = data ?? EMPTY_ARRAY;

  const formTypes = useMemo(() => {
    return [...new Set(rows.map(r => r.form_type).filter(Boolean))].sort() as string[];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return activeFilter === 'all' ? rows : rows.filter(r => r.form_type === activeFilter);
  }, [rows, activeFilter]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'id', header: 'ID', size: 60,
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-400">#{getValue() as any}</span>
    },
    {
      accessorKey: 'form_type', header: 'Form Type',
      cell: ({ getValue }) => <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">{getValue() as any}</span>
    },
    {
      accessorKey: 'payload', header: 'Payload Fields', enableSorting: false,
      cell: ({ getValue }) => <PayloadFormatter payload={getValue()} />
    },
    {
      accessorKey: 'created_at', header: 'Created At',
      cell: ({ getValue }) => <span className="text-xs text-gray-400">{fmtDate(getValue())}</span>
    },
    {
      id: 'actions', header: '', enableSorting: false,
      cell: ({ row }) => (
        <button onClick={() => { if (window.confirm(`Delete raw #${row.original.id}?`)) handleDelete(row.original.id); }}
          className="p-1 text-gray-400 hover:text-red-500 transition rounded">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )
    },
  ], [handleDelete]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: RAW_INITIAL_STATE,
  });

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            Raw Submissions
            <span className="text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {table.getFilteredRowModel().rows.length} rows
            </span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Raw, unprocessed incoming HTTP request payloads enqueued in storage.</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search…"
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-400 w-36" />
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs font-semibold rounded border border-gray-200 dark:border-gray-600">
            {[50, 100, 250, 500].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {toastMsg && <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-lg">{toastMsg}</div>}

      <FormTypePills formTypes={formTypes} activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {isLoading ? <LoadingState /> : isError ? <EmptyState message="Error loading raw submissions." /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} className="border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                    {hg.headers.map(h => (
                      <th key={h.id} className="py-3 px-2 whitespace-nowrap select-none"
                        onClick={h.column.getToggleSortingHandler()} style={{ cursor: h.column.getCanSort() ? 'pointer' : 'default' }}>
                        <span className="flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-sm text-gray-600 dark:text-gray-300">
                {table.getRowModel().rows.length === 0
                  ? <tr><td colSpan={columns.length} className="py-12 text-center text-gray-400 text-sm">No raw submissions found.</td></tr>
                  : table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="py-3 px-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {table.getFilteredRowModel().rows.length} total</span>
            <div className="flex gap-1">
              {(['«', '‹', '›', '»'] as const).map((label, i) => {
                const actions = [() => table.setPageIndex(0), () => table.previousPage(), () => table.nextPage(), () => table.setPageIndex(table.getPageCount() - 1)];
                const disabled = [!table.getCanPreviousPage(), !table.getCanPreviousPage(), !table.getCanNextPage(), !table.getCanNextPage()][i];
                return <button key={label} onClick={actions[i]} disabled={disabled}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition">{label}</button>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// Days Selector Helper
interface DaysSelectorProps {
  days: number;
  onChange: (val: number) => void;
}

function DaysSelector({ days, onChange }: DaysSelectorProps) {
  const options = [
    { value: 30, label: '1 Month' },
    { value: 60, label: '2 Months' },
    { value: 120, label: '4 Months' },
    { value: 180, label: '6 Months' },
    { value: 365, label: '1 Year' }
  ];
  return (
    <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded text-xs font-semibold transition ${days === opt.value
            ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// 3. NpsView
export function NpsView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'nps', days],
    queryFn: () => getAnalyticsNpsFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading NPS data" /></div>;

  const dist = data.distribution || [];
  const P = dist.find((x: any) => x.name === 'Promoters') || { value: 0, pct: 0 };
  const Pa = dist.find((x: any) => x.name === 'Passives') || { value: 0, pct: 0 };
  const D = dist.find((x: any) => x.name === 'Detractors') || { value: 0, pct: 0 };
  const maxV = Math.max(P.value, Pa.value, D.value, 1);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Net Promoter Score (NPS)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customer loyalty analysis and scores distribution breakdown.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <DaysSelector days={days} onChange={setDays} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
          <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">NPS Score</div>
          <div className="text-4xl font-extrabold text-violet-600 dark:text-violet-400 mt-2">{data.npsScore != null ? data.npsScore : '—'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">out of -100 to +100</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
          <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total Responses</div>
          <div className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 mt-2">{data.total || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">within the selected period</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
          <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">NPS Segment Ratio</div>
          <div className="flex justify-center items-center gap-2 mt-4">
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">{P.pct}% Prom</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full">{Pa.pct}% Pass</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-full">{D.pct}% Detr</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Segment Distribution</h3>
        <div className="space-y-3.5">
          {/* Promoters Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
              <span>Promoters (9-10 score)</span>
              <span>{P.value} resp · <span className="text-emerald-500 font-semibold">{P.pct}%</span></span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(P.value / maxV) * 100}%` }}></div>
            </div>
          </div>
          {/* Passives Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
              <span>Passives (7-8 score)</span>
              <span>{Pa.value} resp · <span className="text-amber-500 font-semibold">{Pa.pct}%</span></span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(Pa.value / maxV) * 100}%` }}></div>
            </div>
          </div>
          {/* Detractors Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
              <span>Detractors (0-6 score)</span>
              <span>{D.value} resp · <span className="text-rose-500 font-semibold">{D.pct}%</span></span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(D.value / maxV) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. ScoresView
export function ScoresView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'scores', days],
    queryFn: () => getAnalyticsScoresFn({ data: { days } }),
  });

  const rows = useMemo(() => data?.scores || [], [data]);
  const maxS = useMemo(() => Math.max(...rows.map((r: any) => Number(r.avg_primary) || 0), 1), [rows]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'form_type',
      header: 'Form Type',
      cell: info => <span className="font-sans font-bold text-gray-800 dark:text-gray-100">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'count',
      header: 'Count',
      cell: info => <span>{info.getValue() as any}</span>,
    },
    {
      accessorKey: 'avg_primary',
      header: 'Avg Rating',
      cell: info => {
        const val = info.getValue();
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-sans ${scoreClass(val)}`}>{val !== null && val !== undefined ? val as any : '—'}</span>;
      },
    },
    {
      accessorKey: 'min_primary',
      header: 'Min',
      cell: info => <span>{info.getValue() as any ?? '—'}</span>,
    },
    {
      accessorKey: 'max_primary',
      header: 'Max',
      cell: info => <span>{info.getValue() as any ?? '—'}</span>,
    },
    {
      accessorKey: 'p25',
      header: 'P25',
      cell: info => {
        const val = info.getValue();
        return <span>{val != null ? Number(val).toFixed(1) : '—'}</span>;
      },
    },
    {
      accessorKey: 'p50',
      header: 'P50 (Median)',
      cell: info => {
        const val = info.getValue();
        return <span>{val != null ? Number(val).toFixed(1) : '—'}</span>;
      },
    },
    {
      accessorKey: 'p75',
      header: 'P75',
      cell: info => {
        const val = info.getValue();
        return <span>{val != null ? Number(val).toFixed(1) : '—'}</span>;
      },
    },
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading scores data" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Average Scores by Form</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average ratings/scores mapped across different form channels.</p>
          </div>
          <div className="mt-3 sm:mt-0">
            <DaysSelector days={days} onChange={setDays} />
          </div>
        </div>

        {rows.length === 0 ? <EmptyState message="No scores data available" /> : (
          <div className="space-y-4">
            {rows.map((r: any) => (
              <div key={r.form_type}>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-semibold">
                  <span className="tag-form bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 px-2 py-0.5 rounded text-[11px] font-mono">{r.form_type}</span>
                  <span className="flex items-center gap-2">
                    <span>Avg Score: <strong className="text-gray-800 dark:text-gray-100">{r.avg_primary}</strong></span>
                    <span className="text-gray-400 dark:text-gray-500 text-[10px] font-mono">({r.count} responses)</span>
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(Number(r.avg_primary) / maxS) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase tracking-wider">Statistical Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} className="border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                    {hg.headers.map(h => (
                      <th key={h.id} className="py-2.5 px-2 select-none cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={h.column.getToggleSortingHandler()}>
                        <span className="flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-700/55 text-gray-600 dark:text-gray-300 font-mono text-xs">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="py-3 px-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. CategoriesView
export function CategoriesView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'categories', days],
    queryFn: () => getAnalyticsCategoriesFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading categories" /></div>;

  const cats = data.categories || {};
  const keys = Object.keys(cats);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Category Tag Distributions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Discovered feedback topics categorized automatically via AI tags.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <DaysSelector days={days} onChange={setDays} />
        </div>
      </div>

      {keys.length === 0 ? <EmptyState message="No category data found" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {keys.map((ft: string) => (
            <div key={ft} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-wider font-mono border-b border-gray-200 dark:border-gray-700 pb-2">{ft}</h3>
              <div className="space-y-4">
                {cats[ft].map((r: any) => (
                  <div key={r.category}>
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="text-gray-700 dark:text-gray-300 font-mono">{r.category}</span>
                      <span className="text-gray-500 dark:text-gray-400">{r.count} ({r.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: `${r.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 6. PriorityView
export function PriorityView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'priority', days],
    queryFn: () => getAnalyticsPriorityFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading priority" /></div>;

  const rows = data.priority || [];
  const byForm: Record<string, any[]> = {};
  rows.forEach((r: any) => {
    if (!byForm[r.form_type]) byForm[r.form_type] = [];
    byForm[r.form_type].push(r);
  });
  const keys = Object.keys(byForm);

  const priColor = (p: string) => {
    const l = p.toLowerCase();
    if (l === 'critical' || l === 'high') return 'bg-rose-500';
    if (l === 'medium') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Feedback Priority Breakdown</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Severity levels assigned automatically to incoming support requests.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <DaysSelector days={days} onChange={setDays} />
        </div>
      </div>

      {keys.length === 0 ? <EmptyState message="No priority data found" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {keys.map((ft: string) => {
            const frows = byForm[ft];
            const maxC = Math.max(...frows.map((r: any) => Number(r.count)), 1);
            return (
              <div key={ft} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-wider font-mono border-b border-gray-200 dark:border-gray-700 pb-2">{ft}</h3>
                <div className="space-y-4">
                  {frows.map((r: any) => (
                    <div key={r.priority}>
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-gray-700 dark:text-gray-300 font-mono uppercase tracking-wide">{r.priority}</span>
                        <span className="text-gray-500 dark:text-gray-400 font-bold">{r.count} responses</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${priColor(r.priority)}`} style={{ width: `${(Number(r.count) / maxC) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 7. VolumeView
export function VolumeView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'volume', days],
    queryFn: () => getAnalyticsVolumeFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading volume" /></div>;

  const rows = (data as any).timeSeries || [];
  const selectedRows = rows.slice(-days);
  const maxVal = Math.max(...selectedRows.map((r: any) => Number(r.total || 0)), 1);

  const types = (data as any).formTypes || [];
  const totals: Record<string, number> = {};
  selectedRows.forEach((day: any) => {
    types.forEach((ft: string) => {
      totals[ft] = (totals[ft] || 0) + (day[ft] || 0);
    });
  });
  const sortedTypes = [...types].sort((a: string, b: string) => totals[b] - totals[a]);
  const maxT = Math.max(...Object.values(totals), 1);

  const getDaysLabel = () => {
    if (days === 30) return '1 Month';
    if (days === 60) return '2 Months';
    if (days === 120) return '4 Months';
    if (days === 180) return '6 Months';
    if (days === 365) return '1 Year';
    return `${days} Days`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Submission Volume ({getDaysLabel()})</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Daily submission aggregate volume trend metrics.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <DaysSelector days={days} onChange={setDays} />
          </div>
        </div>

        {selectedRows.length === 0 ? <EmptyState message="No volume data" /> : (
          <div className="flex items-end justify-between h-44 gap-1.5 border-b border-gray-200 dark:border-gray-700 pb-2 px-1">
            {selectedRows.map((r: any) => {
              const val = Number(r.total || 0);
              const pct = (val / maxVal) * 100;
              return (
                <div key={r.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute bottom-full mb-1.5 bg-gray-900 text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 shadow-sm">
                    {r.date}: {val}
                  </div>
                  <div
                    style={{ height: `${Math.max(4, pct * 0.85)}%` }}
                    className="w-full bg-violet-500 hover:bg-violet-600 dark:bg-violet-600/80 dark:hover:bg-violet-500 rounded-t-sm transition-all cursor-pointer"
                  ></div>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-2 font-mono scale-90 sm:scale-100">
                    {r.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase tracking-wider">Volume Breakdown by Form Type</h3>
        {sortedTypes.length === 0 ? <EmptyState message="No form types" /> : (
          <div className="space-y-4">
            {sortedTypes.map((ft: string) => (
              <div key={ft}>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-semibold">
                  <span className="font-mono text-violet-500 dark:text-violet-400">{ft}</span>
                  <span>{totals[ft] || 0} submissions</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((totals[ft] || 0) / maxT) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 8. SentimentView
export function SentimentView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'sentiment', days],
    queryFn: () => getAnalyticsSentimentFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading sentiment" /></div>;

  const rows = data.sentiment || [];
  const byForm: Record<string, any> = {};
  rows.forEach((r: any) => {
    if (!byForm[r.form_type]) byForm[r.form_type] = {};
    byForm[r.form_type][r.sentiment_label] = Number(r.count);
  });
  const keys = Object.keys(byForm);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Sentiment Distribution by Form</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sentiment label breakdown parsed from response commentary text.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <DaysSelector days={days} onChange={setDays} />
        </div>
      </div>

      {keys.length === 0 ? <EmptyState message="No sentiment data available" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {keys.map((ft: string) => {
            const m = byForm[ft];
            const pos = m.positive || 0;
            const neu = m.neutral || 0;
            const neg = m.negative || 0;
            const tot = pos + neu + neg || 1;
            const maxVal = Math.max(pos, neu, neg, 1);
            return (
              <div key={ft} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-wider font-mono border-b border-gray-200 dark:border-gray-700 pb-2">{ft}</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>Positive</span>
                      <span>{pos} resp ({((pos / tot) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(pos / maxVal) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-semibold text-amber-600 dark:text-amber-400">
                      <span>Neutral</span>
                      <span>{neu} resp ({((neu / tot) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(neu / maxVal) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-semibold text-rose-600 dark:text-rose-400">
                      <span>Negative</span>
                      <span>{neg} resp ({((neg / tot) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(neg / maxVal) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 9. ChurnView
export function ChurnView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'churn', days],
    queryFn: () => getAnalyticsChurnFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading churn data" /></div>;

  const rows = data.churn || [];
  const maxC = Math.max(...rows.map((r: any) => Number(r.count)), 1);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Churn Analysis</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Churn reasons gathered from cancellation surveys mapped with ratings.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <DaysSelector days={days} onChange={setDays} />
        </div>
      </div>

      {rows.length === 0 ? <EmptyState message="No churn data available" /> : (
        <div className="space-y-5">
          {rows.map((r: any) => (
            <div key={r.reason || 'unknown'}>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{r.reason || 'unknown'}</span>
                <span className="flex items-center gap-3">
                  <span>Count: <strong className="text-gray-800 dark:text-gray-100">{r.count}</strong></span>
                  <span className="text-gray-400 font-mono">avg csat: {r.avg_satisfaction || '—'}</span>
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(Number(r.count) / maxC) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 10. WinLossView
export function WinLossView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'winloss', days],
    queryFn: () => getAnalyticsWinLossFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading win/loss details" /></div>;

  const maxO = Math.max(...(data.outcomes || []).map((r: any) => Number(r.count)), 1);
  const maxR = Math.max(...(data.lossReasons || []).map((r: any) => Number(r.count)), 1);
  const maxP = Math.max(...(data.pricePerception || []).map((r: any) => Number(r.count)), 1);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Win / Loss Outcomes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Conversion rates and loss reason breakdowns.</p>
          </div>
          <div className="mt-3 sm:mt-0">
            <DaysSelector days={days} onChange={setDays} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
            <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Win Rate</div>
            <div className="text-4xl font-extrabold text-emerald-500 mt-2">{data.winRate != null ? data.winRate + '%' : '—'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
            <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Loss Rate</div>
            <div className="text-4xl font-extrabold text-rose-500 mt-2">{data.lossRate != null ? data.lossRate + '%' : '—'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
            <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total Deals</div>
            <div className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 mt-2">{data.total || 0}</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Outcome Distribution</h3>
          {!(data.outcomes?.length) ? <EmptyState message="No outcomes data available" /> : (
            <div className="space-y-3.5">
              {data.outcomes.map((r: any) => (
                <div key={r.outcome}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-semibold">
                    <span className="capitalize">{r.outcome}</span>
                    <span>{r.count} deals</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.outcome === 'won' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${(Number(r.count) / maxO) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">Loss Reasons</h3>
          {!(data.lossReasons?.length) ? <EmptyState message="No loss reasons recorded" /> : (
            <div className="space-y-4">
              {data.lossReasons.map((r: any) => (
                <div key={r.reason || 'other'}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                    <span className="text-gray-700 dark:text-gray-300 font-sans">{r.reason || 'other'}</span>
                    <span>{r.count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-150 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(Number(r.count) / maxR) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">Deal Price Perception</h3>
          {!(data.pricePerception?.length) ? <EmptyState message="No pricing perception data" /> : (
            <div className="space-y-4">
              {data.pricePerception.map((r: any) => (
                <div key={r.price_perception || 'unknown'}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                    <span className="text-gray-700 dark:text-gray-300 font-sans capitalize">{r.price_perception || 'unknown'}</span>
                    <span>{r.count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-150 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(Number(r.count) / maxP) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 11. PricingView
export function PricingView() {
  const [days, setDays] = useState(180);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'pricing', days],
    queryFn: () => getAnalyticsPricingFn({ data: { days } }),
  });

  if (isLoading) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><LoadingState /></div>;
  if (!data) return <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState message="Error loading pricing details" /></div>;

  const maxPerc = Math.max(...(data.perception || []).map((r: any) => Number(r.count)), 1);
  const maxB = Math.max(...(data.blockers || []).map((r: any) => Number(r.count)), 1);
  const pp = data.pricePoints || {};

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pricing Analytics</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Price sensitivity thresholds, upgrade blockers and perception values.</p>
          </div>
          <div className="mt-3 sm:mt-0">
            <DaysSelector days={days} onChange={setDays} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
            <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Too Expensive At</div>
            <div className="text-4xl font-extrabold text-amber-500 mt-2">${pp.avg_too_expensive || '—'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">average threshold</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
            <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Great Value At</div>
            <div className="text-4xl font-extrabold text-emerald-500 mt-2">${pp.avg_great_value || '—'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">average sweet spot</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
            <div className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Price Responses</div>
            <div className="text-4xl font-extrabold text-blue-500 mt-2">{pp.price_responses || 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">gave price data</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/50 p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">Value Perception</h3>
          {!(data.perception?.length) ? <EmptyState message="No perception data available" /> : (
            <div className="space-y-4">
              {data.perception.map((r: any) => (
                <div key={r.value_perception || 'unknown'}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                    <span className="text-gray-700 dark:text-gray-300 font-sans capitalize">{r.value_perception || 'unknown'}</span>
                    <span>{r.count} responses</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-150 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(Number(r.count) / maxPerc) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/50 p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">Upgrade Blockers</h3>
          {!(data.blockers?.length) ? <EmptyState message="No blockers data available" /> : (
            <div className="space-y-4">
              {data.blockers.filter((r: any) => r.blocker).map((r: any) => (
                <div key={r.blocker}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                    <span className="text-gray-700 dark:text-gray-300 font-sans">{r.blocker}</span>
                    <span>{r.count} responses</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-150 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(Number(r.count) / maxB) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 12. InsightsView
export function InsightsView() {
  const [toastMsg, setToastMsg] = useState<any>(null);
  const queryClient = useQueryClient();

  const isTestClient = typeof window !== 'undefined' ? !localStorage.getItem('token') : true;

  const { data, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => getInsightsFn(),
  });

  const generateMutation = useMutation({
    mutationFn: () => runAgentInsightsFn(),
    onSuccess: (res) => {
      if (res.success) {
        setToastMsg({ text: '✅ AI Insights generated successfully!', type: 'success' });
        queryClient.invalidateQueries({ queryKey: ['insights'] });
      } else {
        setToastMsg({ text: '⚠️ Generation failed', type: 'error' });
      }
    },
    onError: (e: any) => {
      setToastMsg({ text: `❌ ${e.message || 'Server Error triggering insights.'}`, type: 'error' });
    },
    onSettled: () => {
      setTimeout(() => setToastMsg(null), 5000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInsightFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.success) {
        setToastMsg({ text: '✅ AI Insight deleted successfully!', type: 'success' });
        queryClient.invalidateQueries({ queryKey: ['insights'] });
      } else {
        setToastMsg({ text: '⚠️ Deletion failed', type: 'error' });
      }
    },
    onError: (e: any) => {
      setToastMsg({ text: `❌ ${e.message || 'Server Error deleting insight.'}`, type: 'error' });
    },
    onSettled: () => {
      setTimeout(() => setToastMsg(null), 5000);
    }
  });

  const triggerInsights = async () => {
    generateMutation.mutate();
  };

  const handleDeleteInsight = (id: number) => {
    if (window.confirm('Are you sure you want to delete this AI insight?')) {
      deleteMutation.mutate(id);
    }
  };

  const insights = data?.insights || [];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">AI-Generated Insights</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Deep text analysis insights.</p>
        </div>
        <button
          onClick={triggerInsights}
          disabled={generateMutation.isPending || isTestClient}
          className={`mt-3 sm:mt-0 flex items-center justify-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition ${isTestClient
            ? "bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700/60"
            : "bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 cursor-pointer"
            }`}
          title={isTestClient ? "AI insight generation is disabled in the simulated test environment" : "Generate AI Insights"}
        >
          {generateMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C8.29 12.42 7 10.78 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.78-1.29 3.42-3.15 4.1z" />
              </svg>
              {isTestClient ? "Disabled in Test Env" : "Generate AI Insights"}
            </>
          )}
        </button>
      </div>

      {toastMsg && (
        <div className={`mb-4 p-3 text-xs font-semibold rounded-lg ${toastMsg.type === 'success'
          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
          }`}>
          {toastMsg.text}
        </div>
      )}

      {isLoading ? <LoadingState /> : insights.length === 0 ? (
        <EmptyState message="No insights generated yet. Click the button above to synthesize data." />
      ) : (
        <div className="space-y-4">
          {insights.map((i: any, idx: number) => {
            const rawContent = i.content || {};
            // Handle both nested and flat structures dynamically
            const payload = rawContent.content || rawContent || {};

            const summary = payload.summary;
            const nps_analysis = payload.nps_analysis;
            const recommendations = payload.recommendations;
            const per_form_type = payload.per_form_type;

            const priorityScore = rawContent.priority_score ?? i.priority_score ?? 0.5;
            const insightType = i.insight_type ?? rawContent.insight_type ?? 'Insight';

            return (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Clean Header with Insight Type and Priority Alert */}
                <div className="bg-gray-50 dark:bg-gray-800/60 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${segClass(insightType)}`}>
                    {insightType}
                  </span>

                  {/* Alert Priority Meter & Delete Button */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Alert Priority:</span>
                      <div className="w-20 bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700/40">
                        <div
                          className={`h-full rounded-full ${priorityScore > 0.7
                            ? 'bg-rose-500'
                            : priorityScore > 0.4
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            }`}
                          style={{ width: `${(priorityScore || 0.5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">
                        {Math.round((priorityScore || 0.5) * 100)}%
                      </span>
                    </div>

                    <button
                      onClick={() => !isTestClient && handleDeleteInsight(i.id)}
                      disabled={isTestClient}
                      className={`p-1 transition rounded ${
                        isTestClient
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40"
                          : "text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
                      }`}
                      title={isTestClient ? "AI insight deletion is disabled in the simulated test environment" : "Delete AI Insight"}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Server warning/notice for low submissions count */}
                  {rawContent.system_message && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs font-semibold flex items-center gap-2.5">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{rawContent.system_message}</span>
                    </div>
                  )}

                  {/* Headline Banner */}
                  {summary?.headline && (
                    <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-5 rounded-xl border border-violet-500/20">
                      <h4 className="text-base font-extrabold text-violet-700 dark:text-violet-400 flex items-center gap-2.5">
                        <svg className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        <span>{summary.headline}</span>
                      </h4>
                    </div>
                  )}

                  {/* Main Content Grid: Left Highlights, Right NPS */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Key Highlights */}
                    <div className="lg:col-span-7 space-y-3">
                      <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Key Executive Highlights
                      </h5>
                      {summary?.key_points && Array.isArray(summary.key_points) ? (
                        <ul className="space-y-2.5">
                          {summary.key_points.map((pt: any, pIdx: number) => (
                            <li key={pIdx} className="flex items-start gap-3">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                                {pt}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-gray-400 italic">No key highlights.</div>
                      )}
                    </div>

                    {/* NPS Rating & Comments */}
                    <div className="lg:col-span-5 space-y-3 bg-gray-50/50 dark:bg-gray-900/10 p-4.5 rounded-xl border border-gray-100 dark:border-gray-800/40 flex flex-col justify-between">
                      <div>
                        <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                          NPS Analysis
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic font-medium leading-relaxed">
                          "{nps_analysis?.commentary || 'No specific NPS analysis comments logged.'}"
                        </p>
                      </div>
                      <div className="flex items-center gap-3 border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-3">
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Average NPS Rating:</span>
                        <span className="text-xl font-extrabold text-emerald-500">
                          {nps_analysis?.overall_score !== undefined ? nps_analysis.overall_score : '—'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium font-mono">/ 10</span>
                      </div>
                    </div>
                  </div>

                  {/* Channel Trends */}
                  {per_form_type && Object.keys(per_form_type).length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Form Channels Performance & Trends
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(per_form_type).map(([form, item]: [string, any], fIdx: number) => {
                          const trendClasses: Record<string, string> = {
                            up: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
                            down: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
                            stable: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 border-gray-200/50 dark:border-gray-700/50'
                          };
                          const currentClass = trendClasses[item.trend] || trendClasses.stable;
                          return (
                            <div key={fIdx} className={`p-4 rounded-xl border ${currentClass} flex flex-col justify-between space-y-3`}>
                              <div>
                                <span className="font-bold text-xs uppercase tracking-wider">{form}</span>
                                <p className="text-xs mt-1.5 opacity-90 leading-relaxed font-medium">{item.summary}</p>
                              </div>
                              <div className="flex items-center gap-2 font-bold text-[9px] uppercase tracking-wider pt-2 border-t border-current/10">
                                {item.trend === 'up' && (
                                  <>
                                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span>Trend: Upward</span>
                                  </>
                                )}
                                {item.trend === 'down' && (
                                  <>
                                    <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                                    </svg>
                                    <span>Trend: Downward</span>
                                  </>
                                )}
                                {item.trend === 'stable' && (
                                  <>
                                    <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                    <span>Trend: Stable</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {recommendations && Array.isArray(recommendations) && recommendations.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Suggested Recommendations & Actions
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommendations.map((rec: any, rIdx: number) => (
                          <div key={rIdx} className="flex gap-4 p-4.5 bg-gray-50/50 dark:bg-gray-900/10 rounded-xl border border-gray-150 dark:border-gray-700/60 shadow-2xs">
                            <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {rIdx + 1}
                            </div>
                            <div>
                              <h6 className="text-xs font-bold text-gray-700 dark:text-gray-200">{rec.title}</h6>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal font-medium">{rec.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
