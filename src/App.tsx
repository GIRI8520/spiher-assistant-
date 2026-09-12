import React, { useState, useRef, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  isToday, parseISO
} from 'date-fns';
import { 
  Send, Bot, User, Loader2, GraduationCap, Building2, 
  Users, BookOpen, Briefcase, Mic, MicOff, Volume2, 
  VolumeX, Sparkles, ChevronRight, Info, MapPin, Phone, Mail,
  MessageCircle, X, Facebook, Twitter, Linkedin, RefreshCcw,
  LogIn, LogOut, ClipboardCheck, Calendar, CheckCircle2, AlertCircle, ExternalLink, Navigation, Search, Quote,
  ChevronLeft, XCircle, Info as InfoIcon, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { getChatResponse, getSpeechResponse } from './services/gemini';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, 
  serverTimestamp, Timestamp, OperationType, handleFirestoreError,
  FirestoreErrorInfo
} from './firebase';
import { COURSES, FACULTY, TESTIMONIALS, ACADEMIC_EVENTS } from './constants';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { TypingIndicator } from './components/TypingIndicator';

// Types for notifications
type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  message: string;
  type: NotificationType;
  id: number;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  audioUrl?: string;
}

// Extend Window interface for SpeechRecognition and AI Studio
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    aistudio: {
      openSelectKey: () => Promise<void>;
      hasSelectedApiKey: () => Promise<boolean>;
    };
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 text-center space-y-6 shadow-xl">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
              <X className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Something went wrong</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-4 p-4 bg-slate-100 rounded-xl text-left overflow-auto max-h-40">
                <code className="text-[10px] text-slate-600 font-mono">
                  {this.state.error?.toString()}
                </code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const NotificationToast = ({ notifications, removeNotification }: { notifications: Notification[], removeNotification: (id: number) => void }) => {
  return (
    <div className="fixed top-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px] max-w-[400px] ${
              n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              n.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> :
             n.type === 'error' ? <XCircle className="w-5 h-5 text-rose-600 shrink-0" /> :
             <InfoIcon className="w-5 h-5 text-indigo-600 shrink-0" />}
            
            <p className="text-sm font-medium leading-tight flex-1">{n.message}</p>
            
            <button 
              onClick={() => removeNotification(n.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-40 hover:opacity-100" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Testimonial Card Component
const TestimonialCard = ({ t }: { t: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div 
      layout
      whileHover={{ scale: 1.01 }}
      className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex flex-col relative group overflow-hidden h-fit"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Quote className="w-24 h-24 text-indigo-600" />
      </div>
      
      <div className="flex-1 space-y-6 relative z-10">
        <div className="flex gap-1 text-amber-400">
          {[...Array(5)].map((_, i) => <Sparkles key={i} className="w-3 h-3 fill-current" />)}
        </div>
        
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed italic text-lg">"{t.quote}"</p>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-6 border-t border-slate-100 mt-2 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                    <Sparkles className="w-3 h-3" />
                    Student Journey
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {t.story}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline group/btn"
        >
          {isExpanded ? "Show Less" : "Read Full Success Story"}
          <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? '-rotate-90' : 'group-hover/btn:translate-x-1'}`} />
        </button>
        
        <div className="flex items-center gap-4 pt-6 border-t border-slate-50">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xl shadow-inner">
            {t.name[0]}
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-900 text-lg">{t.name}</div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>{t.role}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-indigo-600">{t.company}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>Class of {t.year}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Calendar Section Component
const CalendarSection = ({ setShowChat, handleSend }: { setShowChat: (v: boolean) => void, handleSend: (e?: React.FormEvent, textOverride?: string) => Promise<void> }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 15)); // May 2026 as per metadata
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getEventsForDay = (day: Date) => {
    return ACADEMIC_EVENTS.filter(event => isSameDay(parseISO(event.date), day));
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="pt-24 space-y-12 text-left w-full">
      <div className="space-y-4 text-center">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Calendar</h2>
        <p className="text-slate-500 max-w-xl mx-auto">Stay updated with important academic dates, symposiums, and department events.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-4 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">{format(currentDate, 'MMMM yyyy')}</h3>
            <div className="flex gap-2">
              <button 
                onClick={prevMonth} 
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button 
                onClick={nextMonth} 
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                aria-label="Next Month"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);

              return (
                <div 
                  key={i} 
                  className={`min-h-[80px] md:min-h-[100px] p-2 border rounded-2xl transition-all relative flex flex-col gap-1 ${
                    isCurrentMonth ? 'border-slate-50' : 'border-transparent opacity-20'
                  } ${isTodayDate ? 'bg-indigo-50/50 border-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  <span className={`text-[10px] font-bold ${isTodayDate ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayEvents.map((event, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedEvent(event)}
                        className={`text-[8px] md:text-[9px] p-1.5 rounded-lg text-left font-bold truncate transition-all hover:scale-105 active:scale-95 ${
                          event.category === 'Academic' 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {event.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Event Details or Legend */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col h-full min-h-[400px]">
          <AnimatePresence mode="wait">
            {selectedEvent ? (
              <motion.div
                key={selectedEvent.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col"
              >
                <div className="flex justify-between items-start">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedEvent.category === 'Academic' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {selectedEvent.category}
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(selectedEvent.date), 'PPPP')}
                  </div>
                  <h3 className="text-2xl font-bold leading-tight">{selectedEvent.title}</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Location</div>
                    <div className="flex items-center gap-2 text-sm italic">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      {selectedEvent.location}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Description</div>
                    <p className="text-sm text-slate-300 leading-relaxed font-light">{selectedEvent.description}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setShowChat(true);
                    handleSend(undefined, `Remind me about ${selectedEvent.title} on ${selectedEvent.date}`);
                  }}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 mt-auto shadow-xl"
                >
                  <Sparkles className="w-4 h-4" />
                  Ask Assistant About This
                </button>
              </motion.div>
            ) : (
              <div className="space-y-8 flex-1 flex flex-col">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Event Planner</h3>
                  <p className="text-slate-400 text-sm">Select an event from the calendar to view participation details and venue information.</p>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]"></div>
                      <span className="text-sm font-bold">Academic Milestone</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Exams, faculty meetings, and reopening dates.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
                      <span className="text-sm font-bold">Campus Life</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Symposiums, workshops, and culturals.</p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl relative overflow-hidden group">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute top-0 right-0 p-4 opacity-20"
                  >
                    <Quote className="w-16 h-16" />
                  </motion.div>
                  <p className="text-xs font-bold leading-relaxed relative z-10 italic">
                    "Success is where preparation and opportunity meet."
                  </p>
                  <div className="text-[8px] font-bold uppercase tracking-widest mt-2 opacity-60">Prepare for Upcoming Events</div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [showAttendance, setShowAttendance] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Welcome to St. Peter's Institute of Higher Education and Research (SPIHER). I am your dedicated Smart Assistant. How may I assist you today with information regarding our courses, campus facilities, or placements?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ hasKey: boolean; status: string; foundKeyName?: string } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [facultySearch, setFacultySearch] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const handleExportPDF = useCallback(() => {
    if (messages.length <= 1) {
      notify("No messages to export yet!", "info");
      return;
    }

    try {
      notify("Preparing your PDF download...", "info");
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Brand color palette (matching the college/BCA assistant style)
      const primaryColor = [79, 70, 229]; // Indigo-600
      const secondaryColor = [15, 23, 42]; // Slate-900
      const textColor = [51, 65, 85]; // Slate-700
      const lightGray = [248, 250, 252]; // Slate-50 background for user message box
      const lightIndigo = [245, 247, 255]; // Light indigo-50 bg for bot message box
      
      let y = 25; // Vertical cursor tracks drawing flow

      // Helper function to build page header and footer decorations
      const applyPageDecorations = (pageNum: number) => {
        // Slim slate top accent line
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.4);
        doc.line(margin, 15, pageWidth - margin, 15);
        
        // Solid professional footer
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(
          'St. Peter’s Institute of Higher Education and Research  |  BCA Department',
          margin,
          pageHeight - 12
        );
        doc.text(
          `Page ${pageNum}`,
          pageWidth - margin,
          pageHeight - 12,
          { align: 'right' }
        );
      };

      // --- FIRST PAGE BRANDED BANNER ---
      applyPageDecorations(1);
      
      // College Heading
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("ST. PETER'S INSTITUTE OF HIGHER EDUCATION AND RESEARCH", margin, y);
      y += 5.5;
      
      // College details
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text('Approved by AICTE • Avadi, Chennai - 600 054, Tamil Nadu', margin, y);
      y += 5;
      
      // Department / Doc Subtitle
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('BCA Smart Assistant — Conversation Transcript', margin, y);
      y += 6;

      // Metadata Section
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      const formattedDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.text(`Generated on: ${formattedDate}  •  Total Messages: ${messages.length}`, margin, y);
      y += 8;

      // Clean elegant separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.7);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      let currentPage = 1;

      // Loop over actual messages and render beautifully
      messages.forEach((msg) => {
        const isUser = msg.role === 'user';
        const senderLabel = isUser ? 'YOU' : 'SPIHER ASSISTANT';
        
        let msgTime = '';
        try {
          if (msg.timestamp) {
            const dateObj = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
            msgTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        } catch (_) {}

        // Strip markdown structures so we get a super clean text inside our PDF boxes
        let cleanText = msg.text
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold markdown -> Plain
          .replace(/\*([^*]+)\*/g, '$1')     // Italic markdown -> Plain
          .replace(/`([^`]+)`/g, '$1')       // Code snippet inline -> Plain
          .replace(/#+\s+([^\n]+)/g, '$1')    // Headers -> Plain
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)'); // MD Links -> "Text (Url)"

        // Use splitTextToSize to safely wrap long sentences to fit our line constraints
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        const textLines = doc.splitTextToSize(cleanText, contentWidth - 14); // 7mm padding on each side
        
        const lineSpacing = 4.8;
        const totalTextHeight = textLines.length * lineSpacing;
        const messageBoxHeight = totalTextHeight + 14; // Include internal padding space

        // Detect if rendering this message box exceeds our target vertical height space on the page
        if (y + messageBoxHeight > pageHeight - 25) {
          doc.addPage();
          currentPage++;
          applyPageDecorations(currentPage);
          y = 25; // Reset top pointer for the new page
        }

        // Draw Message Box Background and Borders
        const bgColor = isUser ? lightGray : lightIndigo;
        const borderColor = isUser ? [241, 245, 249] : [224, 231, 255];
        
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.3);
        
        // Draw elegant rounded rectangular container
        doc.roundedRect(margin, y, contentWidth, messageBoxHeight, 3, 3, 'FD');

        // Draw Metadata Header (Sender and Time) inside container
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(isUser ? 100 : 79, isUser ? 116 : 70, isUser ? 139 : 229); // user vs bot colors
        doc.text(`${senderLabel}  |  ${msgTime}`, margin + 7, y + 6);

        // Render Message Paragraph Lines
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85); // dark grey-blue readability text

        let paragraphY = y + 11;
        textLines.forEach((line: string) => {
          doc.text(line, margin + 7, paragraphY);
          paragraphY += lineSpacing;
        });

        // Add spacer layout padding for the next component
        y += messageBoxHeight + 6;
      });

      // Save document natively in browser sandbox
      const fileTimestamp = Date.now().toString().slice(-6);
      doc.save(`SPIHER_Assistant_Chat_Export_${fileTimestamp}.pdf`);
      notify("Conversation successfully exported to PDF!", "success");
    } catch (err) {
      console.error("Export component crash: ", err);
      notify("Failed to export. Please try again.", "error");
    }
  }, [messages, notify]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
  const hasMapsKey = Boolean(GOOGLE_MAPS_KEY);
  const campusLocation = { lat: 13.1206, lng: 80.1174 }; // SPIHER Coordinates
  
  const filteredFaculty = FACULTY.filter(member => 
    member.name.toLowerCase().includes(facultySearch.toLowerCase()) || 
    member.expertise.toLowerCase().includes(facultySearch.toLowerCase())
  );

  const checkHealth = useCallback(async (silent: boolean = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
      const data = await res.json();
      setApiStatus({ hasKey: data.hasKey, status: data.status, foundKeyName: data.foundKeyName });
    } catch (e: any) {
      console.error("Health check failed", e);
      // Only notify if silent is explicitly false (not true)
      if (silent !== true) {
        notify("Network error: Unable to reach the backend services. The server might still be booting up.", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [notify]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user profile
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            // Create default student profile
            const newProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Student',
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              role: 'student',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            notify(`Welcome to SPIHER, ${currentUser.displayName}!`, "success");
          }
        } catch (error: any) {
          try {
            const errorInfo: FirestoreErrorInfo = JSON.parse(error.message);
            notify(`Database Error: ${errorInfo.error}`, "error");
          } catch {
            notify("Failed to sync your profile with the database.", "error");
          }
        }
      } else {
        setUserProfile(null);
        setAttendanceRecords([]);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Attendance Listener
  useEffect(() => {
    if (!user || !userProfile) return;

    let q;
    if (userProfile.role === 'student') {
      q = query(collection(db, 'attendance'), where('studentUid', '==', user.uid));
    } else {
      // Faculty sees all records (for simplicity in this demo)
      q = query(collection(db, 'attendance'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records.sort((a: any, b: any) => b.markedAt?.seconds - a.markedAt?.seconds));
    }, (error) => {
      try {
        const errorInfo: FirestoreErrorInfo = JSON.parse(error.message);
        notify(`Attendance Update Error: ${errorInfo.error}`, "error");
      } catch {
        notify("Unable to sync attendance records at this time.", "error");
      }
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  // Check API Health on mount (silent to prevent noisy boot-up errors)
  useEffect(() => {
    checkHealth(true);
  }, [checkHealth]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (showChat) scrollToBottom();
  }, [messages, scrollToBottom, showChat]);

  // ... (rest of the logic remains the same, just adding the landing page state)

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Support Indian English/Tamil context

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Automatically send after a short delay if it's a voice command
        setTimeout(() => {
          handleSend(undefined, transcript);
        }, 500);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition start error:", e);
        notify("Could not start microphone. Please check permissions.", "error");
      }
    }
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Refresh health check after a short delay
      setTimeout(async () => {
        const res = await fetch('/api/health');
        const data = await res.json();
        setApiStatus({ hasKey: data.hasKey, status: data.status, foundKeyName: data.foundKeyName });
      }, 2000);
    } else {
      setShowSetupGuide(true);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      notify("Log in successful", "success");
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Login failed", error);
      notify("Login failed: " + error.message, "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowChat(false);
      setShowAttendance(false);
      notify("Logged out successfully", "info");
    } catch (error: any) {
      console.error("Logout failed", error);
      notify("Logout failed: " + error.message, "error");
    }
  };

  const syncDataToFirebase = async () => {
    if (!user || userProfile?.role !== 'admin') return;
    setIsLoading(true);
    try {
      // Sync Department Info
      await setDoc(doc(db, 'department', 'info'), {
        name: "Bachelor of Computer Applications (BCA)",
        hod: "Dr. R. Latha",
        assistantHod: "Dr. D. Kavitha",
        staff: [
          "Subashini", "Rajakumari", "Jagadeesh", "Vinotha", "Komathi", 
          "Priyanka", "Vasanthi", "Sharonu Rani", "Nandhini", "Sasikala", 
          "Anandhi", "Rajkumar", "Deepa"
        ],
        courses: ["BCA (General)", "BCA Artificial Intelligence", "BCA Data Science", "MCA", "PhD in Computer Science"],
        fees: {
          "BCA": "60,000 INR",
          "MCA": "75,000 INR",
          "BCA AI": "90,000 INR",
          "BCA Data Science": "90,000 INR"
        },
        updatedAt: serverTimestamp()
      });

      // Sync Placement Info
      await setDoc(doc(db, 'placements', 'stats'), {
        highestPackage: "6 LPA",
        onCampusPlacements: 54,
        recruiters: [
          "Cognizant", "Tech Mahindra", "HCL", "TVS", "Accenture", "Infosys", 
          "Oracle", "Canara Bank", "Relevantz", "Paradigm IT", "Signify", 
          "Toyota Info", "Zebia", "Tata Consultancy Services (TCS)", "Temenos"
        ],
        updatedAt: serverTimestamp()
      });

      notify("Data successfully synced to Firebase!", "success");
    } catch (error: any) {
      try {
        const errorInfo: FirestoreErrorInfo = JSON.parse(error.message);
        notify(`Sync Error: ${errorInfo.error}`, "error");
      } catch {
        notify("Failed to sync system data.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendance = async (studentUid: string, studentName: string, status: 'present' | 'absent' | 'late') => {
    if (!user || (userProfile?.role !== 'faculty' && userProfile?.role !== 'admin')) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      await addDoc(collection(db, 'attendance'), {
        studentUid,
        studentName,
        date: today,
        status,
        markedBy: user.uid,
        markedAt: serverTimestamp(),
      });
      notify(`Attendance marked for ${studentName}`, "success");
    } catch (error: any) {
      try {
        const errorInfo: FirestoreErrorInfo = JSON.parse(error.message);
        notify(`Attendance Error: ${errorInfo.error}`, "error");
      } catch {
        notify("Could not record attendance at this moment.", "error");
      }
    }
  };

  const playAudio = async (base64Data: string) => {
    try {
      const binary = atob(base64Data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // 16-bit PCM means 2 bytes per sample
      const numSamples = len / 2;
      const audioBuffer = audioContext.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);
      
      const dataView = new DataView(bytes.buffer);
      for (let i = 0; i < numSamples; i++) {
        const sample = dataView.getInt16(i * 2, true);
        channelData[i] = sample / 32768;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      setIsPlaying(true);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  const handleSend = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getChatResponse(messageText);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I apologize, but I encountered an error processing your request.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false); // Stop loading early

      // Fetch speech response in background to reduce perceived latency
      if (isVoiceEnabled) {
        getSpeechResponse(responseText).then(audioData => {
          if (audioData) {
            playAudio(audioData);
          }
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const isPermissionError = error.message.includes('PERMISSION_DENIED') || error.message.includes('403');
      
      if (isPermissionError) {
        notify("API Key missing or invalid. Set GEMINI_API_KEY in Secrets.", "error");
      } else {
        notify("Assistant encountered a problem. Please try again.", "error");
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: isPermissionError 
          ? "⚠️ **API Permission Error**: The Gemini API key is either missing or invalid. Please ensure you have added a valid `GEMINI_API_KEY` to the Secrets panel in AI Studio settings."
          : "I am currently experiencing technical difficulties. Please try again shortly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks = [
    { icon: <BookOpen className="w-4 h-4" />, label: "Academic Programs", query: "What courses are offered?" },
    { icon: <Users className="w-4 h-4" />, label: "Faculty Leadership", query: "Who is the HOD and staff?" },
    { icon: <Briefcase className="w-4 h-4" />, label: "Career Placements", query: "Tell me about placement details." },
    { icon: <Building2 className="w-4 h-4" />, label: "Infrastructure", query: "What lab facilities do you have?" },
    { icon: <Info className="w-4 h-4" />, label: "Help & Support", query: "What should I do if you can't answer my question?" },
  ];

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing SPIHER Portal...</div>
        </div>
        <NotificationToast notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      </div>
    );
  }

  if (!showChat) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-100 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        <header className="relative z-10 py-6 px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="https://spihar.ac.in/wp-content/uploads/2021/05/logo.png" 
              alt="St. Peter's Logo" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tighter text-slate-900 leading-none">ST. PETER'S</span>
                <img 
                  src="https://spihar.ac.in/wp-content/uploads/2023/02/naac-logo.png" 
                  alt="NAAC A+" 
                  className="h-8 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[8px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-1">Ignite • Inspire • Innovate</span>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-500 items-center">
            <a href="#" className="hover:text-indigo-600 transition-colors">Courses</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Faculty</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Placements</a>
            <a href="/portfolio/index.html" target="_blank" className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all text-[10px] font-bold uppercase tracking-widest">Portfolio</a>
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-900">{user.displayName}</span>
                    <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest">{userProfile?.role || 'Student'}</span>
                  </div>
                  {userProfile?.role === 'admin' && (
                    <button 
                      onClick={syncDataToFirebase}
                      className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                      title="Sync Data to Firebase"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )}
            </div>
          </nav>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-bold tracking-widest uppercase mb-4">
              <Sparkles className="w-4 h-4" />
              St. Peter's Institute of Higher Education and Research
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
              Smart Intelligence for <br />
              <span className="text-indigo-600">SPIHER Campus</span>
            </h1>
            
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Experience the future of college inquiries. Our AI Voice Assistant understands Tamil, Tanglish, and English to help you instantly.
              </p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-[0.3em] text-[10px] uppercase pt-2">
                <span>Ignite</span>
                <span className="w-1 h-1 bg-indigo-300 rounded-full"></span>
                <span>Inspire</span>
                <span className="w-1 h-1 bg-indigo-300 rounded-full"></span>
                <span>Innovate</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
              {[
                { label: "Publications", value: "7,500+" },
                { label: "Funded Projects", value: "250+" },
                { label: "Patents", value: "1,218+" },
                { label: "Research Programs", value: "21+" }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <div className="text-2xl font-bold text-indigo-600">{stat.value}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-6">
              {["English", "தமிழ் (Tamil)", "Tanglish"].map((lang, i) => (
                <div key={i} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {lang} Supported
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowChat(true)}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all"
              >
                Start AI Assistant
                <ChevronRight className="w-5 h-5" />
              </motion.button>
              {user ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowChat(true); setShowAttendance(true); }}
                  className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-lg border border-slate-200 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                  Attendance Portal
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogin}
                  className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-lg border border-slate-200 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <LogIn className="w-5 h-5 text-indigo-600" />
                  Login to Portal
                </motion.button>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left space-y-3 hover:border-indigo-500/30 transition-colors group shadow-sm">
                <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">Our Location</h3>
                <p className="text-sm text-slate-500">Avadi, Chennai – 600 054, Tamil Nadu.</p>
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left space-y-3 hover:border-violet-500/30 transition-colors group shadow-sm">
                <div className="bg-violet-50 w-10 h-10 rounded-xl flex items-center justify-center text-violet-600 group-hover:bg-violet-100 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">Contact Us</h3>
                <p className="text-sm text-slate-500">+91 94456 38085 <br /> +91 91505 34663</p>
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left space-y-3 hover:border-amber-500/30 transition-colors group shadow-sm">
                <div className="bg-amber-500/10 w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-500/20 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">Email Support</h3>
                <p className="text-sm text-slate-500">info@spiher.ac.in <br /> admissions@spiher.ac.in</p>
              </div>
            </div>

            {/* Student Portals */}
            <div className="pt-20 grid grid-cols-1 md:grid-cols-2 gap-6">
              <a 
                href="https://insproplus.com/stpetersstudent" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-indigo-600 text-white p-8 rounded-[2.5rem] text-left space-y-4 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 group"
              >
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Student Portal</h3>
                  <p className="text-indigo-100 text-sm">Access your attendance, timetable, and academic records instantly.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest pt-2">
                  Visit Portal <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
              <a 
                href="https://insproplus.com/stpeterspay" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-slate-200 p-8 rounded-[2.5rem] text-left space-y-4 hover:border-indigo-500/30 transition-all shadow-sm group"
              >
                <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Fees Payment</h3>
                  <p className="text-slate-500 text-sm">Securely pay your college fees online through the official payment gateway.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest pt-2">
                  Pay Now <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>

            {/* Academic Programs Section */}
            <div className="pt-24 space-y-12 text-left">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Academic Programs</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Explore our diverse range of computer application courses designed for the future.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COURSES.map((course, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5 }}
                    className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:border-indigo-500/30 transition-all space-y-6 flex flex-col"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">{course.title}</h3>
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">{course.fee}</span>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1">
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{course.description}</p>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Prerequisites
                        </p>
                        <p className="text-sm text-slate-600 font-medium">{course.prerequisites}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Learning Outcomes
                        </p>
                        <p className="text-sm text-slate-600 font-medium">{course.outcomes}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Briefcase className="w-3 h-3 text-indigo-500" /> Career Prospects
                        </p>
                        <p className="text-sm text-slate-600 font-medium">{course.prospects}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setShowChat(true);
                        handleSend(undefined, `Tell me more about ${course.title}`);
                      }}
                      className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      Enquire Details
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Faculty Section */}
            <div className="pt-24 space-y-12 text-left">
              <div className="space-y-6 text-center">
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Meet Our Faculty</h2>
                  <p className="text-slate-500 max-w-xl mx-auto">Get to know the experts who will guide your academic journey at SPIHER.</p>
                </div>
                
                {/* Faculty Search Bar */}
                <div className="max-w-md mx-auto relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className={`w-5 h-5 transition-colors ${facultySearch ? 'text-indigo-500' : 'text-slate-400'}`} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or expertise (e.g. AI, Cloud)..."
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                  />
                  {facultySearch && (
                    <button 
                      onClick={() => setFacultySearch('')}
                      className="absolute inset-y-0 right-5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {filteredFaculty.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFaculty.map((member, i) => (
                    <motion.div 
                      key={i}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex flex-col"
                    >
                    <div className="flex items-center gap-5 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                        {member.name.split(' ').map(n => n[0]).join('').replace('.', '')}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{member.name}</h3>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{member.role}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      <p className="text-sm text-slate-500 leading-relaxed italic">"{member.bio}"</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs font-semibold">{member.expertise}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                          <Mail className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="text-xs font-medium">{member.email}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setShowChat(true);
                        handleSend(undefined, `Tell me more about ${member.name}`);
                      }}
                      className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      View Profile
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-50 rounded-[3rem] py-20 px-8 text-center border-2 border-dashed border-slate-200"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No faculty members found</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">We couldn't find any faculty matching "{facultySearch}". Try a different name or expertise.</p>
                  <button 
                    onClick={() => setFacultySearch('')}
                    className="mt-6 text-indigo-600 font-bold text-sm hover:underline"
                  >
                    Clear Search
                  </button>
                </motion.div>
              )}
            </div>

            {/* Testimonials Section */}
            <div className="pt-24 space-y-12 text-left">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Student Success Stories</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Hear from our graduates who have successfully transitioned from SPIHER corridors to corporate boardrooms.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {TESTIMONIALS.map((t, i) => (
                  <TestimonialCard key={i} t={t} />
                ))}
              </div>

              <div className="bg-indigo-600 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white shadow-xl shadow-indigo-600/20">
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-2xl font-bold">Ready to start your success story?</h3>
                  <p className="text-indigo-100 opacity-90 max-w-md">Our specialized BCA programs are designed to put you on the fast track to a global IT career.</p>
                </div>
                <button 
                  onClick={() => setShowChat(true)}
                  className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  Apply Now <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Academic Calendar Section */}
            <CalendarSection setShowChat={setShowChat} handleSend={handleSend} />

            {/* Campus Map Section */}
            <div className="pt-24 space-y-10 text-left">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Visit Our Campus</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Explore the state-of-the-art facilities at St. Peter's BCA Department.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm h-[400px] relative">
                  {!hasMapsKey ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                      <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
                        <MapPin className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Google Maps API Key Required</h3>
                      <p className="text-sm text-slate-500 max-w-sm mb-6">
                        To view the interactive campus map, please add your Google Maps API key to the project secrets.
                      </p>
                      <div className="space-y-3 text-xs text-left bg-white p-4 rounded-xl border border-slate-200 w-full max-w-xs">
                        <p className="font-bold text-slate-900">How to add:</p>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-500">
                          <li>Click the ⚙️ Gear icon (Settings)</li>
                          <li>Go to <strong>Secrets</strong></li>
                          <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
                          <li>Ensure <strong>Maps JavaScript API</strong> is enabled in your Google Console</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                      <Map
                        defaultCenter={campusLocation}
                        defaultZoom={17}
                        mapId="SPIHER_CAMPUS_MAP"
                        style={{ width: '100%', height: '100%' }}
                        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                        gestureHandling={'greedy'}
                        disableDefaultUI={false}
                      >
                        <AdvancedMarker position={campusLocation} title="BCA Department - SPIHER">
                          <Pin background="#4f46e5" glyphColor="#ffffff" borderColor="#3730a3">
                            <GraduationCap className="w-4 h-4 text-white" />
                          </Pin>
                        </AdvancedMarker>
                      </Map>
                    </APIProvider>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Contact Details</h3>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</p>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            BCA Department, Main Block,<br />
                            SPIHER Campus, Avadi,<br />
                            Chennai - 600 054.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                          <p className="text-sm text-slate-600 font-medium">+91 94456 38085</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                          <p className="text-sm text-slate-600 font-medium italic">csahod@spiher.ac.in</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                      <a 
                        href="https://www.google.com/maps/dir/?api=1&destination=13.1206,80.1174" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        <Navigation className="w-4 h-4" />
                        Get Directions
                      </a>
                      <a 
                        href="https://spihar.ac.in/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Institutional Website
                      </a>
                    </div>
                  </div>

                  {/* Maps Troubleshooting Tip Card */}
                  <div className="bg-amber-50/30 border border-amber-100/80 p-6 rounded-[2rem] text-amber-800 text-xs leading-relaxed flex gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-1">Interactive Map Tip</span>
                      If the map displays an "ApiNotActivatedMapError" or a blank box, please ensure you have activated both <strong>Maps JavaScript API</strong> and enabled billing on your Google Cloud Console project.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Impact */}
            <div className="pt-24 bg-indigo-50/50 -mx-8 px-8 py-20 rounded-[4rem]">
              <div className="max-w-5xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Impact in Numbers</h2>
                  <p className="text-slate-500 max-w-xl mx-auto">A legacy of excellence and a future of innovation, measured by our students' success.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { label: "Graduated Students", value: "5000+", icon: <GraduationCap className="w-5 h-5" /> },
                    { label: "Research Papers", value: "7500+", icon: <BookOpen className="w-5 h-5" /> },
                    { label: "Campus Recruiters", value: "10+", icon: <Building2 className="w-5 h-5" /> },
                    { label: "Highest Package", value: "6 LPA", icon: <Briefcase className="w-5 h-5" /> }
                  ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                        {stat.icon}
                      </div>
                      <div className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Vision & Mission */}
            <div className="pt-24 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-indigo-600 text-white p-10 rounded-[3rem] text-left space-y-6 relative overflow-hidden shadow-xl shadow-indigo-600/20">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Sparkles className="w-32 h-32" />
                </div>
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Our Vision</h2>
                <p className="text-indigo-100 leading-relaxed">
                  To be a center of excellence in Computer Applications, fostering innovation, research, and ethical professional practices to meet global technological challenges.
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-10 rounded-[3rem] text-left space-y-6 shadow-sm hover:border-indigo-200 transition-colors">
                <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Our Mission</h2>
                <ul className="space-y-4 text-slate-500 text-sm">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    To provide quality education through state-of-the-art infrastructure and experienced faculty.
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    To encourage research and development in emerging technologies like AI, Data Science, and IoT.
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    To bridge the gap between academia and industry through regular workshops and internships.
                  </li>
                </ul>
              </div>
            </div>

            {/* AI Performance & Accuracy */}
            <div className="pt-24 space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">AI Assistant Performance</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Our Smart Assistant is rigorously tested for accuracy and reliability across various query categories.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Query Category</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Tests</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Correct Responses</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { cat: "HOD Enquiries", tests: 40, correct: 40, acc: "100%" },
                        { cat: "Assistant HOD Enquiries", tests: 20, correct: 20, acc: "100%" },
                        { cat: "Faculty List Enquiries", tests: 40, correct: 38, acc: "95.0%" },
                        { cat: "Course Information", tests: 40, correct: 39, acc: "97.5%" },
                        { cat: "Laboratory Facilities", tests: 40, correct: 38, acc: "95.0%" },
                        { cat: "General Greetings", tests: 20, correct: 20, acc: "100%" },
                        { cat: "Out-of-scope Queries", tests: 30, correct: 28, acc: "93.3%" }
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 text-sm font-bold text-slate-700">{row.cat}</td>
                          <td className="px-8 py-4 text-sm text-slate-500 text-center">{row.tests}</td>
                          <td className="px-8 py-4 text-sm text-slate-500 text-center">{row.correct}</td>
                          <td className="px-8 py-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.acc === '100%' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {row.acc}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* HOD Message */}
            <div className="pt-24">
              <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 group">
                <div className="flex flex-col md:flex-row">
                  {/* Image Section - To One Side */}
                  <div className="md:w-2/5 relative h-[400px] md:h-auto overflow-hidden border-r border-slate-100">
                    <img 
                      src="https://picsum.photos/seed/hod-portrait-professional/800/1000" 
                      alt="HOD BCA - Dr. R. Latha" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                    <div className="absolute bottom-8 left-8 text-white">
                      <div className="bg-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
                        Department Head
                      </div>
                      <h3 className="text-2xl font-bold">Dr. R. Latha</h3>
                      <p className="text-sm opacity-80 font-medium text-indigo-200">M.C.A., M.Phil., Ph.D.</p>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="md:w-3/5 p-8 md:p-16 flex flex-col justify-center space-y-8 bg-slate-50/50">
                    <div className="space-y-6">
                      <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
                      <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                        "Empowering <span className="text-indigo-600">Innovation</span> & Academic Excellence."
                      </h2>
                      <div className="relative">
                        <span className="absolute -top-4 -left-4 text-6xl text-slate-200 font-serif opacity-50">"</span>
                        <p className="text-slate-600 leading-relaxed text-lg italic relative z-10">
                          Welcome to the Department of Computer Applications at SPIHER. Our mission is to bridge the gap between academia and industry by providing a robust curriculum and hands-on experience. We are committed to shaping the tech leaders of tomorrow through research-driven education and holistic development.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 pt-4">
                      <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
                        View Faculty Profile <ChevronRight className="w-4 h-4" />
                      </button>
                      <button className="px-8 py-4 bg-white border border-slate-200 hover:border-indigo-200 text-slate-700 rounded-2xl font-bold text-sm transition-all flex items-center gap-2">
                        Contact HOD <Mail className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-200">
                      <div>
                        <div className="text-2xl font-bold text-slate-900">20+</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Years Experience</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">50+</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Research Papers</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Research & Innovation */}
            <div className="pt-24 space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Research & Innovation</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Pushing the boundaries of technology through dedicated research labs and student-led projects.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    title: "AI & Machine Learning", 
                    desc: "Developing intelligent systems for healthcare and automation.",
                    icon: <Sparkles className="w-5 h-5" />,
                    color: "bg-indigo-50 text-indigo-600"
                  },
                  { 
                    title: "Cyber Security", 
                    desc: "Protecting digital assets and networks from evolving threats.",
                    icon: <Info className="w-5 h-5" />,
                    color: "bg-violet-50 text-violet-600"
                  },
                  { 
                    title: "Cloud Computing", 
                    desc: "Optimizing scalable architectures for modern enterprises.",
                    icon: <Building2 className="w-5 h-5" />,
                    color: "bg-emerald-50 text-emerald-600"
                  },
                  { 
                    title: "Data Analytics", 
                    desc: "Extracting meaningful insights from complex datasets.",
                    icon: <Users className="w-5 h-5" />,
                    color: "bg-amber-50 text-amber-600"
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] text-left space-y-4 hover:shadow-lg transition-all group">
                    <div className={`${item.color} w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    <button className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                      Learn More <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Logo Evolution Section */}
            <div className="pt-20 space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Legacy & Evolution</h2>
                <p className="text-slate-500 max-w-xl mx-auto">From St. Peter's Engineering College (SPEC) to a Deemed to be University (SPIHER), our identity has evolved while our commitment to excellence remains unchanged.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center gap-6 group hover:border-indigo-200 transition-all">
                  <div className="w-32 h-32 bg-slate-50 rounded-2xl flex items-center justify-center p-4 grayscale group-hover:grayscale-0 transition-all">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/St._Peter%27s_Engineering_College_logo.png/220px-St._Peter%27s_Engineering_College_logo.png" 
                      alt="Old SPEC Logo" 
                      className="w-full h-full object-contain opacity-60 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">1993 - 2008</div>
                    <h3 className="font-bold text-slate-900">St. Peter's Engineering College</h3>
                    <p className="text-xs text-slate-500 mt-2">The foundation of our engineering excellence, affiliated with Anna University.</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-indigo-100 p-8 rounded-[2.5rem] shadow-md flex flex-col items-center gap-6 group hover:border-indigo-300 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="bg-indigo-600 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">Current</div>
                  </div>
                  <div className="w-32 h-32 bg-indigo-50 rounded-2xl flex items-center justify-center p-4">
                    <img 
                      src="https://spihar.ac.in/wp-content/uploads/2021/05/logo.png" 
                      alt="Current SPIHER Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">2008 - Present</div>
                    <h3 className="font-bold text-slate-900">SPIHER Deemed University</h3>
                    <p className="text-xs text-slate-500 mt-2">UGC recognized Deemed to be University, offering diverse research and higher education programs.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Gallery */}
            <div className="pt-24 space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Department Gallery</h2>
                  <p className="text-slate-500">Glimpses of our state-of-the-art infrastructure and student life.</p>
                </div>
                <button className="text-indigo-600 font-bold text-sm flex items-center gap-2 hover:underline">
                  View All Photos <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 h-64 bg-slate-100 rounded-[2rem] overflow-hidden relative group">
                  <img 
                    src="https://picsum.photos/seed/college-lab/1200/600" 
                    alt="Computer Lab" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <div className="text-white">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Infrastructure</div>
                      <h4 className="font-bold text-lg">Advanced Computing Laboratory</h4>
                    </div>
                  </div>
                </div>
                <div className="h-64 bg-slate-100 rounded-[2rem] overflow-hidden relative group">
                  <img 
                    src="https://picsum.photos/seed/college-library/600/600" 
                    alt="Library" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Resources</div>
                      <h4 className="font-bold">Digital Library</h4>
                    </div>
                  </div>
                </div>
                <div className="h-64 bg-slate-100 rounded-[2rem] overflow-hidden relative group">
                  <img 
                    src="https://picsum.photos/seed/college-seminar/600/600" 
                    alt="Seminar Hall" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Events</div>
                      <h4 className="font-bold">Seminar Hall</h4>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 h-64 bg-slate-100 rounded-[2rem] overflow-hidden relative group">
                  <img 
                    src="https://picsum.photos/seed/college-campus/1200/600" 
                    alt="Campus View" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <div className="text-white">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Campus</div>
                      <h4 className="font-bold text-lg">Main Academic Block</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Events & News */}
            <div className="pt-24 space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">News & Upcoming Events</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Stay updated with the latest happenings in the BCA department.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {[
                  { 
                    date: "APR 15", 
                    title: "National Level Symposium: TECHNO-2026", 
                    desc: "Join us for a day of innovation, coding challenges, and paper presentations.",
                    type: "Event"
                  },
                  { 
                    date: "APR 22", 
                    title: "Workshop on Generative AI & LLMs", 
                    desc: "Hands-on session on building applications with Gemini and other AI models.",
                    type: "Workshop"
                  },
                  { 
                    date: "MAY 05", 
                    title: "Campus Placement Drive: Top IT MNCs", 
                    desc: "Final round of placements for the 2026 batch with leading tech companies.",
                    type: "Placement"
                  },
                  { 
                    date: "MAY 12", 
                    title: "Guest Lecture: Future of Cloud Computing", 
                    desc: "Industry experts from AWS sharing insights on serverless architectures.",
                    type: "Lecture"
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl flex gap-6 hover:shadow-md transition-shadow group">
                    <div className="flex-shrink-0 w-16 h-16 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600 border border-indigo-100">
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{item.date.split(' ')[0]}</span>
                      <span className="text-xl font-black leading-none">{item.date.split(' ')[1]}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest">{item.type}</div>
                      <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="pt-24 space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Quick answers to common inquiries about our department.</p>
              </div>

              <div className="max-w-3xl mx-auto space-y-4 text-left">
                {[
                  { q: "What are the eligibility criteria for BCA?", a: "Candidates should have passed 10+2 with Mathematics/Computer Science as one of the subjects." },
                  { q: "Do you provide placement assistance?", a: "Yes, we have a dedicated placement cell that works with top IT and non-IT companies for student recruitment." },
                  { q: "Are there any research opportunities for students?", a: "Absolutely. We encourage students to participate in research projects, paper publications, and innovation challenges." },
                  { q: "What are the lab timings?", a: "Labs are open from 9:00 AM to 4:30 PM on all working days. Special sessions can be arranged upon request." }
                ].map((faq, i) => (
                  <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      {faq.q}
                    </h4>
                    <p className="text-sm text-slate-500 pl-4.5">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial Preview */}
            <div className="pt-20 pb-10">
              <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles className="w-24 h-24 text-indigo-600" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => <Sparkles key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-xl italic text-slate-600 leading-relaxed">
                    "The BCA department's new AI assistant is a game-changer. I got all my admission and fee details in seconds, even when I asked in Tanglish!"
                  </p>
                  <div className="flex items-center gap-4 pt-4">
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-indigo-600">
                      AS
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900">Arun Sharma</div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Final Year Student</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        <footer className="relative z-10 bg-slate-900 pt-20 pb-10 px-8 text-white mt-20 rounded-t-[4rem]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded-xl">
                  <img 
                    src="https://spihar.ac.in/wp-content/uploads/2021/05/logo.png" 
                    alt="St. Peter's Logo" 
                    className="w-10 h-10 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tighter leading-none">ST. PETER'S</span>
                    <img 
                      src="https://spihar.ac.in/wp-content/uploads/2023/02/naac-logo.png" 
                      alt="NAAC A+" 
                      className="h-6 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[6px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Ignite • Inspire • Innovate</span>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                St. Peter's Institute of Higher Education and Research is a leading institution dedicated to providing quality education and fostering innovation in Computer Applications.
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://www.facebook.com/StPetersInstituteOfHigherEducationAndResearch/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all" 
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a 
                  href="https://twitter.com/SPIHER_Chennai" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all" 
                  title="X (Twitter)"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a 
                  href="https://www.linkedin.com/school/st-peter's-institute-of-higher-education-and-research/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all" 
                  title="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-4">
                Note: Social media links are based on official SPIHER records. Please verify for the latest updates.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6 text-indigo-400">Quick Links</h4>
              <ul className="space-y-3 text-xs text-slate-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Academic Calendar</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Fee Structure</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Exam Results</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Alumni Network</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6 text-indigo-400">Departments</h4>
              <ul className="space-y-3 text-xs text-slate-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Computer Science</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mechanical Engineering</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Civil Engineering</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Biotechnology</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Management Studies</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6 text-indigo-400">Contact Info</h4>
              <ul className="space-y-4 text-xs text-slate-400">
                <li className="flex gap-3">
                  <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>Avadi, Chennai, <br /> Tamil Nadu 600054</span>
                </li>
                <li className="flex gap-3">
                  <Phone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>+91 94456 38085 <br /> +91 91505 34663</span>
                </li>
                <li className="flex gap-3">
                  <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>info@spiher.ac.in</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="max-w-6xl mx-auto border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              © 2026 SPIHER Deemed University • Avadi, Chennai
            </div>
            <div className="flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Cookie Policy</a>
            </div>
          </div>
        </footer>
        <NotificationToast notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100">
      {/* Premium Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 py-4 px-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white p-1 rounded-xl shadow-sm border border-slate-100"
            >
              <img 
                src="https://spihar.ac.in/wp-content/uploads/2021/05/logo.png" 
                alt="St. Peter's Logo" 
                className="w-10 h-10 object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex flex-col leading-tight">
                <span>St. Peter's Institute of Higher Education and Research</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] my-0.5">Ignite • Inspire • Innovate</span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">BCA Smart Assistant</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAttendance(!showAttendance)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm border ${
                    showAttendance 
                      ? 'bg-indigo-600 border-indigo-700 text-white' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                  }`}
                >
                  <ClipboardCheck className="w-3 h-3" />
                  {showAttendance ? 'Back to Chat' : 'Attendance'}
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 border border-indigo-700 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm"
              >
                <LogIn className="w-3 h-3" />
                Login
              </button>
            )}
            {apiStatus && (
              apiStatus.hasKey ? (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  API Active
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleOpenKeyDialog}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-[10px] font-bold uppercase tracking-wider hover:bg-rose-100 transition-all animate-pulse shadow-sm"
                  >
                    <Info className="w-3 h-3" />
                    API Key Required
                  </button>
                  <button 
                    onClick={() => checkHealth(false)}
                    disabled={isRefreshing}
                    className={`p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh API Status"
                  >
                    <RefreshCcw className="w-3 h-3" />
                  </button>
                </div>
              )
            )}
            <button 
              onClick={handleExportPDF}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              title="Export Chat as PDF"
            >
              <FileDown className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
              title="Clear Chat"
            >
              <X className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowChat(false)}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-all"
              title="Back to Home"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button 
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2 rounded-xl transition-all duration-300 border ${
                isVoiceEnabled 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area - Page Style */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-16 pb-20">
          {showAttendance ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Portal</h2>
                  <p className="text-slate-500 text-sm">Track and manage academic presence in real-time.</p>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Current Status</div>
                  <div className="text-lg font-bold text-slate-900">
                    {userProfile?.role === 'student' ? 'Student View' : 'Faculty Dashboard'}
                  </div>
                </div>
              </div>

              {userProfile?.role === 'student' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-900">
                        {attendanceRecords.filter(r => r.status === 'present').length}
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Days Present</div>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-900">
                        {attendanceRecords.filter(r => r.status === 'absent').length}
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Days Absent</div>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-900">
                        {Math.round((attendanceRecords.filter(r => r.status === 'present').length / (attendanceRecords.length || 1)) * 100)}%
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance Rate</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                  <h3 className="text-xl font-bold text-slate-900">Mark Today's Attendance</h3>
                  <div className="space-y-4">
                    {/* Mock Student List for Demo */}
                    {[
                      { uid: 'student_1', name: 'Arun Sharma' },
                      { uid: 'student_2', name: 'Priya Raj' },
                      { uid: 'student_3', name: 'Vijay Kumar' }
                    ].map((student) => (
                      <div key={student.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                            {student.name[0]}
                          </div>
                          <span className="font-bold text-slate-700">{student.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => markAttendance(student.uid, student.name, 'present')}
                            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all"
                          >
                            Present
                          </button>
                          <button 
                            onClick={() => markAttendance(student.uid, student.name, 'absent')}
                            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-all"
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900">Recent History</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.map((record) => (
                      <div key={record.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${
                            record.status === 'present' ? 'bg-emerald-500' : 
                            record.status === 'absent' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}></div>
                          <div>
                            <div className="font-bold text-slate-800">{record.studentName}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{record.date}</div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          record.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 
                          record.status === 'absent' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {record.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-400 italic">No records found.</div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full"
              >
                {msg.role === 'user' ? (
                  <div className="border-l-4 border-indigo-500 pl-6 py-2 mb-8">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-2">
                      <User className="w-3 h-3" />
                      Your Inquiry
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-800 leading-tight">
                      {msg.text}
                    </h2>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <Bot className="w-20 h-20 text-indigo-600" />
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">
                      <Bot className="w-3 h-3 text-indigo-500" />
                      Assistant Response
                    </div>

                    <div className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-indigo-600">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                    
                    <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isVoiceEnabled && (
                          <button 
                            onClick={() => getSpeechResponse(msg.text).then(data => data && playAudio(data))}
                            className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-500 transition-colors"
                            title="Play Voice"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                          }}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy Text"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 opacity-50" />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
              {isLoading && (
                <TypingIndicator />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Premium Input Section */}
      <footer className="bg-white border-t border-slate-200 p-6 sm:p-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Quick Action Chips */}
          <div className="flex flex-wrap gap-3">
            {quickLinks.map((link, i) => (
              <motion.button
                key={i}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSend(undefined, link.query)}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all rounded-xl text-xs font-bold text-slate-600 group"
              >
                <span className="text-indigo-500 group-hover:scale-110 transition-transform">{link.icon}</span>
                {link.label}
              </motion.button>
            ))}
          </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-5 rounded-2xl transition-all shadow-xl ${
                    isListening 
                      ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/20' 
                      : 'bg-white text-indigo-600 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 shadow-slate-200/50'
                  }`}
                  title={isListening ? "Listening..." : "Voice Search"}
                >
                  {isListening ? (
                    <div className="flex gap-2 items-center">
                      <VoiceVisualizer 
                        isListening={isListening} 
                        barCount={5} 
                        barWidth="w-[2.5px]" 
                        gap="gap-[2px]" 
                        heightClass="h-4" 
                        colorClass="bg-white" 
                      />
                      <MicOff className="w-5 h-5 mx-1 shrink-0" />
                      <VoiceVisualizer 
                        isListening={isListening} 
                        barCount={5} 
                        barWidth="w-[2.5px]" 
                        gap="gap-[2px]" 
                        heightClass="h-4" 
                        colorClass="bg-white" 
                      />
                    </div>
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </button>
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-2 px-4 rounded-xl whitespace-nowrap shadow-2xl"
                  >
                    Go ahead, I'm listening...
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                  </motion.div>
                )}
              </div>

              <div className="relative flex-1 group">
                <form onSubmit={handleSend} className="relative flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? "" : "Type your inquiry here..."}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-6 pr-6 text-[16px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm ${
                        isListening ? "text-transparent select-none placeholder-transparent pointer-events-none" : ""
                      }`}
                    />
                    {isListening && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                        <div className="flex items-center gap-4 bg-rose-50/90 border border-rose-100 rounded-xl px-5 py-2 shadow-sm transition-all">
                          <span className="text-[11px] font-bold text-rose-600 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-duration-1000"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            Listening
                          </span>
                          <div className="w-[1px] h-4 bg-rose-200 shrink-0" />
                          <VoiceVisualizer 
                            isListening={isListening} 
                            barCount={25} 
                            barWidth="w-[3px]" 
                            gap="gap-[3px]" 
                            heightClass="h-6" 
                            colorClass="bg-rose-500" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-5 bg-indigo-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center"
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  </motion.button>
                </form>
              </div>
            </div>
          
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Info className="w-3 h-3" />
              St. Peter's Institutional Portal
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Powered by Advanced Gemini AI
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>

      {/* Setup Guide Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <X className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Clear History?</h3>
                <p className="text-sm text-slate-500">This will permanently delete all messages in this session.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setMessages([{
                      id: '1',
                      role: 'model',
                      text: "Welcome back! How can I help you today?",
                      timestamp: new Date(),
                    }]);
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-600/20 transition-all"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showSetupGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Sparkles className="w-32 h-32 text-indigo-600" />
              </div>

              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                      <img 
                        src="https://spihar.ac.in/wp-content/uploads/2021/05/logo.png" 
                        alt="St. Peter's Logo" 
                        className="w-8 h-8 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                      <Info className="w-5 h-5" />
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSetupGuide(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 rotate-90" />
                  </button>
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    How to Solve the <br />
                    <span className="text-indigo-600">API Connection Error</span>
                  </h2>
                  <p className="text-slate-500 leading-relaxed">
                    The assistant needs a Gemini API key to process your requests and generate voice responses. Follow these simple steps:
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-600/20">1</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900">Get your API Key</h4>
                      <p className="text-sm text-slate-500">Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">Google AI Studio</a> and copy your free API key.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-600/20">2</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900">Open Settings</h4>
                      <p className="text-sm text-slate-500">Click the <strong>Gear Icon (Settings)</strong> in the top-right corner of this AI Studio Build interface.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-600/20">3</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900">Add the Secret</h4>
                      <p className="text-sm text-slate-500">Go to <strong>Secrets</strong>, add a new secret named <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-xs">GEMINI_API_KEY</code>, and paste your key.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => setShowSetupGuide(false)}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all"
                  >
                    Got it, I'll add it now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <NotificationToast notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
    </div>
  );
}
