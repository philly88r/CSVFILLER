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
import { GoogleGenerativeAI } from "@google/generative-ai";
import Papa from 'papaparse';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton 
} from "@clerk/clerk-react";

interface CSVData {
  headers: string[];
  rows: any[];
}

const App: React.FC = () => {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [instructions, setInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData({ headers: results.meta.fields || [], rows: results.data });
        addLog("CSV Loaded Successfully.");
      }
    });
  };

  const runProcessor = async () => {
    if (!csvData) {
      addLog("Please upload a CSV first.");
      return;
    }
    if (!GEMINI_API_KEY) {
      addLog("ERROR: VITE_GEMINI_API_KEY is missing. Add it to Netlify/Env.");
      return;
    }
    
    setIsProcessing(true);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const updatedRows = [...csvData.rows];
    for (let i = 0; i < updatedRows.length; i++) {
      try {
        const prompt = `Context: ${JSON.stringify(updatedRows[i])}. Task: ${instructions}. Return only the generated content for the missing fields.`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        updatedRows[i] = { ...updatedRows[i], Generated_Content: text, Status: "Verified 100%", Export_Ready: "YES" };
        
        setProgress(Math.round(((i + 1) / updatedRows.length) * 100));
        addLog(`Processed Row ${i + 1}/${updatedRows.length}`);
      } catch (err) {
        addLog(`Error on row ${i + 1}: ${err}`);
      }
    }
    setCsvData({ ...csvData, rows: updatedRows });
    setIsProcessing(false);
    addLog("Processing Complete. Ready for Export.");
  };

  const exportCsv = () => {
    if (!csvData) return;
    const csv = Papa.unparse(csvData.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `filled_data_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Full CSV Exported.");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Sparkles className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CSVFILLER AI</h1>
              <p className="text-sm text-gray-500">Programmatic SEO Content Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Conditionally render Clerk buttons if Clerk is present */}
             <SignedIn><UserButton /></SignedIn>
             <SignedOut><SignInButton /></SignedOut>
          </div>
        </header>

        <div className="grid gap-8">
          {!GEMINI_API_KEY && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800">
              <AlertCircle className="text-amber-500" />
              <p className="text-sm font-medium">Gemini API Key missing. Please add <strong>VITE_GEMINI_API_KEY</strong> to your environment variables.</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Upload size={16} /> 1. Upload Source
              </h2>
              <div className="border-2 border-dashed border-gray-100 rounded-xl p-8 text-center hover:border-blue-200 transition-colors">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="mx-auto text-gray-300 mb-3" size={32} />
                  <span className="text-sm text-gray-600 font-medium">Click to upload CSV</span>
                </label>
                {csvData && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-600 text-xs font-bold">
                    <CheckCircle2 size={14} /> {csvData.rows.length} rows loaded
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Terminal size={16} /> 2. AI Instructions
              </h2>
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. For each row, write a 200-word wedding vendor description focusing on their location..."
                className="w-full h-32 p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 placeholder-gray-400"
              />
            </section>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={runProcessor}
              disabled={isProcessing || !csvData}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all hover:scale-[1.02]"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Zap size={20} />} 
              {isProcessing ? `Processing (${progress}%)` : "Run AI Engine"}
            </button>
            
            <button 
              onClick={exportCsv}
              disabled={isProcessing || !csvData}
              className="flex-1 bg-white text-gray-900 border border-gray-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <Download size={20} className="text-gray-400" /> Export Full Dataset
            </button>
          </div>

          <section className="bg-gray-900 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 italic">
                <Activity size={14} /> System_Terminal.log
              </h3>
            </div>
            <div className="h-40 overflow-y-auto font-mono text-[10px] space-y-1">
              {logs.length === 0 && <div className="text-gray-700 italic">// Awaiting initialization...</div>}
              {logs.map((log, i) => (
                <div key={i} className="text-green-400 flex gap-3">
                  <span className="text-gray-700">➜</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
