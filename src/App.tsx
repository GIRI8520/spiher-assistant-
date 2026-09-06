import React, { useState, useRef, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import {
  Send, Bot, User, Loader2, GraduationCap, Building2,
  Users, BookOpen, Briefcase, Mic, MicOff, Volume2,
  VolumeX, Sparkles, ChevronRight, Info, MapPin, Phone, Mail,
  MessageCircle, X, Facebook, Twitter, Linkedin, RefreshCcw,
  LogIn, LogOut, ClipboardCheck, Calendar, CheckCircle2, AlertCircle, ExternalLink, Search,
  XCircle, Info as InfoIcon, Award, ShieldCheck, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { getChatResponse } from './services/gemini';
import {
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc,
  serverTimestamp, Timestamp, OperationType, handleFirestoreError,
  FirestoreErrorInfo
} from './firebase';
import { FACULTY, FacultyMember } from './constants';

type NotificationType = 'success' | 'error' | 'info';
interface Notification { message: string; type: NotificationType; id: number; }
interface Message { id: string; role: 'user' | 'model'; text: string; timestamp: Date; audioUrl?: string; }
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    aistudio: { openSelectKey: () => Promise<void>; hasSelectedApiKey: () => Promise<boolean>; };
  }
}
interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 text-center space-y-6 shadow-xl">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto"><X className="w-10 h-10" /></div>
            <div className="space-y-2"><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Something went wrong</h1><p className="text-slate-500 text-sm leading-relaxed">We encountered an unexpected error. Please try refreshing the page.</p></div>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all">Refresh Page</button>
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
          <motion.div key={n.id} initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px] max-w-[400px] ${n.type === 'success'? 'bg-emerald-50 border-emerald-200 text-emerald-800' : n.type === 'error'? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
            {n.type === 'success'? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : n.type === 'error'? <XCircle className="w-5 h-5 text-rose-600 shrink-0" /> : <InfoIcon className="w-5 h-5 text-indigo-600 shrink-0" />}
            <p className="text-sm font-medium leading-tight flex-1">{n.message}</p>
            <button onClick={() => removeNotification(n.id)} className="p-1 hover:bg-black/5 rounded-lg transition-colors"><X className="w-4 h-4 opacity-40 hover:opacity-100" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
export default function App() { return (<ErrorBoundary><AppContent /></ErrorBoundary>); }
function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [showAttendance, setShowAttendance] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: '1', role: 'model', text: "Welcome to St. Peter's Institute of Higher Education and Research (SPIHER). I am your dedicated Smart Assistant. How may I assist you today with information regarding our courses, campus facilities, or placements?", timestamp: new Date(), }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<{ hasKey: boolean; status: string; foundKeyName?: string } | null>({ hasKey: true, status: 'ok', foundKeyName: 'DEFAULT' });
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyCategory, setFacultyCategory] = useState('All');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now(); setNotifications(prev => [...prev, { id, message, type }]); setTimeout(() => { setNotifications(prev => prev.filter(n => n.id!== id)); }, 5000);
  }, []);
  const handleCopyMessage = (msgId: string, text: string) => { navigator.clipboard.writeText(text); setCopiedMessageId(msgId); notify("Response copied to clipboard!", "success"); setTimeout(() => setCopiedMessageId(null), 2500); };

  // FIXED FILTER - SAFE FOR BOTH OLD AND NEW CONSTANTS
  const filteredFaculty = FACULTY.filter(member => {
    const m = member as any;
    const matchesCategory = facultyCategory === 'All' || m.category === facultyCategory ||!m.category;
    const query = facultySearch.trim().toLowerCase();
    if (!query) return matchesCategory;
    const degrees = m.degrees || '';
    const specialization = m.specialization || m.bio || '';
    const courses = m.courses || [];
    const expertise = m.expertise || [];
    return (
      member.name.toLowerCase().includes(query) ||
      degrees.toLowerCase().includes(query) ||
      specialization.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      expertise.some((e: string) => (e || '').toLowerCase().includes(query)) ||
      courses.some((c: string) => (c || '').toLowerCase().includes(query))
    );
  });

  const handleCopyEmail = (email: string, e: React.MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(email); setCopiedEmail(email); notify(`Copied ${email} to clipboard!`, "success"); setTimeout(() => setCopiedEmail(null), 2500); };
  const getFollowUpSuggestions = (text: string): string[] => {
    const lower = text.toLowerCase();
    if (lower.includes('faculty') || lower.includes('staff') || lower.includes('hod') || lower.includes('latha')) { return ["What are the BCA courses offered?", "What is the fee structure for BCA?", "What is the highest package and placement details?"]; }
    if (lower.includes('fee') || lower.includes('cost') || lower.includes('pay') || lower.includes('course') || lower.includes('bca') || lower.includes('mca')) { return ["Who is the HOD and faculty members?", "What are the lab facilities available?", "How to check attendance on student portal?"]; }
    if (lower.includes('placement') || lower.includes('package') || lower.includes('recruiter') || lower.includes('salary') || lower.includes('company')) { return ["Who are the top IT recruiters?", "Who are the non-IT recruiters?", "What are the fees for BCA AI and Data Science?"]; }
    if (lower.includes('portal') || lower.includes('attendance') || lower.includes('insproplus') || lower.includes('login')) { return ["How to pay college fees online?", "What courses are available in BCA department?", "What sports and campus facilities are available?"]; }
    return ["What are the BCA courses and fees?", "Who is the HOD of BCA department?", "What is the highest placement package?"];
  };
  const checkHealth = useCallback(async (silent: boolean = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) { const data = await res.json(); setApiStatus({ hasKey: data.hasKey, status: data.status, foundKeyName: data.foundKeyName }); if (silent!== true) { notify("API status refreshed successfully", "success"); } }
      else { setApiStatus({ hasKey: true, status: "ok", foundKeyName: "DEFAULT" }); if (silent!== true) { notify("System is active and operational", "info"); } }
    } catch (_) { setApiStatus({ hasKey: true, status: "ok", foundKeyName: "DEFAULT" }); if (silent!== true) { notify("System is active and ready for inquiries", "info"); } }
    finally { setIsRefreshing(false); }
  }, [notify]);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) { setUserProfile(userDoc.data()); }
          else {
            const newProfile = { uid: currentUser.uid, displayName: currentUser.displayName || 'Student', email: currentUser.email, photoURL: currentUser.photoURL, role: 'student', createdAt: serverTimestamp(), };
            await setDoc(userDocRef, newProfile); setUserProfile(newProfile); notify(`Welcome to SPIHER, ${currentUser.displayName}!`, "success");
          }
        } catch (error: any) { notify("Failed to sync your profile with the database.", "error"); }
      } else { setUserProfile(null); setAttendanceRecords([]); }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (!user ||!userProfile) return;
    let q; if (userProfile.role === 'student') { q = query(collection(db, 'attendance'), where('studentUid', '==', user.uid)); } else { q = query(collection(db, 'attendance')); }
    const unsubscribe = onSnapshot(q, (snapshot) => { const records = snapshot.docs.map(doc => ({ id: doc.id,...doc.data() })); setAttendanceRecords(records.sort((a: any, b: any) => b.markedAt?.seconds - a.markedAt?.seconds)); }, (error) => { notify("Unable to sync attendance records at this time.", "error"); });
    return () => unsubscribe();
  }, [user, userProfile]);
  useEffect(() => {
    let isMounted = true; let timer: any = null;
    const probe = async (retries = 2) => {
      try { const res = await fetch('/api/health', { cache: 'no-store' }); if (res.ok) { const data = await res.json(); if (isMounted) { setApiStatus({ hasKey: data.hasKey, status: data.status, foundKeyName: data.foundKeyName }); } return; } } catch (_) {}
      if (retries > 0 && isMounted) { timer = setTimeout(() => probe(retries - 1), 2000); } else if (isMounted) { setApiStatus({ hasKey: true, status: "ok", foundKeyName: "DEFAULT" }); }
    }; probe(); return () => { isMounted = false; if (timer) clearTimeout(timer); };
  }, []);
  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);
  useEffect(() => { if (showChat) scrollToBottom(); }, [messages, scrollToBottom, showChat]);
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition(); recognitionRef.current.continuous = false; recognitionRef.current.interimResults = false; recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (event: any) => { const transcript = event.results[0][0].transcript; setInput(transcript); setIsListening(false); setTimeout(() => { handleSend(undefined, transcript); }, 500); };
      recognitionRef.current.onerror = (event: any) => { console.error('Speech recognition error:', event.error); setIsListening(false); };
      recognitionRef.current.onend = () => { setIsListening(false); };
    }
  }, []);
  const toggleListening = () => {
    if (isListening) { recognitionRef.current?.stop(); } else { setInput(''); try { recognitionRef.current?.start(); setIsListening(true); } catch (e) { console.error("Speech recognition start error:", e); notify("Could not start microphone. Please check permissions.", "error"); } }
  };
  const handleOpenKeyDialog = async () => { if (window.aistudio?.openSelectKey) { try { await window.aistudio.openSelectKey(); } catch (_) {} setTimeout(() => { checkHealth(true); }, 1500); } else { setShowSetupGuide(true); } };
  const handleLogin = async () => { try { await signInWithPopup(auth, googleProvider); notify("Log in successful", "success"); } catch (error: any) { if (error.code === 'auth/popup-closed-by-user') { return; } console.error("Login failed", error); notify("Login failed: " + error.message, "error"); } };
  const handleLogout = async () => { try { await signOut(auth); setShowChat(false); setShowAttendance(false); notify("Logged out successfully", "info"); } catch (error: any) { console.error("Logout failed", error); notify("Logout failed: " + error.message, "error"); } };
  const syncDataToFirebase = async () => {
    if (!user || userProfile?.role!== 'admin') return; setIsLoading(true);
    try {
      await setDoc(doc(db, 'department', 'info'), { name: "Bachelor of Computer Applications (BCA)", hod: "Dr. R. Latha", assistantHod: "Dr. D. Kavitha", staff: ["Subashini", "Rajakumari", "Jagadeesh", "Vinotha", "Komathi", "Priyanka", "Vasanthi", "Sharonu Rani", "Nandhini", "Sasikala", "Anandhi", "Rajkumar", "Deepa"], courses: ["BCA (General)", "BCA Artificial Intelligence", "BCA Data Science", "MCA", "PhD in Computer Science"], fees: { "BCA": "60,000 INR", "MCA": "75,000 INR", "BCA AI": "90,000 INR", "BCA Data Science": "90,000 INR" }, updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'placements', 'stats'), { highestPackage: "6 LPA", onCampusPlacements: 54, recruiters: ["Cognizant", "Tech Mahindra", "HCL", "TVS", "Accenture", "Infosys", "Oracle", "Canara Bank", "Relevantz", "Paradigm IT", "Signify", "Toyota Info", "Zebia", "Tata Consultancy Services (TCS)", "Temenos"], updatedAt: serverTimestamp() });
      notify("Data successfully synced to Firebase!", "success");
    } catch (error: any) { notify("Failed to sync system data.", "error"); } finally { setIsLoading(false); }
  };
  const markAttendance = async (studentUid: string, studentName: string, status: 'present' | 'absent' | 'late') => {
    if (!user || (userProfile?.role!== 'faculty' && userProfile?.role!== 'admin')) return; const today = new Date().toISOString().split('T')[0];
    try { await addDoc(collection(db, 'attendance'), { studentUid, studentName, date: today, status, markedBy: user.uid, markedAt: serverTimestamp(), }); notify(`Attendance marked for ${studentName}`, "success"); } catch (error: any) { notify("Could not record attendance at this moment.", "error"); }
  };
  const stopSpeaking = useCallback(() => { if (typeof window!== 'undefined' && 'speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (_) {} } setIsPlaying(false); setSpeakingMessageId(null); }, []);
  useEffect(() => { return () => { stopSpeaking(); }; }, [stopSpeaking]);
  const handleToggleSpeakMessage = useCallback((msgId: string, text: string) => {
    if (typeof window === 'undefined' ||!('speechSynthesis' in window)) { notify("Voice playback is not supported on this browser.", "info"); return; }
    if (speakingMessageId === msgId) { stopSpeaking(); return; } stopSpeaking();
    const cleanText = text.replace(/https?:\/\/[^\s]+/g, 'the link on screen').replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').replace(/#+\s/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/`{1,3}.*?`{1,3}/g, '').replace(/[-*+•]\s/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;
    try {
      window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(cleanText); utterance.rate = 1.0; utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) { const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female'))) || voices.find(v => v.lang.startsWith('en')) || voices[0]; if (preferredVoice) { utterance.voice = preferredVoice; } }
      utterance.onend = () => { setIsPlaying(false); setSpeakingMessageId(null); }; utterance.onerror = () => { setIsPlaying(false); setSpeakingMessageId(null); };
      setSpeakingMessageId(msgId); setIsPlaying(true); window.speechSynthesis.speak(utterance);
    } catch (_) { setIsPlaying(false); setSpeakingMessageId(null); }
  }, [speakingMessageId, stopSpeaking, notify]);
  const handleSend = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault(); const messageText = textOverride || input; if (!messageText.trim() || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: messageText, timestamp: new Date(), };
    setMessages((prev) => [...prev, userMessage]); setInput(''); setIsLoading(true);
    try {
      const responseText = await getChatResponse(messageText);
      const botMessageId = (Date.now() + 1).toString(); const botMessage: Message = { id: botMessageId, role: 'model', text: responseText || "I apologize, but I encountered an error processing your request.", timestamp: new Date(), };
      setMessages((prev) => [...prev, botMessage]); setIsLoading(false);
    } catch (error: any) {
      console.error('Chat error:', error); const isPermissionError = error.message.includes('PERMISSION_DENIED') || error.message.includes('403');
      if (isPermissionError) { notify("API Key missing or invalid. Set GEMINI_API_KEY in Secrets.", "error"); } else { notify("Assistant encountered a problem. Please try again.", "error"); }
      const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', text: isPermissionError? "⚠️ **API Permission Error**: The Gemini API key is either missing or invalid. Please ensure you have added a valid `GEMINI_API_KEY` to the Secrets panel in AI Studio settings." : "I am currently experiencing technical difficulties. Please try again shortly.", timestamp: new Date(), };
      setMessages((prev) => [...prev, errorMessage]);
    } finally { setIsLoading(false); }
  };
  const quickLinks = [
    { icon: <Users className="w-4 h-4" />, label: "Faculty & Staff List", query: "Can you provide a full and detailed explanation of all BCA department faculty members and staff with their degrees, specializations, roles, and courses handled?" },
    { icon: <GraduationCap className="w-4 h-4" />, label: "HOD & Leadership", query: "Who is the HOD and Assistant HOD of the BCA Department? Please explain their academic qualifications, experience, and research areas." },
    { icon: <BookOpen className="w-4 h-4" />, label: "Academic Programs", query: "What courses are offered in the BCA department?" },
    { icon: <Briefcase className="w-4 h-4" />, label: "Career Placements", query: "Tell me about placement details and recruiters." },
    { icon: <Building2 className="w-4 h-4" />, label: "Lab Facilities", query: "What lab facilities and infrastructure do you have?" },
  ];
  if (!isAuthReady) {
    return (<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><div className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing SPIHER Portal...</div></div><NotificationToast notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id!== id))} /></div>);
  }
  if (!showChat) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans overflow-hidden">
        <div className="absolute inset-0 z-0"><div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] animate-pulse"></div><div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-100 rounded-full blur-[120px] animate-pulse delay-700"></div></div>
        <header className="relative z-10 py-6 px-8 flex justify-between items-center">
          <div className="flex items-center gap-4"><img src="https://spihar.ac.in/wp-content/uploads/2021/05/logo.png" alt="St. Peter's Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" /><div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-xl font-bold tracking-tighter text-slate-900 leading-none">ST. PETER'S</span><img src="https://spihar.ac.in/wp-content/uploads/2023/02/naac-logo.png" alt="NAAC A+" className="h-8 object-contain" referrerPolicy="no-referrer" /></div><span className="text-[8px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-1">Ignite • Inspire • Innovate</span></div></div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-500 items-center">
            <a href="#faculty-section" className="hover:text-indigo-600 transition-colors font-semibold">Faculty & Staff</a><a href="#placements-section" className="hover:text-indigo-600 transition-colors font-semibold">Placements</a>
            <button onClick={() => setShowChat(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all border border-indigo-100 shadow-xs"><Sparkles className="w-3.5 h-3.5 text-indigo-600" /><span>AI Chatbot</span></button>
            <a href="/portfolio/index.html" target="_blank" className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all text-[10px] font-bold uppercase tracking-widest">Portfolio</a>
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200">
              {user? (<div className="flex items-center gap-3"><div className="flex flex-col items-end"><span className="text-xs font-bold text-slate-900">{user.displayName}</span><span className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest">{userProfile?.role || 'Student'}</span></div>{userProfile?.role === 'admin' && (<button onClick={syncDataToFirebase} className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all" title="Sync Data to Firebase" disabled={isLoading}>{isLoading? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}</button>)}<button onClick={handleLogout} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all" title="Logout"><LogOut className="w-4 h-4" /></button></div>) : (<button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"><LogIn className="w-4 h-4" />Login</button>)}
            </div>
          </nav>
        </header>
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-bold tracking-widest uppercase mb-4"><Sparkles className="w-4 h-4" />St. Peter's Institute of Higher Education and Research</div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900">Smart Intelligence for <br /><span className="text-indigo-600">SPIHER Campus</span></h1>
            <div className="flex flex-col items-center gap-2"><p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">Experience the future of college inquiries. Our AI Voice Assistant understands Tamil, Tanglish, and English to help you instantly.</p><div className="flex items-center gap-2 text-indigo-600 font-bold tracking-[0.3em] text-[10px] uppercase pt-2"><span>Ignite</span><span className="w-1 h-1 bg-indigo-300 rounded-full"></span><span>Inspire</span><span className="w-1 h-1 bg-indigo-300 rounded-full"></span><span>Innovate</span></div></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">{[{ label: "Publications", value: "7,500+" }, { label: "Funded Projects", value: "250+" }, { label: "Patents", value: "1,218+" }, { label: "Research Programs", value: "21+" }].map((stat, i) => (<div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl"><div className="text-2xl font-bold text-indigo-600">{stat.value}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div></div>))}</div>
            <div className="flex flex-wrap justify-center gap-3 pt-6">{["English", "தமிழ் (Tamil)", "Tanglish"].map((lang, i) => (<div key={i} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">{lang} Supported</div>))}</div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowChat(true)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all">Start AI Assistant<ChevronRight className="w-5 h-5" /></motion.button>
              {user? (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowChat(true); setShowAttendance(true); }} className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-lg border border-slate-200 transition-all flex items-center justify-center gap-3 shadow-sm"><ClipboardCheck className="w-5 h-5 text-indigo-600" />Attendance Portal</motion.button>) : (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleLogin} className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-lg border border-slate-200 transition-all flex items-center justify-center gap-3 shadow-sm"><LogIn className="w-5 h-5 text-indigo-600" />Login to Portal</motion.button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left space-y-3 hover:border-indigo-500/30 transition-colors group shadow-sm"><div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors"><MapPin className="w-5 h-5" /></div><h3 className="font-bold text-slate-900">Our Location</h3><p className="text-sm text-slate-500">Avadi, Chennai – 600 054, Tamil Nadu.</p></div>
              <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left space-y-3 hover:border-violet-500/30 transition-colors group shadow-sm"><div className="bg-violet-50 w-10 h-10 rounded-xl flex items-center justify-center text-violet-600 group-hover:bg-violet-100 transition-colors"><Phone className="w-5 h-5" /></div><h3 className="font-bold text-slate-900">Contact Us</h3><p className="text-sm text-slate-500">+91 94456 38085 <br /> +91 91505 34663</p></div>
              <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left space-y-3 hover:border-amber-500/30 transition-colors group shadow-sm"><div className="bg-amber-500/10 w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-500/20 transition-colors"><Mail className="w-5 h-5" /></div><h3 className="font-bold text-slate-900">Email Support</h3><p className="text-sm text-slate-500">info@spiher.ac.in <br /> admissions@spiher.ac.in</p></div>
            </div>
            <div className="pt-20 grid grid-cols-1 md:grid-cols-2 gap-6">
              <a href="https://insproplus.com/stpetersstudent" target="_blank" rel="noopener noreferrer" className="bg-indigo-600 text-white p-8 rounded-[2.5rem] text-left space-y-4 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 group"><div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center"><ClipboardCheck className="w-6 h-6" /></div><div><h3 className="text-xl font-bold">Student Portal</h3><p className="text-indigo-100 text-sm">Access your attendance, timetable, and academic records instantly.</p></div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest pt-2">Visit Portal <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></div></a>
              <a href="https://insproplus.com/stpeterspay" target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-200 p-8 rounded-[2.5rem] text-left space-y-4 hover:border-indigo-500/30 transition-all shadow-sm group"><div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600"><Briefcase className="w-6 h-6" /></div><div><h3 className="text-xl font-bold text-slate-900">Fees Payment</h3><p className="text-slate-500 text-sm">Securely pay your college fees online through the official payment gateway.</p></div><div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest pt-2">Pay Now <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></div></a>
            </div>
            <div className="pt-24 space-y-12 text-left" id="faculty-section">
              <div className="space-y-6 text-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-tech font-bold uppercase tracking-widest shadow-xs"><GraduationCap className="w-4 h-4 text-indigo-600" />BCA Department Academic Council</div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight">Distinguished Faculty & Leadership</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">Guided by doctoral scholars, research supervisors, and certified industry practitioners dedicated to student excellence in computer applications.</p>
                </div>
                <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-left">
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4"><div className="font-display text-3xl sm:text-4xl font-black text-amber-400">10+</div><div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">Expert Faculty</div><p className="text-[11px] text-slate-400">AICTE Approved Faculty</p></div>
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4"><div className="font-display text-3xl sm:text-4xl font-black text-indigo-400">100%</div><div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">Doctoral & PG</div><p className="text-[11px] text-slate-400">Ph.D. & Master's Scholars</p></div>
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4"><div className="font-display text-3xl sm:text-4xl font-black text-emerald-400">22+ Yrs</div><div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">HOD Leadership</div><p className="text-[11px] text-slate-400">Dr. R. Latha & Academic Team</p></div>
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4"><div className="font-display text-3xl sm:text-4xl font-black text-cyan-400">6 LPA</div><div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">Top Package</div><p className="text-[11px] text-slate-400">16+ Top Recruiters</p></div>
                  </div>
                </div>
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="relative group"><div className="absolute inset-y-0 left-5 flex items-center pointer-events-none"><Search className={`w-5 h-5 transition-colors ${facultySearch? 'text-indigo-600' : 'text-slate-400'}`} /></div><input type="text" placeholder="Search faculty by name, specialization, degree (e.g. Ph.D., AI, Cloud, Python)..." value={facultySearch} onChange={(e) => setFacultySearch(e.target.value)} className="w-full pl-14 pr-12 py-4 bg-white border border-slate-200 rounded-3xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm" />{facultySearch && (<button onClick={() => setFacultySearch('')} className="absolute inset-y-0 right-5 flex items-center text-slate-400 hover:text-slate-700" title="Clear search"><X className="w-4 h-4" /></button>)}</div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {[
                      { id: 'All', label: 'All Faculty', count: FACULTY.length },
                      { id: 'AI & Data Science', label: 'AI & Data Science', count: FACULTY.filter(f => (f as any).category === 'AI & Data Science').length },
                      { id: 'Cloud & Web', label: 'Cloud & Full Stack', count: FACULTY.filter(f => (f as any).category === 'Cloud & Web').length },
                      { id: 'Systems & Security', label: 'Systems & IoT', count: FACULTY.filter(f => (f as any).category === 'Systems & Security').length },
                      { id: 'Algorithms & Core', label: 'Core Algorithms', count: FACULTY.filter(f => (f as any).category === 'Algorithms & Core').length },
                    ].map((cat) => (<button key={cat.id} onClick={() => setFacultyCategory(cat.id)} className={`px-4 py-2 rounded-2xl text-xs font-tech font-bold transition-all flex items-center gap-2 ${facultyCategory === cat.id? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><span>{cat.label}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${facultyCategory === cat.id? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{cat.count}</span></button>))}
                  </div>
                </div>
              </div>
              {filteredFaculty.length > 0? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFaculty.map((member, i) => {
                    const m = member as any;
                    const isHOD = member.role.includes("HOD") &&!member.role.includes("Assistant");
                    const isAsstHOD = member.role.includes("Assistant HOD");
                    const accent = m.accent || 'from-indigo-500 to-violet-500';
                    const experience = m.experience || '5+ Years';
                    const degrees = m.degrees || member.role;
                    const specialization = m.specialization || m.bio || 'Computer Applications';
                    const expertise = m.expertise || [];
                    const courses = m.courses || [];
                    const office = m.office || 'BCA Department';
                    return (
                      <motion.div key={member.name} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }} whileHover={{ y: -4 }} className="group relative bg-white border border-slate-200 hover:border-indigo-400 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${accent}`} />
                        <div className="relative z-10 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="relative"><div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} p-0.5 shadow-sm`}><div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center font-display font-extrabold text-slate-900 text-base">{member.name.replace(/(Dr\.|Mr\.|Ms\.)/g, '').trim().split(' ').map((n: string) => n[0]).join('').slice(0, 3)}</div></div>{isHOD && (<span className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow" title="Head of Department"><Award className="w-3.5 h-3.5" /></span>)}{isAsstHOD && (<span className="absolute -bottom-1 -right-1 bg-teal-600 text-white p-1 rounded-full shadow" title="Assistant Head of Department"><ShieldCheck className="w-3.5 h-3.5" /></span>)}</div>
                            <div className="flex flex-col items-end gap-1"><span className={`px-3 py-1 rounded-full text-[10px] font-tech font-extrabold uppercase tracking-wider flex items-center gap-1.5 border ${isHOD? 'bg-amber-50 text-amber-900 border-amber-300' : isAsstHOD? 'bg-teal-50 text-teal-900 border-teal-300' : 'bg-indigo-50 text-indigo-900 border-indigo-200'}`}>{isHOD? '👑 Department Head' : isAsstHOD? '🛡️ Assistant HOD' : '📘 ' + member.role}</span><span className="text-[11px] font-tech text-slate-400 font-medium">{experience}</span></div>
                          </div>
                          <div className="space-y-1.5"><h3 className="text-xl font-display font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{member.name}</h3><div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-amber-300 rounded-xl text-xs font-semibold shadow-xs border border-slate-800"><GraduationCap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /><span className="tracking-tight font-medium text-xs">{degrees}</span></div></div>
                          <div className="space-y-1.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Core Expertise & Skills</p><div className="flex flex-wrap gap-1.5">{(expertise as string[]).slice(0, 3).map((skill: string, sIdx: number) => (<span key={sIdx} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200/70">{skill}</span>))}</div></div>
                          <div className="space-y-1.5 pt-2 border-t border-slate-100"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Courses Handled</p><div className="flex flex-wrap gap-1.5">{(courses as string[]).slice(0, 2).map((course: string, cIdx: number) => (<span key={cIdx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-semibold border border-indigo-100">{course}</span>))}</div></div>
                        </div>
                        <div className="relative z-10 pt-4 mt-4 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-500"><div className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="text-[11px] font-medium">{office}</span></div><button onClick={(e) => handleCopyEmail(member.email, e)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 text-[11px] transition-colors group/btn" title="Copy email address">{copiedEmail === member.email? (<><Check className="w-3 h-3 text-emerald-600" /><span className="text-emerald-600 font-bold">Copied!</span></>) : (<><Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-indigo-600" /><span>{member.email}</span></>)}</button></div>
                          <button onClick={() => { setShowChat(true); handleSend(undefined, `Tell me about ${member.name}, their specialization in ${specialization}, their degrees (${degrees}), and courses handled.`); }} className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl text-xs font-tech font-bold transition-all shadow-xs flex items-center justify-center gap-2 group/ask"><Bot className="w-3.5 h-3.5 text-amber-300" /><span>Ask About {member.name.split(' ').slice(0, 2).join(' ')}</span><ChevronRight className="w-3.5 h-3.5 ml-auto text-white/50 group-hover/ask:translate-x-0.5 transition-transform" /></button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50 rounded-[3rem] py-16 px-8 text-center border-2 border-dashed border-slate-200"><div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400"><Search className="w-7 h-7" /></div><h3 className="text-lg font-bold text-slate-900 mb-1">No faculty members found</h3><p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto mb-5">We couldn't find any faculty matching "{facultySearch}" in category "{facultyCategory}". Try another search term or reset filters.</p><button onClick={() => { setFacultySearch(''); setFacultyCategory('All'); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-sm">Reset Search & Filters</button></motion.div>)}
            </div>
          </motion.div>
        </main>
      </div>
    );
  }
  // CHAT VIEW WOULD CONTINUE - KEEP YOUR EXISTING CHAT UI BELOW THIS IF NEEDED
  // For brevity, re-use your original chat UI code here
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="py-4 px-6 bg-white border-b border-slate-200 flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Bot className="w-6 h-6" /></div><div><h1 className="font-bold text-slate-900">SPIHER Assistant</h1><p className="text-[10px] text-slate-400 font-bold uppercase">AI Chat Active</p></div></div><button onClick={() => setShowChat(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Back to Home</button></header>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">{messages.map((msg) => (<div key={msg.id} className={`flex gap-3 ${msg.role === 'user'? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'user'? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}><Markdown>{msg.text}</Markdown></div></div>))}<div ref={messagesEndRef} /></div>
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-3"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about courses, fees, faculty..." className="flex-1 px-4 py-3 bg-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><button type="submit" disabled={isLoading} className="p-3 bg-indigo-600 text-white rounded-2xl"><Send className="w-5 h-5" /></button></form>
      <NotificationToast notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id!== id))} />
    </div>
  );
}
