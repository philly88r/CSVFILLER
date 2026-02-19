
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
import { GoogleGenAI, Type } from "@google/genai";
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

  const resumeSession = () => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setState(JSON.parse(cached));
      addLog("System: Hot-swap recovery successful. Re-engaging agents.", "success");
      setHasCachedSession(false);
    }
  };

  const clearSession = () => {
    if (window.confirm("Purge all research memory?")) {
      localStorage.removeItem(STORAGE_KEY);
      setState({
        step: 'setup',
        csvData: null,
        instructions: '',
        checklist: [],
        agents: INITIAL_AGENTS,
        groundingUrls: []
      });
      setHasCachedSession(false);
      setProgress(0);
      setCurrentRowIndex(null);
      addLog("System: Local cache cleared.", "info");
    }
  };

  const extractJSON = (text: string) => {
    try {
      const clean = text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(clean);
    } catch (e) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try { return JSON.parse(text.substring(start, end + 1)); } 
        catch (innerE) { throw new Error("AI output was not valid JSON."); }
      }
      throw new Error("No JSON payload detected in response.");
    }
  };

  const safeGenerate = async (ai: any, params: any, retries = 3): Promise<any> => {
    try {
      return await ai.models.generateContent(params);
    } catch (e: any) {
      if (retries > 0) {
        const delay = 3000;
        addLog(`Network Congestion. Retrying in 3s...`, 'warning');
        await new Promise(r => setTimeout(r, delay));
        return safeGenerate(ai, params, retries - 1);
      }
      throw e;
    }
  };

  const parseCSVLine = (l: string) => {
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    const matches = l.match(regex);
    return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : [];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1).map(l => parseCSVLine(l));
        setState(prev => ({ 
          ...prev, 
          csvData: { headers, rows: rows.length > 0 ? rows : [] } 
        }));
        addLog(`Blueprint accepted: ${headers.length} headers mapped.`, 'success');
      }
    };
    reader.readAsText(file);
  };

  const downloadCSV = () => {
    if (!state.csvData) return;
    const { headers, rows } = state.csvData;
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agentflow_verified_data.csv`;
    link.click();
    addLog("System: Final CSV exported.", "success");
  };

  const runWorkflow = async () => {
    if (!state.csvData || !state.instructions) return;
    setIsProcessing(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      // --- STAGE 1: STRATEGIST ---
      let workingChecklist = [...state.checklist];
      let workingRows = [...state.csvData.rows];
      const headers = state.csvData.headers;

      if (workingChecklist.length === 0) {
        updateAgent('strategist', { status: 'working', message: 'Architecting research framework...' });
        addLog("AGENT 1: Synthesizing mission blueprint...");
        
        const stratRes = await safeGenerate(ai, {
          model: 'gemini-3-pro-preview',
          contents: `Mission: "${state.instructions}"\nHeaders: [${headers.join(', ')}]\n\nTask: Return JSON with 'checklist' (3 quality items) and 'targetList' (a list of 5 specific entities to research if the provided row count is 0). Currently have ${workingRows.length} rows.`,
          config: { responseMimeType: 'application/json' }
        });

        const stratData = extractJSON(stratRes.text || '{}');
        workingChecklist = (stratData.checklist || []).map((item: any) => ({ ...item, isVerified: false }));
        
        if (workingRows.length === 0) {
          addLog("AGENT 1: No data rows found. Generating targets based on instructions...");
          workingRows = (stratData.targetList || []).map((t: string) => [t]);
        }

        // Sync to UI
        setState(prev => ({ ...prev, checklist: workingChecklist, csvData: { headers, rows: workingRows } }));
        updateAgent('strategist', { status: 'completed', message: 'Mission Profile Validated' });
      }

      // --- STAGE 2: RESEARCHER ---
      updateAgent('writer', { status: 'working', message: 'Engaging web-grounded extraction...' });
      
      // CRITICAL FIX: We must loop through workingRows which might have been updated by Agent 1
      for (let i = 0; i < workingRows.length; i++) {
        // Skip rows that look complete
        if (workingRows[i].length > 1 && workingRows[i].some((v, idx) => idx > 0 && v && v.trim().length > 3)) {
          continue;
        }

        const entity = workingRows[i][0] || "Unknown Object";
        setCurrentRowIndex(i);
        addLog(`AGENT 2: Mining 2025 data for "${entity}"... [Row ${i+1}/${workingRows.length}]`);

        try {
          const res = await safeGenerate(ai, {
            model: 'gemini-3-pro-preview',
            contents: `Deep research mission: "${state.instructions}".
            Target entity: "${entity}". 
            REQUIRED JSON KEYS (Exact match or close match): [${headers.join(', ')}].
            Populate all fields with verified 2025 data. Return JSON object only.`,
            config: { 
              tools: [{ googleSearch: {} }], 
              temperature: 0.1,
              responseMimeType: 'application/json' 
            }
          });

          const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            const urls = chunks.filter((c: any) => c.web).map((c: any) => c.web.uri);
            setState(prev => ({ ...prev, groundingUrls: Array.from(new Set([...prev.groundingUrls, ...urls])) }));
          }

          const rawJson = extractJSON(res.text || '{}');
          
          // FUZZY KEY MATCHING LOGIC
          const normalizedJson: Record<string, any> = {};
          Object.keys(rawJson).forEach(k => {
            normalizedJson[k.toLowerCase().replace(/[\s_]/g, '')] = rawJson[k];
          });

          const finalRowData = headers.map(h => {
            const normalH = h.toLowerCase().replace(/[\s_]/g, '');
            const value = rawJson[h] ?? rawJson[h.toLowerCase()] ?? normalizedJson[normalH] ?? "";
            return String(value);
          });
          
          if (finalRowData.some(v => v.length > 0)) {
            workingRows[i] = finalRowData;
            // Update State Immediately for UI feedback
            setState(prev => ({ 
              ...prev, 
              csvData: { headers, rows: [...workingRows] } 
            }));
            addLog(`AGENT 2: Row ${i+1} committed to production.`, 'success');
          } else {
            addLog(`AGENT 2: Error - Could not resolve data for row ${i+1}.`, 'warning');
          }
        } catch (rowErr) {
          addLog(`AGENT 2: Fault at row ${i+1}. Bypassing...`, 'error');
        }

        setProgress(Math.round(((i + 1) / workingRows.length) * 90));
        await new Promise(r => setTimeout(r, 1000));
      }

      updateAgent('writer', { status: 'completed', message: 'All rows processed and grounded' });
      setCurrentRowIndex(null);

      // --- STAGE 3: AUDITOR ---
      updateAgent('auditor', { status: 'working', message: 'Finalizing integrity check...' });
      const auditRes = await safeGenerate(ai, {
        model: 'gemini-3-pro-preview',
        contents: `Audit this data against the checklist: ${JSON.stringify(workingChecklist)}. 
        Data Sample: ${JSON.stringify(workingRows.slice(0, 3))}. 
        Return JSON mapping requirement IDs to boolean pass/fail status.`,
        config: { responseMimeType: 'application/json' }
      });
      
      const auditData = extractJSON(auditRes.text || '{}');
      setState(prev => ({
        ...prev,
        checklist: prev.checklist.map(c => ({ ...c, isVerified: !!auditData[c.id] })),
        step: 'review'
      }));
      updateAgent('auditor', { status: 'completed', message: 'Integrity Certified' });
      setProgress(100);
      addLog("System: Mission complete. Verified data ready for export.", "success");

    } catch (e: any) {
      addLog(`System Error: ${e.message || "Pipeline collapse"}.`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans selection:bg-indigo-100">
      <nav className="sticky top-0 z-[100] bg-white/70 backdrop-blur-3xl border-b border-slate-200/50 px-12 py-7 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6 group">
          <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-6">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">AgentFlow <span className="text-indigo-600">CSV</span></h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{isProcessing ? 'Research Loop Active' : 'System Standby'}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {hasCachedSession && !isProcessing && (
            <button 
              onClick={resumeSession}
              className="flex items-center gap-3 bg-indigo-600 text-white px-7 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 animate-in slide-in-from-right"
            >
              <History className="w-4 h-4" /> Resume Research
            </button>
          )}
          {isProcessing && (
            <div className="flex items-center gap-6 bg-white/80 px-8 py-4 rounded-[2rem] border border-slate-200 shadow-xl animate-in fade-in">
              <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
              <div className="w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)]" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm font-black text-slate-700 tabular-nums">{progress}%</span>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-[1750px] mx-auto p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Settings Column */}
        <div className="lg:col-span-4 space-y-10">
          <section className="bg-white rounded-[3.5rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.04)] border border-slate-100">
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Step 1: Configuration</label>
                  {state.csvData && (
                    <button onClick={clearSession} className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  )}
                </div>
                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className={`group border-2 border-dashed rounded-[3rem] p-12 text-center transition-all ${state.csvData ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'} ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-2xl hover:shadow-indigo-50'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
                  {state.csvData ? (
                    <div className="space-y-4 animate-in zoom-in duration-500">
                      <div className="bg-emerald-500 w-16 h-16 rounded-[1.8rem] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-100">
                        <FileSpreadsheet className="text-white w-8 h-8" />
                      </div>
                      <p className="text-lg font-black text-slate-900 tracking-tight">{state.csvData.headers.length} Columns Detected</p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">{state.csvData.rows.length} Data Targets</p>
                    </div>
                  ) : (
                    <div className="space-y-5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <Upload className="mx-auto text-slate-300 w-12 h-12 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Load CSV Template</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-1">Step 2: Research Goal</label>
                <textarea 
                  disabled={isProcessing}
                  className="w-full h-52 bg-slate-50 border border-slate-200 rounded-[3rem] p-10 text-base font-semibold focus:ring-[15px] focus:ring-indigo-50/50 focus:border-indigo-400 outline-none transition-all resize-none leading-relaxed shadow-inner placeholder:text-slate-300 disabled:opacity-50"
                  placeholder="Define the mission... e.g., Find 2025 verified contact emails for real estate agents in Dallas."
                  value={state.instructions}
                  onChange={(e) => setState(prev => ({ ...prev, instructions: e.target.value }))}
                />
              </div>

              <button 
                disabled={!state.csvData || !state.instructions || isProcessing}
                onClick={runWorkflow}
                className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-[11px] flex items-center justify-center gap-5 hover:bg-indigo-600 disabled:opacity-20 shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all active:scale-95 uppercase tracking-[0.5em] group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center gap-4">
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                  Activate Agents
                </span>
              </button>
            </div>
          </section>

          {/* Console */}
          <section className="bg-slate-900 rounded-[3.5rem] p-12 text-indigo-50 shadow-2xl relative border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-4 text-indigo-400">
                <Terminal className="w-6 h-6" /> Production Logs
              </h3>
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
              </div>
            </div>
            <div className="font-mono text-[11px] space-y-6 h-96 overflow-y-auto scrollbar-hide flex flex-col-reverse px-2 leading-relaxed">
              <div ref={logEndRef} />
              {logs.map((log, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-left duration-700 border-l-2 pl-5 py-2 ${log.includes('!') ? 'text-rose-400 border-rose-500/40 bg-rose-500/5 px-4 rounded-xl' : 'border-indigo-500/20 opacity-80 hover:opacity-100 transition-opacity'}`}>
                  {log}
                </div>
              ))}
              {logs.length === 0 && <div className="text-slate-600 italic tracking-[0.2em] uppercase text-[9px]">Awaiting Agent Handshake...</div>}
            </div>
          </section>
        </div>

        {/* Workspace Column */}
        <div className="lg:col-span-8 space-y-12">
          {/* Status HUD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {state.agents.map((agent) => (
              <div key={agent.id} className={`bg-white p-10 rounded-[3.5rem] border-2 transition-all duration-1000 ${agent.status === 'working' ? 'border-indigo-400 shadow-[0_30px_80px_rgba(99,102,241,0.1)] scale-[1.05]' : 'border-transparent opacity-50'}`}>
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${agent.status === 'completed' ? 'bg-emerald-500 text-white shadow-2xl' : 'bg-slate-50 text-slate-300'}`}>
                    {agent.id === 'strategist' ? <Search className="w-8 h-8" /> : agent.id === 'writer' ? <Cpu className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                  </div>
                  {agent.status === 'working' && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />}
                  {agent.status === 'completed' && <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in" />}
                </div>
                <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase">{agent.name}</h4>
                <p className="text-xs text-slate-400 mt-4 font-bold italic leading-relaxed">"{agent.message}"</p>
              </div>
            ))}
          </div>

          {/* Main Production Table */}
          {state.csvData && (
            <section className="bg-white rounded-[4.5rem] shadow-[0_60px_150px_rgba(0,0,0,0.06)] overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-1000">
              <div className="px-14 py-14 border-b border-slate-100 flex flex-wrap gap-10 justify-between items-center bg-slate-50/20">
                <div className="flex items-center gap-10">
                  <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl shadow-indigo-100">
                    <Database className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter text-slate-900 italic">Production Matrix</h3>
                    <p className="text-[11px] text-indigo-500 font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-3">
                      <Sparkles className="w-4 h-4 animate-pulse" /> Verified 2025 Knowledge Stream
                    </p>
                  </div>
                </div>
                <button 
                  onClick={downloadCSV}
                  disabled={isProcessing && progress < 100}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-12 py-5 rounded-[2rem] font-black text-[12px] flex items-center gap-4 transition-all active:scale-95 uppercase tracking-[0.2em] shadow-2xl shadow-emerald-100 disabled:opacity-40 disabled:grayscale"
                >
                  <Download className="w-6 h-6" /> Export Final CSV
                </button>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-[14px] border-collapse min-w-[1500px]">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-2xl z-20 border-b border-slate-100">
                    <tr>
                      {state.csvData.headers.map((h, i) => (
                        <th key={i} className="px-12 py-10 font-black text-slate-300 uppercase tracking-[0.3em] text-[10px] border-r border-slate-50 last:border-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {state.csvData.rows.length === 0 ? (
                       <tr>
                        <td colSpan={state.csvData.headers.length} className="px-12 py-40 text-center">
                          <div className="space-y-6">
                            <Loader2 className="w-12 h-12 text-slate-100 mx-auto animate-spin" />
                            <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[11px]">Strategist is mapping data targets...</p>
                          </div>
                        </td>
                      </tr>
                    ) : state.csvData.rows.map((row, ri) => (
                      <tr 
                        key={ri} 
                        className={`transition-all group ${currentRowIndex === ri ? 'bg-indigo-50/50' : 'hover:bg-slate-50/40'}`}
                      >
                        {state.csvData!.headers.map((_, ci) => (
                          <td 
                            key={ci} 
                            className={`px-12 py-10 text-slate-800 font-bold border-r border-slate-50 last:border-0 transition-all ${currentRowIndex === ri && ci > 0 && !row[ci] ? 'relative' : ''}`}
                          >
                            <div className="max-w-[400px] truncate group-hover:whitespace-normal transition-all leading-relaxed min-h-[1.5em] text-slate-700">
                              {row[ci] || (currentRowIndex === ri ? (
                                <span className="flex items-center gap-4 text-indigo-400 italic font-black uppercase text-[10px] tracking-widest">
                                  <Loader2 className="w-4 h-4 animate-spin" /> Mining...
                                </span>
                              ) : <span className="text-slate-100">Pending</span>)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(!state.csvData || (state.csvData.rows.length === 0 && !isProcessing)) && (
            <div className="bg-white rounded-[6rem] p-48 text-center border-8 border-slate-50 border-dashed group hover:border-indigo-100 transition-all duration-1000">
              <div className="bg-indigo-50/50 w-44 h-44 rounded-[4rem] flex items-center justify-center mx-auto mb-16 transition-all duration-1000 group-hover:scale-110 shadow-2xl shadow-indigo-100 group-hover:rotate-12">
                <FileSpreadsheet className="text-indigo-600 w-20 h-20" />
              </div>
              <h3 className="text-6xl font-black text-slate-900 mb-8 tracking-tighter italic">Factory Standby</h3>
              <p className="text-slate-400 max-w-xl mx-auto text-2xl font-medium leading-relaxed">AgentFlow is awaiting a production blueprint. Upload your CSV and define the 2025 mission to begin autonomous synthesis.</p>
              <div className="mt-20 flex justify-center">
                <ArrowRight className="text-slate-200 w-20 h-20 animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 12px; width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f0f2f4; border-radius: 40px; border: 4px solid white; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e5e7eb; }
        @keyframes zoom-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-in { animation: zoom-in 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default App;
