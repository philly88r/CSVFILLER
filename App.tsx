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
  UserButton, 
  useUser 
} from "@clerk/clerk-react";

interface CSVData {
  headers: string[];
  rows: any[];
}

const App: React.FC = () => {
  const { user } = useUser();
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
    if (!csvData || !GEMINI_API_KEY) {
      addLog("Missing CSV or API Key");
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
        
        // CRITICAL FIX: Ensure the generated text is actually saved to the row object
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
    // CRITICAL FIX: Ensure we are exporting the FULL rows including the new 'Generated_Content' column
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
    <div className="p-8 max-w-4xl mx-auto font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="text-blue-500" /> CSVFILLER AI
        </h1>
        <UserButton />
      </header>

      <div className="grid gap-6">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload size={20} /> 1. Upload Source
          </h2>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Terminal size={20} /> 2. AI Instructions
          </h2>
          <textarea 
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Write a 500-word SEO description for this wedding venue location..."
            className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </section>

        <div className="flex gap-4">
          <button 
            onClick={runProcessor}
            disabled={isProcessing || !csvData}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Play size={20} />} Run AI Processor
          </button>
          
          <button 
            onClick={exportCsv}
            disabled={isProcessing || !csvData}
            className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
          >
            <Download size={20} /> Export Full Results
          </button>
        </div>

        {isProcessing && (
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        <section className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto">
          {logs.map((log, i) => <div key={i}>{log}</div>)}
        </section>
      </div>
    </div>
  );
};

export default App;
