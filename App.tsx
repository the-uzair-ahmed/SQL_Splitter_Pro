
import React, { useState, useCallback, useMemo } from 'react';
import { 
  FileUp, 
  Settings, 
  Download, 
  RefreshCcw, 
  AlertCircle, 
  Search, 
  Database, 
  CheckCircle2,
  ChevronRight,
  Info,
  Archive,
  Eye,
  FileCode,
  ShieldCheck,
  Zap,
  Layers
} from 'lucide-react';
import { SQLState, AppMode, SplitMode, PartResult, TableBlock } from './types';
import { processUploadedFile, generateAssignments, buildPartFiles, formatBytes } from './services/sqlProcessor';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Access JSZip from the window (loaded via script tag in index.html)
declare var JSZip: any;

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('UPLOAD');
  const [error, setError] = useState<string | null>(null);
  const [sqlState, setSqlState] = useState<SQLState | null>(null);
  const [partsCount, setPartsCount] = useState(2);
  const [splitMode, setSplitMode] = useState<SplitMode>(SplitMode.AUTO);
  const [injectDrop, setInjectDrop] = useState(true);
  const [manualAssignments, setManualAssignments] = useState<Record<string, number>>({});
  const [results, setResults] = useState<PartResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTable, setPreviewTable] = useState<TableBlock | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const state = await processUploadedFile(file);
      setSqlState(state);
      const init: Record<string, number> = {};
      state.tables.forEach(t => init[t.name] = 1);
      setManualAssignments(init);
      setMode('CONFIGURE');
    } catch (err: any) {
      setError(err.message || 'Failed to process SQL file. Ensure the file has standard structure markers.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!sqlState) return;
    setIsLoading(true);
    
    setTimeout(() => {
      try {
        const assignments = generateAssignments(sqlState.tables, partsCount, splitMode, manualAssignments);
        const partResults = buildPartFiles(sqlState, assignments, partsCount, injectDrop);
        setResults(partResults);
        setMode('RESULTS');
      } catch (err: any) {
        setError(err.message || 'Generation failed.');
      } finally {
        setIsLoading(false);
      }
    }, 150);
  };

  const downloadZip = async () => {
    if (results.length === 0) return;
    const zip = new JSZip();
    results.forEach(res => {
      zip.file(res.fileName, res.content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sqlState?.fileName || 'sql_parts'}_all.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setSqlState(null);
    setResults([]);
    setMode('UPLOAD');
    setError(null);
    setSearchQuery('');
  };

  const filteredTables = useMemo(() => {
    if (!sqlState) return [];
    return sqlState.tables.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sqlState, searchQuery]);

  const distributionData = useMemo(() => {
    if (!sqlState || mode !== 'CONFIGURE') return [];
    const assignments = generateAssignments(sqlState.tables, partsCount, splitMode, manualAssignments);
    const bins = Array.from({ length: partsCount }, (_, i) => ({
      name: `Part ${i + 1}`,
      size: 0,
      tables: 0
    }));

    sqlState.tables.forEach(t => {
      const p = (assignments[t.name] || 1) - 1;
      bins[p].size += t.size;
      bins[p].tables += 1;
    });

    return bins;
  }, [sqlState, partsCount, splitMode, manualAssignments, mode]);

  return (
    <div className="min-h-screen pb-12 transition-colors duration-500">
      {/* Semantic Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
              <Database size={22} aria-hidden="true" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">SQL Splitter Pro</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6" aria-label="Progress">
            <StepIndicator active={mode === 'UPLOAD'} completed={mode !== 'UPLOAD'} label="Upload" index={1} />
            <ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
            <StepIndicator active={mode === 'CONFIGURE'} completed={mode === 'RESULTS'} label="Configure" index={2} />
            <ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
            <StepIndicator active={mode === 'RESULTS'} completed={false} label="Export" index={3} />
          </div>

          <button 
            onClick={reset}
            className="text-sm font-semibold text-slate-400 hover:text-indigo-600 flex items-center gap-2 transition-all px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            <span className="hidden sm:inline">New Split</span>
          </button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {error && (
          <div role="alert" className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 text-red-800 animate-in fade-in slide-in-from-top-4">
            <div className="bg-red-100 p-2 rounded-full text-red-600">
              <AlertCircle size={20} aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">Process Error</h4>
              <p className="text-sm opacity-90 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* UPLOAD VIEW */}
        {mode === 'UPLOAD' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <section className="max-w-3xl mx-auto mt-16 text-center">
              <div className="mb-10">
                <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest mb-4">Fast & Private Splitter</span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                  Partition Large SQL <span className="text-indigo-600">Intelligently.</span>
                </h1>
                <p className="text-slate-500 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
                  The ultimate web tool to break massive database dumps into manageable chunks without breaking your tables. 
                  Optimized for speed and privacy.
                </p>
              </div>
              
              <label className="relative group block cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 group-hover:border-indigo-400 bg-white rounded-[2rem] p-16 shadow-2xl shadow-slate-200/50 transition-all duration-500 group-hover:shadow-indigo-100/50">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-0">
                      <FileUp className="text-white" size={48} aria-hidden="true" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-3">
                      {isLoading ? 'Reading your database...' : 'Drop your SQL file here'}
                    </div>
                    <p className="text-slate-400 text-base max-w-md mx-auto">
                      Select a <strong>.sql</strong> or <strong>.sql.gz</strong> file to begin chunking.
                    </p>
                  </div>
                  {isLoading && (
                    <div className="absolute inset-0 bg-white/90 rounded-[2rem] flex flex-col items-center justify-center z-10">
                      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="font-bold text-indigo-900 animate-pulse">Analyzing Tables...</p>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".sql,.gz" 
                  onChange={handleFileUpload} 
                  disabled={isLoading}
                />
              </label>

              <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
                <HeroFeature 
                  icon={<Database className="text-indigo-600" size={24}/>}
                  title="Table Consistency" 
                  desc="Guarantees each table stays atomic. No rows split between parts."
                />
                <HeroFeature 
                  icon={<Settings className="text-violet-600" size={24}/>}
                  title="Smart Balancing" 
                  desc="Greedy bin-packing logic ensures optimal file size distribution."
                />
                <HeroFeature 
                  icon={<CheckCircle2 className="text-emerald-600" size={24}/>}
                  title="Safe Import" 
                  desc="Optional DROP TABLE injection to prevent 'Already Exists' errors."
                />
              </div>
            </section>

            {/* SEO Content Section */}
            <section className="mt-32 max-w-5xl mx-auto border-t border-slate-200 pt-20 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                <article>
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">Why use SQL Splitter Pro?</h2>
                  <div className="space-y-6 text-slate-600 leading-relaxed">
                    <p>
                      Large SQL dumps often exceed PHP upload limits or cause database timeouts during import. 
                      <strong>SQL Splitter Pro</strong> provides a professional solution to divide these massive files 
                      into small, importable segments without requiring any server-side software.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex gap-3">
                        <Zap size={20} className="text-indigo-600 shrink-0" />
                        <span><strong>100% Client-Side:</strong> Your database data never leaves your browser, ensuring total privacy.</span>
                      </li>
                      <li className="flex gap-3">
                        <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                        <span><strong>GZip Support:</strong> Directly process compressed .sql.gz files to save time and bandwidth.</span>
                      </li>
                      <li className="flex gap-3">
                        <Layers size={20} className="text-violet-600 shrink-0" />
                        <span><strong>Smart Bin-Packing:</strong> Automatically distributes tables based on size to create equal parts.</span>
                      </li>
                    </ul>
                  </div>
                </article>

                <article className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Common Questions (FAQ)</h3>
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2">How do I split a 1GB SQL file?</h4>
                      <p className="text-sm text-slate-500">Simply drag and drop your 1GB file into the uploader. Our tool parses the table boundaries and allows you to split it into 10 or 20 parts ready for import.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2">Will my foreign keys break?</h4>
                      <p className="text-sm text-slate-500">We recommend importing parts in sequential order. Each part includes the original SQL header to maintain session variables and constraints.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2">Is there a file size limit?</h4>
                      <p className="text-sm text-slate-500">The limit depends on your browser's available memory. For files larger than 500MB, we recommend using a modern browser like Chrome or Edge.</p>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>
        )}

        {/* CONFIGURE VIEW */}
        {mode === 'CONFIGURE' && sqlState && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in zoom-in-95 duration-500">
            {/* Left Sidebar: Controls */}
            <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Settings size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Configuration</h3>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Number of Parts</label>
                      <span className="text-lg font-black text-indigo-600">{partsCount}</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="20" 
                      value={partsCount} 
                      onChange={(e) => setPartsCount(parseInt(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Assignment Logic</label>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => setSplitMode(SplitMode.AUTO)}
                        className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${splitMode === SplitMode.AUTO ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${splitMode === SplitMode.AUTO ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                          <RefreshCcw size={18} />
                        </div>
                        <div>
                          <div className="font-bold">Auto-Balance</div>
                          <div className={`text-xs ${splitMode === SplitMode.AUTO ? 'text-indigo-100' : 'text-slate-400'}`}>Smart size-based logic.</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => setSplitMode(SplitMode.MANUAL)}
                        className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${splitMode === SplitMode.MANUAL ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${splitMode === SplitMode.MANUAL ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                          <Settings size={18} />
                        </div>
                        <div>
                          <div className="font-bold">Manual Select</div>
                          <div className={`text-xs ${splitMode === SplitMode.MANUAL ? 'text-indigo-100' : 'text-slate-400'}`}>You pick per table.</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/50">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={injectDrop} 
                        onChange={(e) => setInjectDrop(e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900 block mb-1">Inject DROP TABLE</span>
                        <span className="text-xs text-slate-500 leading-normal block">Ensures existing tables are cleared before re-creation.</span>
                      </div>
                    </label>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                  >
                    Start Splitting
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Data Distribution Card */}
              <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-8 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Info size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Size Estimates</h3>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData}>
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                        formatter={(val: number) => [formatBytes(val), 'Size']}
                      />
                      <Bar dataKey="size" radius={[6, 6, 0, 0]}>
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#8b5cf6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </aside>

            {/* Main Content: Table Manager */}
            <section className="lg:col-span-8 bg-white rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col min-h-[700px]">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Table Manager</h2>
                  <p className="text-slate-500 font-medium">Dividing <span className="text-indigo-600 font-bold">{sqlState.tables.length}</span> tables</p>
                </div>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search tables..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none w-full sm:w-72 font-medium"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10">
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                      <th className="pl-8 py-5">Table Definition</th>
                      <th className="px-6 py-5 text-center">Size</th>
                      <th className="pr-8 py-5 text-right">Destination</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTables.map((table) => (
                      <tr key={table.name} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                              <FileCode size={16} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-bold text-slate-900">{table.name}</span>
                              <button 
                                onClick={() => setPreviewTable(table)}
                                className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 mt-0.5 uppercase tracking-wider"
                              >
                                <Eye size={10} /> View SQL
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center text-sm font-bold text-slate-600">
                          {formatBytes(table.size)}
                        </td>
                        <td className="pr-8 py-5 text-right">
                          <select 
                            value={manualAssignments[table.name] || 1}
                            onChange={(e) => setManualAssignments(prev => ({ ...prev, [table.name]: parseInt(e.target.value) }))}
                            disabled={splitMode === SplitMode.AUTO}
                            className={`text-sm py-2.5 px-4 rounded-xl border-2 font-bold outline-none transition-all ${splitMode === SplitMode.AUTO ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-white text-slate-900 border-slate-200 hover:border-indigo-300 shadow-sm'}`}
                          >
                            {Array.from({ length: partsCount }, (_, i) => (
                              <option key={i + 1} value={i + 1}>Part {i + 1}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* RESULTS VIEW */}
        {mode === 'RESULTS' && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <section className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-[1.5rem] text-emerald-600 mb-6 shadow-xl shadow-emerald-100 scale-110">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Split Complete</h2>
              <p className="text-slate-500 text-lg font-medium">Successfully generated {results.length} ready-to-import SQL parts.</p>
              
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button 
                  onClick={downloadZip}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
                >
                  <Archive size={20} />
                  Download Bundle (.ZIP)
                </button>
                <button 
                  onClick={reset}
                  className="bg-white hover:bg-slate-50 text-slate-900 px-8 py-4 rounded-2xl font-bold border-2 border-slate-200 flex items-center gap-3 transition-all"
                >
                  <RefreshCcw size={18} />
                  Start Over
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((res) => (
                <div key={res.partNumber} className="bg-white rounded-[2rem] p-8 border-2 border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 -z-0"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
                        {res.partNumber}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900">{formatBytes(res.size)}</div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{res.tableCount} Tables</div>
                      </div>
                    </div>
                    
                    <div className="mb-8">
                      <h4 className="font-mono text-sm text-slate-800 break-all font-bold line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100">{res.fileName}</h4>
                    </div>

                    <a 
                      href={URL.createObjectURL(res.content)} 
                      download={res.fileName}
                      className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white hover:bg-indigo-600 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg"
                    >
                      <Download size={18} />
                      Download SQL
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <footer className="mt-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-12 text-white shadow-2xl flex flex-col md:flex-row items-center gap-10">
              <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center shrink-0">
                <Info size={40} />
              </div>
              <div>
                <h4 className="text-2xl font-black mb-3 tracking-tight">Pro Tip for Database Admins</h4>
                <p className="text-indigo-100 text-lg leading-relaxed font-medium">
                  We've included the original SQL header in every part to ensure correct collation, variables, and charset settings across your entire import process.
                </p>
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* GLOBAL LOADING OVERLAY */}
      {isLoading && mode !== 'UPLOAD' && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-8 max-w-sm text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
            </div>
            <p className="text-2xl font-black text-slate-900">Partitioning Tables...</p>
          </div>
        </div>
      )}

      {/* CODE PREVIEW MODAL */}
      {previewTable && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setPreviewTable(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900">{previewTable.name}</span>
              <button onClick={() => setPreviewTable(null)} className="text-slate-400 text-2xl font-bold">&times;</button>
            </div>
            <div className="flex-1 p-8 overflow-auto bg-slate-900">
              <pre className="font-mono text-xs text-indigo-300/80">
                {previewTable.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StepIndicator: React.FC<{ active: boolean; completed: boolean; label: string; index: number }> = ({ active, completed, label, index }) => (
  <div className="flex items-center gap-3">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500 ${completed ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
      {completed ? <CheckCircle2 size={16} aria-hidden="true" /> : index}
    </div>
    <span className={`text-sm font-bold uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
  </div>
);

const HeroFeature: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="p-6 bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-xl">
    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-50">
      {icon}
    </div>
    <h3 className="font-black text-slate-900 mb-2 tracking-tight">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
  </div>
);

export default App;
