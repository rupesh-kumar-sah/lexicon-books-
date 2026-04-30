import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ChevronRight, ChevronDown, Database, Table2, Columns2 as Columns, ShieldAlert, Loader as Loader2, Copy, Check, Trash2, Clock, Rows2 as RowsIcon, CircleAlert as AlertCircle, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../lib/api';
import { cn } from '../lib/utils';

interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number | null;
  fields: { name: string; dataTypeID: number }[];
  duration: number;
  command: string;
}

interface TableInfo {
  name: string;
  columns?: { column_name: string; data_type: string; is_nullable: string }[];
  expanded?: boolean;
}

const HISTORY_KEY = 'lexiconn_sql_history';
const MAX_HISTORY = 20;

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(queries: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(queries.slice(0, MAX_HISTORY)));
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export default function SqlEditor() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [sql, setSql] = useState('SELECT * FROM books LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<{ tables: string[] }>('/api/sql/tables')
      .then(({ tables: names }) => setTables(names.map((n) => ({ name: n }))))
      .catch(() => {})
      .finally(() => setTablesLoading(false));
  }, [isAdmin]);

  const loadColumns = async (tableName: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.name === tableName ? { ...t, expanded: !t.expanded } : t
      )
    );
    const target = tables.find((t) => t.name === tableName);
    if (!target || target.columns) return;
    try {
      const { columns } = await apiRequest<{ columns: any[] }>(
        `/api/sql/tables/${tableName}/columns`
      );
      setTables((prev) =>
        prev.map((t) => (t.name === tableName ? { ...t, columns } : t))
      );
    } catch {}
  };

  const runQuery = useCallback(async () => {
    const query = sql.trim();
    if (!query || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiRequest<QueryResult>('/api/sql/execute', {
        method: 'POST',
        body: JSON.stringify({ sql: query }),
      });
      setResult(data);
      const newHistory = [query, ...history.filter((h) => h !== query)];
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [sql, running, history]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = sql.substring(0, start) + '  ' + sql.substring(end);
      setSql(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const copyResults = () => {
    if (!result) return;
    const header = result.fields.map((f) => f.name).join('\t');
    const rows = result.rows.map((r) => result.fields.map((f) => r[f.name] ?? '').join('\t'));
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white text-center p-12">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h1>
        <p className="text-slate-500 max-w-sm mb-8">Admin access is required to use the SQL editor.</p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Schema</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {tablesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          ) : (
            tables.map((table) => (
              <div key={table.name}>
                <button
                  onClick={() => loadColumns(table.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group text-left"
                >
                  {table.expanded ? (
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                  <Table2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700 truncate">
                    {table.name}
                  </span>
                </button>
                <AnimatePresence>
                  {table.expanded && table.columns && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 mb-1 space-y-0.5">
                        {table.columns.map((col) => (
                          <div
                            key={col.column_name}
                            className="flex items-center gap-2 px-3 py-1.5 rounded text-left"
                          >
                            <Columns className="w-3 h-3 text-slate-300 shrink-0" />
                            <span className="text-[11px] text-slate-500 truncate">{col.column_name}</span>
                            <span className="text-[10px] text-slate-300 ml-auto shrink-0 font-mono">
                              {col.data_type.replace('character varying', 'varchar').slice(0, 10)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={runQuery}
            disabled={running || !sql.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-sm shadow-blue-500/20"
          >
            {running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Run
          </button>

          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">
            Ctrl+Enter to run
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowHistory((s) => !s)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                showHistory
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={() => setSql('')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* History panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden bg-slate-800 border-b border-slate-700 shrink-0"
            >
              <div className="p-4 max-h-48 overflow-y-auto space-y-1">
                {history.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">No queries yet.</p>
                ) : (
                  history.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSql(q);
                        setShowHistory(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-xs font-mono text-slate-300 line-clamp-1">{q}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor */}
        <div className="bg-slate-900 shrink-0 relative" style={{ minHeight: '200px', maxHeight: '40%' }}>
          <textarea
            ref={textareaRef}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="w-full h-full bg-transparent text-slate-100 font-mono text-sm p-5 resize-none outline-none leading-relaxed"
            style={{ minHeight: '200px', maxHeight: '100%' }}
            placeholder="-- Write your SQL query here&#10;-- Press Ctrl+Enter to run"
          />
          <div className="absolute bottom-3 right-4 text-[10px] text-slate-600 font-mono pointer-events-none">
            {sql.length} chars
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-rose-50 border-b border-rose-200 px-5 py-4 shrink-0"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <pre className="text-xs text-rose-700 font-mono whitespace-pre-wrap">{error}</pre>
            </motion.div>
          )}

          {result && (
            <>
              {/* Status bar */}
              <div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-bold uppercase tracking-widest">{result.command}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <RowsIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{result.rowCount ?? result.rows.length} rows</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{result.duration}ms</span>
                </div>
                {result.rows.length > 0 && (
                  <button
                    onClick={copyResults}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    {copied ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy TSV</>
                    )}
                  </button>
                )}
              </div>

              {/* Table */}
              {result.rows.length > 0 ? (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-slate-400 font-bold uppercase tracking-widest text-[10px] w-10 text-right border-r border-slate-200">
                          #
                        </th>
                        {result.fields.map((f) => (
                          <th
                            key={f.name}
                            className="px-4 py-2.5 text-slate-600 font-bold uppercase tracking-widest text-[10px] whitespace-nowrap border-r border-slate-200 last:border-r-0"
                          >
                            {f.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-2 text-slate-300 font-mono text-right border-r border-slate-100 select-none">
                            {ri + 1}
                          </td>
                          {result.fields.map((f) => {
                            const val = row[f.name];
                            const display =
                              val === null
                                ? 'NULL'
                                : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val);
                            return (
                              <td
                                key={f.name}
                                className={cn(
                                  'px-4 py-2 font-mono border-r border-slate-100 last:border-r-0 max-w-xs truncate',
                                  val === null
                                    ? 'text-slate-300 italic'
                                    : typeof val === 'number'
                                    ? 'text-blue-700'
                                    : typeof val === 'boolean'
                                    ? 'text-amber-600'
                                    : 'text-slate-800'
                                )}
                                title={display}
                              >
                                {display}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <div className="text-4xl mb-3">✓</div>
                    <p className="text-sm font-medium">Query executed successfully</p>
                    <p className="text-xs text-slate-300 mt-1">{result.rowCount ?? 0} rows affected</p>
                  </div>
                </div>
              )}
            </>
          )}

          {!result && !error && !running && (
            <div className="flex-1 flex items-center justify-center text-slate-300">
              <div className="text-center space-y-3">
                <Database className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm font-medium">Run a query to see results</p>
                <p className="text-xs">Press Ctrl+Enter or click Run</p>
              </div>
            </div>
          )}

          {running && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Executing query...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
