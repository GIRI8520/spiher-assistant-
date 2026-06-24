import React, { useState, Component, ReactNode, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MicOff, Loader2, RefreshCcw } from 'lucide-react';
import Markdown from 'react-markdown';
import { getChatResponse } from './services/gemini';

// 1. Error Boundary (App crash aagama irukka)
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl">
          <RefreshCcw size={18}/> Refresh Page
        </button>
      </div>
    );
    return this.props.children;
  }
}

// 2. Main App Component
export default function App() {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getChatResponse(userMsg);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch {
      alert("Error connecting to AI");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white border-x">
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                <Markdown>{m.text}</Markdown>
              </div>
            </div>
          ))}
          {isLoading && <Loader2 className="animate-spin text-indigo-600 ml-4" />}
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t flex items-center gap-2">
          <button onClick={() => setIsListening(!isListening)} className={`p-3 rounded-xl ${isListening ? 'bg-red-500 text-white' : 'bg-slate-100'}`}>
            {isListening ? <MicOff size={20}/> : <Mic size={20}/>}
          </button>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 p-3 bg-slate-100 rounded-xl outline-none" 
            placeholder="Type here..." 
          />
          <button onClick={handleSend} className="p-3 bg-indigo-600 text-white rounded-xl">
            <Send size={20} />
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
