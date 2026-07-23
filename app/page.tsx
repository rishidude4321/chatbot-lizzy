"use client";

import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* SECTION 1: TOP HEADER */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Leaping Lizzy</h1>
            <p className="text-xs text-cyan-400 font-medium">LEAP Innovations Navigator</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Ready to assist</span>
        </div>
      </header>

      {/* SECTION 2: CHAT CONTAINER (Empty for now) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* We will place the Welcome Card and Message Bubbles here next */}
      </div>

      {/* SECTION 3: INPUT FOOTER (Empty for now) */}
      <footer className="p-4 bg-white border-t border-slate-200 max-w-4xl mx-auto w-full">
        {/* We will place the Text Input and Send button here */}
      </footer>

    </main>
  );
}