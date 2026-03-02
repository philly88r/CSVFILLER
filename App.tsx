import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Play, 
  Loader2, 
  ShieldCheck, 
  Terminal,
  Database,
  Link as LinkIcon,
  Sparkles,
  Zap,
  Cpu,
  Globe,
  CheckSquare,
  FileSpreadsheet,
  Layers,
  Activity,
  RotateCcw,
  History,
  ArrowRight
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AgentStatus, CSVData, AppState } from './types';

const STORAGE_KEY = 'agentflow_session_v1';

const INITIAL_AGENTS: AgentStatus[] = [
  { id: 'strategist', name: 'Agent 1: Strategist', status: 'idle', message: 'Standing by for mission...' },
  { id: 'writer', name: 'Agent 2: Researcher', status: 'idle', message: 'Ready for deep-web scan...' },
  { id: 'auditor', name: 'Agent 3: Auditor', status: 'idle', message: 'Validation engine primed...' }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: 'setup',
    csvData: null,
    instructions: '',
    checklist: [],
    agents: INITIAL_AGENTS,
    groundingUrls: []
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRowIndex, setCurrentRowIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasCachedSession, setHasCachedSession] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Persistence Logic
  const checkCache = () => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.csvData?.headers) {
          setHasCachedSession(true);
          return true;
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHasCachedSession(false);
    return false;
  };

  useEffect(() => { checkCache(); }, []);

  useEffect(() => {
    if (state.csvData && (state.csvData.rows.length > 0 || state.checklist.length > 0)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const icon = type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '?' : '»';
    setLogs(prev => [`${icon} [${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const updateAgent = (id: string, updates: Partial<AgentStatus>) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(row => row.split(',').map(c => c.trim()));

      setState(prev => ({
        ...prev,
        csvData: { headers, rows }
      }));
      addLog(`Loaded CSV: ${headers.length} columns, ${rows.length} rows.`, 'success');
    };
    reader.readAsText(file);
  };

  const startProcessing = async () => {
    if (!state.csvData) return;
    setIsProcessing(true);
    setState(prev => ({ ...prev, step: 'processing' }));
    addLog("Initializing Neural Pipeline...", "info");

    // Mock processing loop for demonstration
    for (let i = 0; i < state.csvData.rows.length; i++) {
      setCurrentRowIndex(i);
      setProgress(Math.round(((i + 1) / state.csvData.rows.length) * 100));
      
      updateAgent('strategist', { status: 'working', message: `Analyzing Row ${i + 1}...` });
      await new Promise(r => setTimeout(r, 1000));
      
      updateAgent('writer', { status: 'working', message: `Generating Content...` });
      await new Promise(r => setTimeout(r, 1500));
      
      updateAgent('auditor', { status: 'working', message: `Verifying SEO Data...` });
      await new Promise(r => setTimeout(r, 800));
      
      addLog(`Row ${i + 1} processed successfully.`, 'success');
    }

    updateAgent('strategist', { status: 'completed', message: 'Batch Analysis Finished' });
    updateAgent('writer', { status: 'completed', message: 'All Content Generated' });
    updateAgent('auditor', { status: 'completed', message: 'Audit Passed 100%' });
    
    setIsProcessing(false);
    setState(prev => ({ ...prev, step: 'review' }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="glass-nav sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AgentFlow <span className="text-indigo-400">CSV 2025</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">Neural Link Active</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {state.step === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Automate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">SEO workflows</span> with AI agents.
                </h1>
                <p className="text-lg text-slate-400 max-w-md">
                  Upload a CSV, define your instructions, and watch three specialized agents research, write, and audit your data in real-time.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-12 transition-all hover:border-indigo-500/50 hover:bg-white/[0.04]"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="rounded-full bg-indigo-500/10 p-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-indigo-400" />
                  </div>
                  {state.csvData ? (
                    <div>
                      <p className="text-xl font-semibold text-white">{state.csvData.rows.length} Rows Loaded</p>
                      <p className="text-sm text-slate-500">Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-semibold text-white">Drop your CSV here</p>
                      <p className="text-sm text-slate-500">or click to browse local files</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Terminal className="w-5 h-5 text-indigo-400" /> System Configuration
               </h3>
               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mission Parameters</label>
                   <textarea 
                    value={state.instructions}
                    onChange={(e) => setState(prev => ({ ...prev, instructions: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all h-32"
                    placeholder="Example: For every vendor name in column A, find their address and write a 200-word intro for a wedding guide."
                   />
                 </div>
                 <button 
                  disabled={!state.csvData || !state.instructions}
                  onClick={startProcessing}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3"
                 >
                   <Play className="w-5 h-5 fill-current" /> Initialize Agents
                 </button>
               </div>
            </div>
          </div>
        )}

        {state.step === 'processing' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Processing Neural Batch</h2>
                  <p className="text-slate-500">Row {currentRowIndex! + 1} of {state.csvData?.rows.length}</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-indigo-500">{progress}%</span>
                </div>
             </div>
             
             <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 h-full transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {state.agents.map(agent => (
                  <div key={agent.id} className={`p-6 rounded-2xl border transition-all ${agent.status === 'working' ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{agent.name}</span>
                      {agent.status === 'working' ? (
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      ) : agent.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <div className="w-2 h-2 bg-slate-700 rounded-full" />
                      )}
                    </div>
                    <p className="text-white font-medium">{agent.message}</p>
                  </div>
                ))}
             </div>

             <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">system_logs.sh</span>
                  <Activity className="w-3 h-3 text-emerald-500" />
                </div>
                <div className="p-6 h-64 overflow-y-auto font-mono text-sm space-y-2 flex flex-col-reverse">
                  <div ref={logEndRef} />
                  {logs.map((log, i) => (
                    <div key={i} className={log.includes('✓') ? 'text-emerald-400' : 'text-slate-400'}>
                      {log}
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {state.step === 'review' && (
          <div className="text-center py-20 animate-in zoom-in-95 duration-700">
            <div className="inline-flex p-6 rounded-full bg-emerald-500/10 mb-8">
              <ShieldCheck className="w-16 h-16 text-emerald-500" />
            </div>
            <h1 className="text-5xl font-black text-white mb-4">Batch Complete</h1>
            <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto">
              Agents have successfully processed {state.csvData?.rows.length} rows. Content has been audited and is ready for export.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
               <button className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2">
                 <Download className="w-5 h-5" /> Download Results (.csv)
               </button>
               <button 
                onClick={() => setState(prev => ({ ...prev, step: 'setup', csvData: null }))}
                className="px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 border border-white/10 transition-all"
               >
                 Start New Batch
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
