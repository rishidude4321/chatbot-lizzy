"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Send, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";


export default function Home() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to LEAP Innovations. We believe every district is on a journey toward a more learner-centered future. To help us map the best path forward, what 'LEAP' can we help you take? What specific challenges or goals do you have regarding personalized and student-centered learning?",
    },
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 1. Add user message
    const userMsg = { id: Date.now().toString(), role: "user" as const, content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // 2. Prepare placeholder for streaming assistant response
    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMsgId, role: "assistant", content: "" }]);

    try {
      // 3. Call backend API route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, sessionId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to fetch response");
      }

      // 4. Read the text stream chunk-by-chunk
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Update the bot message content in real time
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, content: accumulatedText } : msg
          )
        );
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, content: "Sorry, I ran into an issue connecting to OpenRouter. Please try again." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* 1. Header with Official LEAP Logo */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-4">
          <Image
            src="/LEAP_Logo.webp"
            alt="LEAP Innovations Logo"
            width={160}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="hidden sm:inline-block text-slate-300">|</span>
          <span className="hidden sm:inline-block text-sm font-medium text-slate-500">
            Leaping Lizzy
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Active Session</span>
        </div>
      </header>

      {/* 2. Main Chat Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full space-y-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                m.role === "user"
                  ? "bg-[#0F1D32] text-white"
                  : "bg-[#00A3E0] text-white"
              }`}
            >
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[82%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[#00A3E0] text-white rounded-tr-none font-medium"
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs"
              }`}
            >
            {m.role === "user" ? (
              <p className="whitespace-pre-line">{m.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none text-slate-800 space-y-2">
                {m.content ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  isLoading && <span className="text-slate-400 italic">Thinking...</span>
                )}
              </div>
            )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Input Bar */}
      <footer className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            disabled={isLoading}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3E0] focus:bg-white transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-[#00A3E0] hover:bg-[#008fca] disabled:opacity-40 text-white font-medium px-5 py-3 rounded-xl transition flex items-center gap-2 text-sm shadow-xs cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

    </main>
  );
}