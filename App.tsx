import React, { useState } from 'react';
import { Upload, Download, Play, Loader2, Sparkles, Cpu, Table, Terminal, Activity, Zap } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Papa from 'papaparse';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

const App: React.FC = () => {
  const [csvData, setCsvData] = useState<any>(null);
  const [instr, setInstr] = useState('');
  const [isProc, setIsProc] = useState(false);
  const [prog, setProg] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [tab, setTab] = useState('preview');
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

  const addL = (m: string) => setLogs(p => [{m, t: new Date().toLocaleTimeString()}, ...p].slice(0, 50));

  const hUpload = (e: any) => {
    const f = e.target.files?.[0];
    if (f) Papa.parse(f, { header: true, complete: (r) => { setCsvData({ h: r.meta.fields, d: r.data }); addL("CSV Loaded."); } });
  };

  const run = async () => {
    if (!csvData || !API_KEY) return;
    setIsProc(true); setProg(0); setTab('logs');
    const model = new GoogleGenerativeAI(API_KEY).getGenerativeModel({ model: "gemini-1.5-flash" });
    const rows = [...csvData.d];
    for (let i = 0; i < rows.length; i++) {
      try {
        const res = await model.generateContent(`Data: ${JSON.stringify(rows[i])}. Task: ${instr}`);
        rows[i] = { ...rows[i], AI_Result: res.response.text(), Processed_At: new Date().toISOString() };
        setProg(Math.round(((i + 1) / rows.length) * 100));
        addL(`Row ${i+1} done.`);
      } catch (err) {
        addL(`Error row ${i+1}: ${err}`);
      }
    }
    setCsvData({ ...csvData, d: rows }); setIsProc(false);
  };

  const exportCsv = () => {
    if (!csvData) return;
    const blob = new Blob([Papa.unparse(csvData.d)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-4 lg:p-8 selection:bg-indigo-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
      <nav className="flex justify-between items-center mb-8 border-b border-white/5 pb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
            <Cpu size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">AgentFlow <span className="text-indigo-400">CSV</span></span>
        </div>
        <div className="flex items-center gap-4">
          <SignedIn><UserButton /></SignedIn>
          <SignedOut><SignInButton mode="modal" /></SignedOut>
        </div>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8 relative z-10">
        <div className="space-y-6">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-slate-500 flex items-center gap-2">
              <Upload size={14} /> 1. Data Source
            </h3>
            <input type="file" onChange={hUpload} className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer" />
            {csvData && <p className="mt-3 text-[10px] text-indigo-400 font-mono">{csvData.d.length} rows loaded</p>}
          </div>

          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-slate-500 flex items-center gap-2">
              <Sparkles size={14} /> 2. Intelligence
            </h3>
            <textarea 
              value={instr} 
              onChange={e => setInstr(e.target.value)} 
              placeholder="What should the AI do with each row?"
              className="w-full bg-black/40 rounded-xl p-3 h-32 text-sm outline-none border border-white/10 focus:border-indigo-500 transition-colors resize-none" 
            />
            <button 
              onClick={run} 
              disabled={isProc || !csvData} 
              className="w-full mt-4 bg-indigo-600 py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/10 active:scale-95"
            >
              {isProc ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} 
              {isProc ? 'Processing...' : 'Execute Sequence'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/10 flex flex-col h-[600px] overflow-hidden backdrop-blur-sm">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex gap-6">
              <button onClick={() => setTab('preview')} className={`text-xs font-bold uppercase tracking-widest transition-colors ${tab==='preview'?'text-indigo-400':'text-slate-500 hover:text-slate-300'}`}>Data Preview</button>
              <button onClick={() => setTab('logs')} className={`text-xs font-bold uppercase tracking-widest transition-colors ${tab==='logs'?'text-indigo-400':'text-slate-500 hover:text-slate-300'}`}>System Logs</button>
            </div>
            {csvData?.d.some((r:any) => r.AI_Result) && (
              <button onClick={exportCsv} className="flex items-center gap-2 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                <Download size={12} /> Export CSV
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6 text-[11px] font-mono leading-relaxed">
            {tab==='preview' ? (
              csvData ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left opacity-40 border-b border-white/10">
                        {csvData.h.slice(0,3).map((h:any)=><th key={h} className="pb-2 font-normal">{h}</th>)}
                        <th className="pb-2 font-normal text-indigo-400">AI_Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {csvData.d.slice(0,25).map((r:any, i:number)=>(
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          {csvData.h.slice(0,3).map((h:any)=><td key={h} className="py-2 pr-4 text-slate-400 truncate max-w-[120px]">{r[h]}</td>)}
                          <td className="py-2 text-indigo-300 italic">{r.AI_Result || 'pending...'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.d.length > 25 && <p className="mt-4 text-center text-slate-600 italic">Showing first 25 rows</p>}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                  <Table size={40} className="mb-4" />
                  <p>Load a CSV to begin visualization</p>
                </div>
              )
            ) : (
              <div className="space-y-1">
                {logs.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 pt-20">
                    <Terminal size={40} className="mb-4" />
                    <p>No activity recorded</p>
                  </div>
                ) : logs.map((l,i)=>(
                  <div key={i} className="flex gap-4 border-l border-white/10 pl-4 py-0.5 hover:border-indigo-500/50 transition-colors">
                    <span className="text-slate-600 shrink-0">{l.t}</span>
                    <span className="text-slate-400">{l.m}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isProc && (
            <div className="h-1 bg-white/5 relative">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                style={{width:`${prog}%`}} 
              />
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Activity size={12} className="text-indigo-500" /> Neural Sync Active</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" /> Secure</span>
        </div>
        <span>v2.0.0-Elite</span>
      </footer>
    </div>
  );
};

export default App;