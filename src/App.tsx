import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import { getChatResponse } from './services/gemini';

// FIX - Build error sari panniyachu
const VoiceVisualizer = () => null;
const TypingIndicator = () => {
  return <div className="flex gap-1 p-2"><span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span><span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span></div>
};

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: "Vanakkam! St. Peter's SPIHER Assistant da! En kita BCA Department, HOD Dr. R. Latha, Placements, Fees pathi kekalam da!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getChatResponse(currentInput);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Error da, konjam time kazhichu try pannu da!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><GraduationCap /></div>
        <div>
          <h1 className="font-bold text-slate-900">SPIHER Assistant</h1>
          <p className="text-xs text-slate-500">St. Peter's BCA Department</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl w-full mx-auto">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user'? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user'? 'bg-indigo-600 text-white' : 'bg-white border shadow-sm text-slate-800'}`}>
              <p className="text-sm whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-white border p-4 rounded-2xl shadow-sm"><TypingIndicator /></div></div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t sticky bottom-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="En kita ketpa? Ex: Who is HOD?"
            className="flex-1 px-4 py-3 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={isLoading} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50">
            {isLoading? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}
