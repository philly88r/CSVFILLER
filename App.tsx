import React, { useState } from 'react';
import { 
  Upload, Download, Play, Loader2, Sparkles, Cpu, Table, 
  Terminal, Activity, Zap, ShieldCheck, Link2, Globe, 
  TrendingUp, FileSpreadsheet, Plus, Trash2, Database, BookOpen, ExternalLink, RefreshCw 
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Papa from 'papaparse';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

interface InternalLinkItem {
  id: string;
  url: string;
  description: string;
}

const DEFAULT_LINKS: InternalLinkItem[] = [
  { id: '1', url: 'https://vowlaunch.com/vendors/photographers/charlotte', description: 'Guide to Charlotte Wedding Photographers' },
  { id: '2', url: 'https://burnettetools.com/blog/router-bit-guide', description: 'Ultimate Router Bit Selection Guide' },
  { id: '3', url: 'https://marketnest.org/services/lead-generation', description: 'Professional B2B Lead Generation Services' },
  { id: '4', url: 'https://vowlaunch.com/blog/diy-wedding-budgets', description: 'DIY Wedding Budget Calculator & Checklist' },
  { id: '5', url: 'https://burnettetools.com/catalog/carbide-saws', description: 'Industrial Carbide Circular Saw Catalog' }
];

const DEFAULT_SEO_TEMPLATES = [
  { Keyword: "how to choose wedding videographer Charlotte", "Competitor URL": "https://www.theknot.com/marketplace/wedding-videographers-charlotte-nc", Notes: "Focus on local luxury venues" },
  { Keyword: "best router bits for cnc machining wood", "Competitor URL": "https://www.woodmagazine.com/best-cnc-router-bits", Notes: "Compare carbide vs high-speed steel" },
  { Keyword: "lead generation automation for marketing agencies", "Competitor URL": "https://www.hubspot.com/agency-lead-generation", Notes: "Target agencies under 50 staff" },
  { Keyword: "how to sharpen carbide circular saw blades at home", "Competitor URL": "https://www.woodworkersjournal.com/sharpening-saw-blades", Notes: "Safety first and proper angles" }
];

const App: React.FC = () => {
  const [csvData, setCsvData] = useState<any>(null);
  const [instr, setInstr] = useState('Analyze the data and summarize key metrics.');
  const [isProc, setIsProc] = useState(false);
  const [prog, setProg] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [tab, setTab] = useState('preview');
  const [mode, setMode] = useState<'standard' | 'seo_blueprint'>('seo_blueprint');
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [useSearch, setUseSearch] = useState(true);
  
  // Internal Link Inventory
  const [linksInventory, setLinksInventory] = useState<InternalLinkItem[]>(DEFAULT_LINKS);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

  const addL = (m: string) => setLogs(p => [{ m, t: new Date().toLocaleTimeString() }, ...p].slice(0, 50));

  const hUpload = (e: any) => {
    const f = e.target.files?.[0];
    if (f) Papa.parse(f, { 
      header: true, 
      skipEmptyLines: true,
      complete: (r) => { 
        setCsvData({ h: r.meta.fields, d: r.data }); 
        addL("CSV Loaded with headers: " + r.meta.fields?.join(", ")); 
      } 
    });
  };

  const addInventoryLink = () => {
    if (!newLinkUrl || !newLinkDesc) return;
    setLinksInventory(prev => [
      ...prev,
      { id: Date.now().toString(), url: newLinkUrl, description: newLinkDesc }
    ]);
    setNewLinkUrl('');
    setNewLinkDesc('');
    addL(`Added internal link option: ${newLinkUrl}`);
  };

  const removeInventoryLink = (id: string) => {
    setLinksInventory(prev => prev.filter(item => item.id !== id));
    addL(`Removed internal link option.`);
  };

  const initializeSeoTemplate = () => {
    setCsvData({
      h: ["Keyword", "Competitor URL", "Notes"],
      d: DEFAULT_SEO_TEMPLATES
    });
    addL("Initialized Ultimate SEO Blueprint template with 4 sample topics.");
  };

  const run = async () => {
    if (!csvData || !API_KEY) {
      addL("Execution failed: Make sure CSV is loaded and VITE_GEMINI_API_KEY is configured.");
      return;
    }
    setIsProc(true); 
    setProg(0); 
    setTab('preview');
    addL(`Starting sequence in ${mode === 'seo_blueprint' ? 'Ultimate SEO Article Blueprint' : 'Standard'} mode...`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    // Determine model config. If useSearch is true, we instruct the model to use search grounding
    const modelOptions: any = { model: "gemini-1.5-flash" };
    if (useSearch) {
      modelOptions.tools = [{ googleSearch: {} }];
    }
    const model = genAI.getGenerativeModel(modelOptions);
    const rows = [...csvData.d];

    // Build the inventory context for the linking system
    const inventoryText = linksInventory.map(l => `- URL: ${l.url} | Description: ${l.description}`).join('\n');

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const keyword = row.Keyword || row.keyword || row.topic || row.Topic || "Unknown Keyword";
        const compUrl = row["Competitor URL"] || row.competitor_url || "No URL provided";
        const extraNotes = row.Notes || row.notes || "None";

        addL(`Processing row ${i + 1}/${rows.length}: "${keyword}"...`);

        if (mode === 'seo_blueprint') {
          // SEO BLUEPRINT WORKFLOW
          const prompt = `You are a world-class programmatic SEO expert and long-form content strategist. 
Your goal is to build an absolute "Perfect SEO Article Blueprint" for the target keyword: "${keyword}".

We have a competitor's page at: "${compUrl}".
Additional Context/Notes: "${extraNotes}".

Here is our Internal Link Inventory of existing pages on our site. You MUST suggest natural, highly context-aware internal linking opportunities (with precise anchor text to use) from this inventory only:
${inventoryText}

Evaluate and generate detailed values for the following SEO blueprint parameters. You must output your response in EXACT JSON format.

{
  "Proposed_Slug": "a clean, keyword-optimized lowercase url slug starting with /blog/ or /vendors/",
  "Meta_Title": "a highly-enticing, CTR-optimized SEO title containing the keyword, under 60 characters",
  "Meta_Description": "a compelling meta description with a call to action, containing the keyword, under 160 characters",
  "Recommended_Word_Count": 1800, // or an appropriate number based on competitor depth
  "NLP_Semantic_Keywords": ["list of 5-8 highly relevant LSI, NLP, and semantic entities to include"],
  "Heading_Outline": "Detailed, comprehensive H1, H2, and H3 outline representing high topical authority. Structure logically.",
  "Internal_Links_Map": "Identify the top 1-2 most contextually relevant internal links from the inventory list to embed. Specify the EXACT target URL and recommended anchor text.",
  "Outrank_Score": 85, // Integer between 0 and 100 representing probability of outranking the top result. Be extremely critical based on competitor authority and content quality.
  "Outrank_Analysis": "Detail why you gave this score. Analyze competitor weaknesses/gaps (e.g., outdated content, bad formatting, lacks visual guides) and how our article will outrank it.",
  "Article_Draft": "Write the full, complete, high-quality draft of the article itself. It must be publication-ready, fully detailed, formatted in markdown with clear H1, H2, H3 headings, bullet points, and naturally integrated semantic keywords and the chosen internal links."
}`;

          // Execute with search grounding if enabled
          const res = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          });

          const jsonText = res.response.text();
          let parsed: any = {};
          try {
            parsed = JSON.parse(jsonText);
          } catch (pe) {
            // Fallback parsing in case JSON wrapping has markdown blocks
            const match = jsonText.match(/\{[\s\S]*\}/);
            if (match) {
              parsed = JSON.parse(match[0]);
            } else {
              throw pe;
            }
          }

          rows[i] = {
            ...row,
            Proposed_Slug: parsed.Proposed_Slug,
            Meta_Title: parsed.Meta_Title,
            Meta_Description: parsed.Meta_Description,
            Recommended_Word_Count: parsed.Recommended_Word_Count,
            NLP_Semantic_Keywords: parsed.NLP_Semantic_Keywords?.join(", "),
            Heading_Outline: parsed.Heading_Outline,
            Internal_Links_Map: parsed.Internal_Links_Map,
            Outrank_Score: parsed.Outrank_Score,
            Outrank_Analysis: parsed.Outrank_Analysis,
            Article_Draft: parsed.Article_Draft,
            Processed_At: new Date().toISOString()
          };

          addL(`Success: Row ${i + 1} processed! Outrank Score: ${parsed.Outrank_Score}/100.`);

        } else {
          // STANDARD MODE
          const prompt = `You are an expert data engineer. Process this row of data: ${JSON.stringify(row)}.
Apply these instructions: "${instr}".
Return your response.`;

          const res = await model.generateContent(prompt);
          const text = res.response.text();

          rows[i] = {
            ...row,
            AI_Result: text,
            Processed_At: new Date().toISOString()
          };
          addL(`Success: Row ${i + 1} processed!`);
        }

        // Realtime update progress and active rows
        const updatedHeaders = Array.from(new Set([
          ...csvData.h, 
          ...(mode === 'seo_blueprint' 
            ? ["Proposed_Slug", "Meta_Title", "Meta_Description", "Recommended_Word_Count", "NLP_Semantic_Keywords", "Heading_Outline", "Internal_Links_Map", "Outrank_Score", "Outrank_Analysis", "Article_Draft"] 
            : ["AI_Result"])
        ]));
        
        setCsvData({ h: updatedHeaders, d: rows });
        setProg(Math.round(((i + 1) / rows.length) * 100));

      } catch (err) {
        addL(`Error processing Row ${i + 1}: ${err}`);
      }
    }

    setIsProc(false);
    addL(`All rows processed successfully!`);
  };

  const exportCsv = () => {
    if (!csvData) return;
    const blob = new Blob([Papa.unparse(csvData.d)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `seo_blueprints_${new Date().toISOString().slice(0,10)}.csv`; 
    a.click();
    addL("Exported processed CSV.");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-4 lg:p-8 selection:bg-indigo-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="flex justify-between items-center mb-8 border-b border-white/5 pb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
            <Cpu size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            AgentFlow <span className="text-indigo-400">CSV v2</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">SEO SUITE</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
            <>
              <SignedIn><UserButton /></SignedIn>
              <SignedOut><SignInButton mode="modal" /></SignedOut>
            </>
          )}
        </div>
      </nav>

      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-4 gap-8 relative z-10">
        
        {/* Left Control Column (1/4 space) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Mode Selector */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-slate-500">Pipeline Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setMode('standard')} 
                className={`py-2 rounded-lg text-xs font-semibold border transition-all ${mode === 'standard' ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-slate-400 border-transparent hover:text-slate-300'}`}
              >
                Standard
              </button>
              <button 
                onClick={() => setMode('seo_blueprint')} 
                className={`py-2 rounded-lg text-xs font-semibold border transition-all ${mode === 'seo_blueprint' ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' : 'bg-transparent text-slate-400 border-transparent hover:text-slate-300'}`}
              >
                SEO Blueprint
              </button>
            </div>
          </div>

          {/* 1. Data Source Panel */}
          <div className="bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Upload size={13} /> 1. CSV Dataset</span>
              {mode === 'seo_blueprint' && (
                <button 
                  onClick={initializeSeoTemplate}
                  className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded hover:bg-indigo-500/20 transition-all font-mono"
                >
                  Load Preset
                </button>
              )}
            </h3>
            
            <input 
              type="file" 
              onChange={hUpload} 
              className="block w-full text-[11px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600/30 file:text-indigo-200 hover:file:bg-indigo-600/40 cursor-pointer file:text-[10px] file:font-semibold" 
            />
            
            {csvData && (
              <div className="mt-3 flex justify-between items-center bg-black/40 rounded-lg p-2 border border-white/5">
                <span className="text-[10px] text-indigo-400 font-mono">{csvData.d.length} rows loaded</span>
                <span className="text-[10px] text-slate-500 font-mono">{csvData.h.length} columns</span>
              </div>
            )}
          </div>

          {/* 2. Mode Settings (Dynamic Content) */}
          <div className="bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
            {mode === 'seo_blueprint' ? (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Globe size={13} className="text-indigo-400" /> Grounding & Competitor
                </h3>
                
                {/* Search Grounding toggle */}
                <label className="flex items-center justify-between bg-black/40 rounded-xl p-3 border border-white/5 cursor-pointer hover:bg-black/60 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-semibold">Live Google Search</span>
                    <span className="text-[9px] text-slate-500">Retrieves real #1 ranking page</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={useSearch} 
                    onChange={e => setUseSearch(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-white/10 focus:ring-indigo-500"
                  />
                </label>

                {/* Info Card */}
                <div className="bg-indigo-950/20 rounded-xl p-3 border border-indigo-500/10 text-[10px] leading-relaxed text-indigo-300/80">
                  ⚡ <strong>System Directive:</strong> Generates complete H1-H3 outline, LSI keywords, targeted word counts, context-aware internal link references, and outputs an Outrank score out of 100 with a detailed execution roadmap.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={13} /> AI Processing Guidelines
                </h3>
                <textarea
                  value={instr}
                  onChange={e => setInstr(e.target.value)}
                  placeholder="What should the AI do with each row?"
                  className="w-full bg-black/40 rounded-xl p-3 h-28 text-xs outline-none border border-white/10 focus:border-indigo-500 transition-colors resize-none font-mono"
                />
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={run}
              disabled={isProc || !csvData}
              className="w-full mt-4 bg-indigo-600 py-2.5 rounded-xl text-xs font-bold flex justify-center items-center gap-2 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-lg shadow-indigo-500/10 active:scale-[0.98]"
            >
              {isProc ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
              {isProc ? `Processing ${prog}%` : 'Run Pipeline Sequence'}
            </button>
          </div>
        </div>

        {/* Middle/Right Data Workspace (3/4 space) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Main Dashboard Panel */}
          <div className="bg-white/5 rounded-xl border border-white/10 flex flex-col h-[550px] overflow-hidden backdrop-blur-sm">
            
            {/* Header Tabs */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex gap-6">
                <button 
                  onClick={() => setTab('preview')} 
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'preview' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Blueprint Data Viewer
                </button>
                <button 
                  onClick={() => setTab('inventory')} 
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'inventory' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Internal Linking Inventory ({linksInventory.length})
                </button>
                <button 
                  onClick={() => setTab('logs')} 
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'logs' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Execution Logs
                </button>
              </div>
              
              {csvData?.d.some((r: any) => r.Processed_At || r.AI_Result) && (
                <button 
                  onClick={exportCsv} 
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  <Download size={11} /> Export CSV
                </button>
              )}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-auto p-4 text-[11px] font-mono leading-relaxed">
              
              {/* Preview Tab */}
              {tab === 'preview' && (
                csvData ? (
                  <div className="overflow-x-auto h-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] text-slate-500 uppercase border-b border-white/10">
                          <th className="pb-2 font-semibold">Keyword</th>
                          {mode === 'seo_blueprint' ? (
                            <>
                              <th className="pb-2 font-semibold">Title Tag</th>
                              <th className="pb-2 font-semibold text-center">Score</th>
                              <th className="pb-2 font-semibold">Target Words</th>
                              <th className="pb-2 font-semibold">Proposed Slug</th>
                              <th className="pb-2 font-semibold text-right">Details</th>
                            </>
                          ) : (
                            <>
                              <th className="pb-2 font-semibold">AI_Result</th>
                              <th className="pb-2 font-semibold text-right">Timestamp</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {csvData.d.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 pr-4 text-slate-300 font-bold truncate max-w-[150px]">
                              {r.Keyword || r.keyword || r.topic || r.Topic}
                            </td>
                            
                            {mode === 'seo_blueprint' ? (
                              <>
                                <td className="py-2.5 pr-4 text-slate-400 truncate max-w-[200px]">
                                  {r.Meta_Title || <span className="text-slate-600 italic">pending processing...</span>}
                                </td>
                                <td className="py-2.5 text-center">
                                  {r.Outrank_Score !== undefined ? (
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                                      r.Outrank_Score >= 80 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : r.Outrank_Score >= 60 
                                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                      {r.Outrank_Score}/100
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 italic">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-slate-400 font-mono text-center">
                                  {r.Recommended_Word_Count || "-"}
                                </td>
                                <td className="py-2.5 text-indigo-400 truncate max-w-[120px]">
                                  {r.Proposed_Slug || "-"}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button 
                                    onClick={() => setSelectedRow(r)}
                                    disabled={!r.Processed_At}
                                    className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded hover:bg-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-semibold"
                                  >
                                    Inspect
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 text-indigo-300 italic truncate max-w-[300px]">
                                  {r.AI_Result || 'pending...'}
                                </td>
                                <td className="py-2.5 text-slate-600 text-right">
                                  {r.Processed_At ? new Date(r.Processed_At).toLocaleTimeString() : "-"}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 pt-20">
                    <Table size={36} className="mb-3" />
                    <p className="text-xs">Load a CSV keyword list or click "Load Preset" to begin</p>
                  </div>
                )
              )}

              {/* Linking Inventory Tab */}
              {tab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add Internal Sourced URL</h4>
                    <div className="grid grid-cols-5 gap-2">
                      <input 
                        type="text" 
                        value={newLinkUrl} 
                        onChange={e => setNewLinkUrl(e.target.value)} 
                        placeholder="e.g. https://domain.com/blog/topic" 
                        className="col-span-2 bg-slate-900 rounded-lg border border-white/10 p-1.5 outline-none text-slate-300 text-[11px]" 
                      />
                      <input 
                        type="text" 
                        value={newLinkDesc} 
                        onChange={e => setNewLinkDesc(e.target.value)} 
                        placeholder="Description (used for contextual linking matches)" 
                        className="col-span-2 bg-slate-900 rounded-lg border border-white/10 p-1.5 outline-none text-slate-300 text-[11px]" 
                      />
                      <button 
                        onClick={addInventoryLink}
                        className="bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center text-white text-[11px] font-semibold"
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                    {linksInventory.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 hover:bg-white/[0.01]">
                        <div className="flex flex-col">
                          <span className="text-indigo-400 font-semibold">{item.url}</span>
                          <span className="text-[10px] text-slate-500">{item.description}</span>
                        </div>
                        <button 
                          onClick={() => removeInventoryLink(item.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Logs Tab */}
              {tab === 'logs' && (
                <div className="space-y-1">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 pt-20">
                      <Terminal size={36} className="mb-3" />
                      <p>No activity recorded</p>
                    </div>
                  ) : logs.map((l, i) => (
                    <div key={i} className="flex gap-4 border-l border-white/10 pl-4 py-0.5 hover:border-indigo-500/50 transition-colors">
                      <span className="text-slate-600 shrink-0">{l.t}</span>
                      <span className="text-slate-400">{l.m}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Bottom Progress Bar */}
            {isProc && (
              <div className="h-1 bg-white/5 relative">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  style={{ width: `${prog}%` }}
                />
              </div>
            )}

          </div>

          {/* Expanded Selected Row Inspector Panel (Adapting dynamic metadata card) */}
          {selectedRow && (
            <div className="bg-white/5 p-6 rounded-xl border border-indigo-500/30 backdrop-blur-sm relative animate-fadeIn">
              <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Article Blueprint</span>
                  <h3 className="text-base font-bold text-white mt-1.5">{selectedRow.Keyword || selectedRow.keyword || selectedRow.topic}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Outrank Probability</span>
                    <span className={`text-lg font-black ${
                      selectedRow.Outrank_Score >= 80 ? 'text-emerald-400' : selectedRow.Outrank_Score >= 60 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {selectedRow.Outrank_Score}%
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedRow(null)} 
                    className="text-slate-400 hover:text-white border border-white/10 hover:border-white/20 bg-black/40 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Close Blueprint
                  </button>
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Metas & Settings (Column 1) */}
                <div className="space-y-4 md:col-span-1">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Link2 size={12} className="text-indigo-400" /> Slug & Target URL
                    </h4>
                    <p className="text-indigo-400 font-mono text-[11px] font-bold break-all bg-slate-900/50 p-2 rounded border border-white/5">
                      {selectedRow.Proposed_Slug}
                    </p>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>Meta Title tag</span>
                      <span className="text-[9px] text-slate-500 font-mono">{selectedRow.Meta_Title?.length || 0}/60 chars</span>
                    </h4>
                    <p className="text-slate-200 text-xs font-semibold leading-relaxed">
                      {selectedRow.Meta_Title}
                    </p>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>Meta Description tag</span>
                      <span className="text-[9px] text-slate-500 font-mono">{selectedRow.Meta_Description?.length || 0}/160 chars</span>
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {selectedRow.Meta_Description}
                    </p>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Semantic NLP Entities
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRow.NLP_Semantic_Keywords?.split(", ").map((kw: string, i: number) => (
                        <span key={i} className="text-[10px] bg-slate-800 border border-white/5 text-slate-300 px-2 py-0.5 rounded font-mono">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Linking System & Outline (Column 2) */}
                <div className="space-y-4 md:col-span-1">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Link2 size={12} className="text-indigo-400" /> Suggested Internal Links
                    </h4>
                    <div className="space-y-2 text-[11px]">
                      {typeof selectedRow.Internal_Links_Map === 'string' ? (
                        <p className="text-slate-400 italic">{selectedRow.Internal_Links_Map}</p>
                      ) : selectedRow.Internal_Links_Map ? (
                        <div className="bg-slate-900/50 p-3 rounded border border-indigo-500/10 space-y-1">
                          <p className="text-indigo-300 font-bold flex items-center gap-1">
                            <Link2 size={11} /> Anchor: "{selectedRow.Internal_Links_Map.Anchor || selectedRow.Internal_Links_Map.anchorText || selectedRow.Internal_Links_Map.anchor || 'Click here'}"
                          </p>
                          <a 
                            href={selectedRow.Internal_Links_Map.URL || selectedRow.Internal_Links_Map.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-emerald-400 font-mono text-[10px] hover:underline flex items-center gap-1 break-all"
                          >
                            {selectedRow.Internal_Links_Map.URL || selectedRow.Internal_Links_Map.url} <ExternalLink size={10} />
                          </a>
                        </div>
                      ) : (
                        <p className="text-slate-600 italic">No matches in inventory.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-emerald-400" /> Outrank Roadmap
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {selectedRow.Outrank_Analysis}
                    </p>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Database size={12} /> Structure & Heading Outline
                    </h4>
                    <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap max-h-[150px] overflow-y-auto leading-tight p-2 bg-slate-900/50 rounded border border-white/5">
                      {selectedRow.Heading_Outline}
                    </pre>
                  </div>
                </div>

                {/* Complete AI Generated Long-form Post (Column 3) */}
                <div className="space-y-4 md:col-span-1">
                  <div className="bg-black/40 p-4 rounded-xl border border-indigo-500/20 h-[480px] flex flex-col overflow-hidden">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 shrink-0">
                      <BookOpen size={12} /> Publication-Ready Article Draft
                    </h4>
                    <div className="flex-1 overflow-y-auto text-[11px] leading-relaxed text-slate-300 font-sans whitespace-pre-wrap bg-slate-900/30 p-3 rounded border border-white/5">
                      {selectedRow.Article_Draft}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      <footer className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Activity size={12} className="text-indigo-500" /> Neural Sync Active</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" /> Secure</span>
        </div>
        <span>v2.1.0-Elite (SEO Edition)</span>
      </footer>
    </div>
  );
};

export default App;