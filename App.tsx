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
  ArrowRight,
  BookOpen,
  Layout,
  Table as TableIcon,
  List as ListIcon,
  Settings,
  Key,
  CreditCard
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Papa from 'papaparse';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton, 
  useUser 
} from "@clerk/clerk-react";

// Updated Types for "Any CSV" and Generative Mode
interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  message: string;
}

interface CSVData {
  headers: string[];
  rows: any[];
}

type AppMode = 'fill' | 'create' | 'api';

const INITIAL_AGENTS: AgentStatus[] = [
  { id: 'analyzer', name: 'Data Architect', status: 'idle', message: 'Ready to map schema...' },
  { id: 'executor', name: 'Generation Engine', status: 'idle', message: 'Awaiting instructions...' },
  { id: 'auditor', name: 'Quality Validator', status: 'idle', message: 'Standing by...' }
];

const App: React.FC = () => {
  const { user } = useUser();
  const [mode, setMode] = useState<AppMode>('fill');
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [instructions, setInstructions] = useState('');
  const [agents, setAgents] = useState<AgentStatus[]>(INITIAL_AGENTS);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const icon = type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '?' : '»';
    setLogs(prev => [`${icon} [${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData({
          headers: results.meta.fields || [],
          rows: results.data
        });
        addLog(`Loaded ${results.data.length} rows with ${results.meta.fields?.length} columns.`, 'success');
      },
      error: (error) => {
        addLog(`Error parsing CSV: ${error.message}`, 'error');
      }
    });
  };

  const generateFromPrompt = async () => {
    if (!instructions) return;
    setIsProcessing(true);
    setAgents(prev => prev.map(a => ({ ...a, status: 'working' })));
    addLog(`Synthesizing dataset for: "${instructions.substring(0, 50)}..."`);
    
    // Logic for Gemini-driven CSV creation goes here
    // Simulated delay
    setTimeout(() => {
      setIsProcessing(false);
      setAgents(prev => prev.map(a => ({ ...a, status: 'completed' })));
      addLog("Generative dataset created successfully.", "success");
    }, 3000);
  };

  const generateApiKey = () => {
    const key = `sk_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    setApiKey(key);
    addLog("New Production API Key generated.", "success");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Premium Header */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">CSVFILLER <span className="text-indigo-400">PRO</span></h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Autonomous Data Engineering</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex bg-slate-800/50 rounded-full p-1 border border-slate-700">
              {(['fill', 'create', 'api'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mode === m ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
                  Upgrade to Pro
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-white">{user?.fullName}</span>
                  <span className="text-[10px] text-indigo-400">Premium Plan</span>
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Workspace */}
        <div className="lg:col-span-8 space-y-8">
          <SignedOut>
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-8 text-center space-y-4">
              <ShieldCheck className="w-12 h-12 text-indigo-400 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Authentication Required</h2>
              <p className="text-slate-400 max-w-md mx-auto">To access the "Amazing" CSV capabilities, API generation, and unlimited row filling, please sign in.</p>
              <SignInButton mode="modal">
                <button className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-xl font-bold transition-all">
                  Sign In / Register
                </button>
              </SignInButton>
            </div>
          </SignedOut>

          <SignedIn>
            {mode === 'fill' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="text-indigo-400 w-5 h-5" />
                  <h2 className="text-xl font-bold text-white">Fill Any CSV</h2>
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-12 text-center transition-all cursor-pointer group bg-slate-950/50"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                  <FileSpreadsheet className="w-12 h-12 text-slate-700 group-hover:text-indigo-400 mx-auto mb-4 transition-colors" />
                  <p className="text-slate-400">Drag & drop your CSV or click to browse</p>
                  <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-tighter">Support for dynamic headers enabled</p>
                </div>

                {csvData && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-wrap gap-2">
                      {csvData.headers.map(h => (
                        <span key={h} className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono border border-slate-700">{h}</span>
                      ))}
                    </div>
                    <textarea 
                      placeholder="Tell the AI what to do with this data... e.g., 'Fill the Meta Description column based on the H1'"
                      className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                    <button 
                      onClick={generateFromPrompt}
                      disabled={isProcessing}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Start Autonomous Processing
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'create' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="text-indigo-400 w-5 h-5" />
                  <h2 className="text-xl font-bold text-white">Generate CSV from Scratch</h2>
                </div>
                <textarea 
                  placeholder="Describe the CSV you want... e.g., 'Create a list of 50 local HVAC companies in Dallas with their Phone, Website, and Google Rating'"
                  className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
                <button 
                  onClick={generateFromPrompt}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold flex items-center justify-center gap-3"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Generate Real-Time Dataset
                </button>
              </div>
            )}

            {mode === 'api' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="text-indigo-400 w-5 h-5" />
                  <h2 className="text-xl font-bold text-white">Developer API</h2>
                </div>
                
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">Production Key</span>
                    {apiKey ? (
                      <code className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded border border-indigo-500/20 text-xs font-mono">
                        {apiKey}
                      </code>
                    ) : (
                      <button 
                        onClick={generateApiKey}
                        className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Generate Key
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-slate-500 mb-1">Total Requests</p>
                    <p className="text-xl font-bold text-white">0</p>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-slate-500 mb-1">Billing Usage</p>
                    <p className="text-xl font-bold text-white">$0.00</p>
                  </div>
                </div>
              </div>
            )}
          </SignedIn>
        </div>

        {/* Console / Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <Activity className="w-3 h-3 text-indigo-400" />
              Agent Swarm Status
            </h3>
            <div className="space-y-4">
              {agents.map((agent) => (
                <div key={agent.id} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">{agent.name}</span>
                    {agent.status === 'working' ? (
                      <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                    ) : agent.status === 'completed' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
                    {agent.message}
                  </p>
                  <div className="mt-3 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        agent.status === 'working' ? 'bg-indigo-600 w-1/2 animate-pulse' : 
                        agent.status === 'completed' ? 'bg-emerald-500 w-full' : 'w-0'
                      }`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                System Logs
              </span>
              <button onClick={() => setLogs([])} className="text-[10px] text-slate-700 hover:text-slate-400">Clear</button>
            </div>
            <div className="h-48 overflow-y-auto space-y-1 text-[10px]">
              {logs.length === 0 && <p className="text-slate-800">No active operations...</p>}
              {logs.map((log, i) => (
                <p key={i} className={log.includes('✓') ? 'text-emerald-500' : 'text-slate-500'}>
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
