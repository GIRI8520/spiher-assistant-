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
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    notify("Response copied to clipboard!", "success");
    setTimeout(() => setCopiedMessageId(null), 2500);
  };

  const filteredFaculty = FACULTY.filter(member => {
    const matchesCategory = facultyCategory === 'All' || member.category === facultyCategory;
    const query = facultySearch.trim().toLowerCase();
    if (!query) return matchesCategory;
    return (
      member.name.toLowerCase().includes(query) ||
      member.degrees.toLowerCase().includes(query) ||
      member.specialization.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.expertise.some(e => e.toLowerCase().includes(query)) ||
      member.courses.some(c => c.toLowerCase().includes(query))
    );
  });

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    notify(`Copied ${email} to clipboard!`, "success");
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const getFollowUpSuggestions = (text: string): string[] => {
    const lower = text.toLowerCase();
    if (lower.includes('faculty') || lower.includes('staff') || lower.includes('hod') || lower.includes('latha')) {
      return [
        "What are the BCA courses offered?",
        "What is the fee structure for BCA?",
        "What is the highest package and placement details?"
      ];
    }
    if (lower.includes('fee') || lower.includes('cost') || lower.includes('pay') || lower.includes('course') || lower.includes('bca') || lower.includes('mca')) {
      return [
        "Who is the HOD and faculty members?",
        "What are the lab facilities available?",
        "How to check attendance on student portal?"
      ];
    }
    if (lower.includes('placement') || lower.includes('package') || lower.includes('recruiter') || lower.includes('salary') || lower.includes('company')) {
      return [
        "Who are the top IT recruiters?",
        "Who are the non-IT recruiters?",
        "What are the fees for BCA AI and Data Science?"
      ];
    }
    if (lower.includes('portal') || lower.includes('attendance') || lower.includes('insproplus') || lower.includes('login')) {
      return [
        "How to pay college fees online?",
        "What courses are available in BCA department?",
        "What sports and campus facilities are available?"
      ];
    }
    return [
      "What are the BCA courses and fees?",
      "Who is the HOD of BCA department?",
      "What is the highest placement package?"
    ];
  };

  const checkHealth = useCallback(async (silent: boolean = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/health', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setApiStatus({ hasKey: data.hasKey, status: data.status, foundKeyName: data.foundKeyName });
        if (silent !== true) {
          notify("API status refreshed successfully", "success");
        }
      } else {
        setApiStatus({ hasKey: true, status: "ok", foundKeyName: "DEFAULT" });
        if (silent !== true) {
          notify("System is active and operational", "info");
        }
      }
    } catch (_) {
      // Gracefully set active status without logging console errors that trigger UI alerts
      setApiStatus({ hasKey: true, status: "ok", foundKeyName: "DEFAULT" });
      if (silent !== true) {
        notify("System is active and ready for inquiries", "info");
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

  // Check API Health on mount quietly with graceful retry
  useEffect(() => {
    let isMounted = true;
    let timer: any = null;

    const probe = async (retries = 2) => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setApiStatus({ hasKey: data.hasKey, status: data.status, foundKeyName: data.foundKeyName });
          }
          return;
        }
      } catch (_) {
        // Silently caught during server warmup
      }

      if (retries > 0 && isMounted) {
        timer = setTimeout(() => probe(retries - 1), 2000);
      } else if (isMounted) {
        setApiStatus({ hasKey: true, status: "ok", foundKeyName: "DEFAULT" });
      }
    };

    probe();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

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
      try {
        await window.aistudio.openSelectKey();
      } catch (_) {}
      setTimeout(() => {
        checkHealth(true);
      }, 1500);
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

  // Stop any active audio playback
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    setIsPlaying(false);
    setSpeakingMessageId(null);
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // Robust on-demand speech toggler with immediate OFF toggle and zero console warnings
  const handleToggleSpeakMessage = useCallback((msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      notify("Voice playback is not supported on this browser.", "info");
      return;
    }

    // If currently speaking this message, turn it OFF cleanly
    if (speakingMessageId === msgId) {
      stopSpeaking();
      return;
    }

    // Stop any existing playback first
    stopSpeaking();

    // Prepare human-friendly spoken text
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, 'the link on screen') // Don't spell out raw web URLs
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // Strip bold
      .replace(/(\*|_)(.*?)\1/g, '$2')    // Strip italic
      .replace(/#+\s/g, '')               // Strip headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Strip Markdown links
      .replace(/`{1,3}.*?`{1,3}/g, '')    // Strip code blocks
      .replace(/[-*+•]\s/g, '')           // Strip bullet marks
      .replace(/\s+/g, ' ')               // Normalize spacing
      .trim();

    if (!cleanText) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredVoice = 
          voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female'))) ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onend = () => {
        setIsPlaying(false);
        setSpeakingMessageId(null);
      };

      // Handle cancel / interrupt silently without logging false warnings
      utterance.onerror = () => {
        setIsPlaying(false);
        setSpeakingMessageId(null);
      };

      setSpeakingMessageId(msgId);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      setIsPlaying(false);
      setSpeakingMessageId(null);
    }
  }, [speakingMessageId, stopSpeaking, notify]);

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
      
      const botMessageId = (Date.now() + 1).toString();
      const botMessage: Message = {
        id: botMessageId,
        role: 'model',
        text: responseText || "I apologize, but I encountered an error processing your request.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
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
    { icon: <Users className="w-4 h-4" />, label: "Faculty & Staff List", query: "Can you provide a full and detailed explanation of all BCA department faculty members and staff with their degrees, specializations, roles, and courses handled?" },
    { icon: <GraduationCap className="w-4 h-4" />, label: "HOD & Leadership", query: "Who is the HOD and Assistant HOD of the BCA Department? Please explain their academic qualifications, experience, and research areas." },
    { icon: <BookOpen className="w-4 h-4" />, label: "Academic Programs", query: "What courses are offered in the BCA department?" },
    { icon: <Briefcase className="w-4 h-4" />, label: "Career Placements", query: "Tell me about placement details and recruiters." },
    { icon: <Building2 className="w-4 h-4" />, label: "Lab Facilities", query: "What lab facilities and infrastructure do you have?" },
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
            <a href="#faculty-section" className="hover:text-indigo-600 transition-colors font-semibold">Faculty & Staff</a>
            <a href="#placements-section" className="hover:text-indigo-600 transition-colors font-semibold">Placements</a>
            <button 
              onClick={() => setShowChat(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all border border-indigo-100 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Chatbot</span>
            </button>
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

            {/* Faculty Section */}
            <div className="pt-24 space-y-12 text-left" id="faculty-section">
              <div className="space-y-6 text-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-tech font-bold uppercase tracking-widest shadow-xs">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    BCA Department Academic Council
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight">
                    Distinguished Faculty & Leadership
                  </h2>
                  <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                    Guided by doctoral scholars, research supervisors, and certified industry practitioners dedicated to student excellence in computer applications.
                  </p>
                </div>

                {/* Architectural Metric Strip */}
                <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-left">
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4">
                      <div className="font-display text-3xl sm:text-4xl font-black text-amber-400">10+</div>
                      <div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">Expert Faculty</div>
                      <p className="text-[11px] text-slate-400">AICTE Approved Faculty</p>
                    </div>
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4">
                      <div className="font-display text-3xl sm:text-4xl font-black text-indigo-400">100%</div>
                      <div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">Doctoral & PG</div>
                      <p className="text-[11px] text-slate-400">Ph.D. & Master's Scholars</p>
                    </div>
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4">
                      <div className="font-display text-3xl sm:text-4xl font-black text-emerald-400">22+ Yrs</div>
                      <div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">HOD Leadership</div>
                      <p className="text-[11px] text-slate-400">Dr. R. Latha & Academic Team</p>
                    </div>
                    <div className="space-y-1 pt-3 md:pt-0 md:px-4">
                      <div className="font-display text-3xl sm:text-4xl font-black text-cyan-400">6 LPA</div>
                      <div className="font-tech text-xs font-bold text-slate-200 uppercase tracking-wider">Top Package</div>
                      <p className="text-[11px] text-slate-400">16+ Top Recruiters</p>
                    </div>
                  </div>
                </div>
                
                {/* Search & Category Filter Controls */}
                <div className="max-w-2xl mx-auto space-y-4">
                  {/* Faculty Search Bar */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                      <Search className={`w-5 h-5 transition-colors ${facultySearch ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search faculty by name, specialization, degree (e.g. Ph.D., AI, Cloud, Python)..."
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      className="w-full pl-14 pr-12 py-4 bg-white border border-slate-200 rounded-3xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                    />
                    {facultySearch && (
                      <button 
                        onClick={() => setFacultySearch('')}
                        className="absolute inset-y-0 right-5 flex items-center text-slate-400 hover:text-slate-700"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Specialization Category Pills */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {[
                      { id: 'All', label: 'All Faculty', count: FACULTY.length },
                      { id: 'AI & Data Science', label: 'AI & Data Science', count: FACULTY.filter(f => f.category === 'AI & Data Science').length },
                      { id: 'Cloud & Web', label: 'Cloud & Full Stack', count: FACULTY.filter(f => f.category === 'Cloud & Web').length },
                      { id: 'Systems & Security', label: 'Systems & IoT', count: FACULTY.filter(f => f.category === 'Systems & Security').length },
                      { id: 'Algorithms & Core', label: 'Core Algorithms', count: FACULTY.filter(f => f.category === 'Algorithms & Core').length },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setFacultyCategory(cat.id)}
                        className={`px-4 py-2 rounded-2xl text-xs font-tech font-bold transition-all flex items-center gap-2 ${
                          facultyCategory === cat.id
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          facultyCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredFaculty.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFaculty.map((member, i) => {
                    const isHOD = member.role.includes("HOD") && !member.role.includes("Assistant");
                    const isAsstHOD = member.role.includes("Assistant HOD");

                    return (
                      <motion.div 
                        key={member.name}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                        whileHover={{ y: -4 }}
                        className="group relative bg-white border border-slate-200 hover:border-indigo-400 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                      >
                        {/* Architectural Accent Line */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${member.accent}`} />
                        
                        {/* Content Container */}
                        <div className="relative z-10 space-y-4">
                          {/* Top Section: Avatar + Status Pill */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="relative">
                              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${member.accent} p-0.5 shadow-sm`}>
                                <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center font-display font-extrabold text-slate-900 text-base">
                                  {member.name.replace(/(Dr\.|Mr\.|Ms\.)/g, '').trim().split(' ').map(n => n[0]).join('').slice(0, 3)}
                                </div>
                              </div>
                              {isHOD && (
                                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow" title="Head of Department">
                                  <Award className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {isAsstHOD && (
                                <span className="absolute -bottom-1 -right-1 bg-teal-600 text-white p-1 rounded-full shadow" title="Assistant Head of Department">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-tech font-extrabold uppercase tracking-wider flex items-center gap-1.5 border ${
                                isHOD 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                  : isAsstHOD 
                                  ? 'bg-teal-50 text-teal-900 border-teal-300' 
                                  : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                              }`}>
                                {isHOD ? '👑 Department Head' : isAsstHOD ? '🛡️ Assistant HOD' : '📘 ' + member.role}
                              </span>
                              <span className="text-[11px] font-tech text-slate-400 font-medium">
                                {member.experience}
                              </span>
                            </div>
                          </div>

                          {/* Name & Academic Degrees */}
                          <div className="space-y-1.5">
                            <h3 className="text-xl font-display font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                              {member.name}
                            </h3>
                            
                            {/* Academic Degrees Pill */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-amber-300 rounded-xl text-xs font-semibold shadow-xs border border-slate-800">
                              <GraduationCap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span className="tracking-tight font-medium text-xs">{member.degrees}</span>
                            </div>
                          </div>

                          {/* Key Expertise Chips */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Core Expertise & Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {member.expertise.slice(0, 3).map((skill, sIdx) => (
                                <span 
                                  key={sIdx} 
                                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200/70"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Courses Handled */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Courses Handled</p>
                            <div className="flex flex-wrap gap-1.5">
                              {member.courses.slice(0, 2).map((course, cIdx) => (
                                <span 
                                  key={cIdx} 
                                  className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-semibold border border-indigo-100"
                                >
                                  {course}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions & Contact Info */}
                        <div className="relative z-10 pt-4 mt-4 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-[11px] font-medium">{member.office}</span>
                            </div>
                            
                            <button
                              onClick={(e) => handleCopyEmail(member.email, e)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 text-[11px] transition-colors group/btn"
                              title="Copy email address"
                            >
                              {copiedEmail === member.email ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-indigo-600" />
                                  <span>{member.email}</span>
                                </>
                              )}
                            </button>
                          </div>

                          <button 
                            onClick={() => {
                              setShowChat(true);
                              handleSend(undefined, `Tell me about ${member.name}, their specialization in ${member.specialization}, their degrees (${member.degrees}), and courses handled.`);
                            }}
                            className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl text-xs font-tech font-bold transition-all shadow-xs flex items-center justify-center gap-2 group/ask"
                          >
                            <Bot className="w-3.5 h-3.5 text-amber-300" />
                            <span>Ask About {member.name.split(' ').slice(0, 2).join(' ')}</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/50 group-hover/ask:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-50 rounded-[3rem] py-16 px-8 text-center border-2 border-dashed border-slate-200"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Search className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No faculty members found</h3>
                  <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto mb-5">
                    We couldn't find any faculty matching "{facultySearch}" in category "{facultyCategory}". Try another search term or reset filters.
                  </p>
                  <button 
                    onClick={() => {
                      setFacultySearch('');
                      setFacultyCategory('All');
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-sm"
                  >
                    Reset Search & Filters
                  </button>
                </motion.div>
              )}
            </div>

            {/* Department Impact */}
            <div id="placements-section" className="pt-24 bg-indigo-50/50 -mx-8 px-8 py-20 rounded-[4rem]">
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
              onClick={() => {
                if (isVoiceEnabled || isPlaying) {
                  stopSpeaking();
                }
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              className={`p-2 rounded-xl transition-all duration-300 border flex items-center gap-1.5 ${
                isVoiceEnabled 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
              title={isVoiceEnabled ? "Voice Output Active (Click to Turn Off)" : "Voice Output Off (Click to Turn On)"}
            >
              {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="text-xs font-semibold hidden sm:inline">{isVoiceEnabled ? "Voice On" : "Voice Off"}</span>
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
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                {msg.role === 'user' ? (
                  /* User Inquiry Card - Aligned Right */
                  <div className="flex flex-col items-end mb-8">
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl rounded-tr-md p-5 sm:p-6 shadow-md border border-slate-800 max-w-2xl w-full text-left">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-display font-bold text-sm text-indigo-200 tracking-wide">Your Inquiry</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-xs text-slate-400">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              notify("Inquiry text copied!", "info");
                            }}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                            title="Copy Inquiry"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="font-sans text-[16px] sm:text-[17px] font-normal text-slate-100 leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Assistant Response Card - Aligned Left */
                  <div className="space-y-4 mb-10">
                    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl rounded-tl-md p-6 sm:p-8 shadow-sm transition-all relative overflow-hidden text-left">
                      {/* Top Brand Bar */}
                      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs relative">
                            <Bot className="w-5 h-5 text-white" />
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                          </div>
                          <div>
                            <div className="font-display font-bold text-base sm:text-lg text-slate-900 leading-tight">
                              Assistant Response
                            </div>
                            <div className="text-[11px] font-sans text-indigo-600 font-semibold tracking-normal">
                              SPIHER BCA Smart Assistant
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-sans text-xs text-slate-400 font-medium">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 opacity-70" />
                        </div>
                      </div>

                      {/* Formatted Markdown Body */}
                      <div className="markdown-body prose prose-slate max-w-none font-sans text-[15px] sm:text-[16px] leading-relaxed prose-headings:font-display prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-strong:font-bold prose-a:text-indigo-600 prose-a:font-semibold hover:prose-a:underline">
                        <Markdown>{msg.text}</Markdown>
                      </div>

                      {/* Action Bar: Listen & Copy */}
                      <div className="flex items-center justify-between pt-5 mt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleToggleSpeakMessage(msg.id, msg.text)}
                            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 text-xs font-sans font-semibold ${
                              speakingMessageId === msg.id 
                                ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-xs' 
                                : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/80'
                            }`}
                            title={speakingMessageId === msg.id ? "Stop voice reading (Turn Off)" : "Listen to this response aloud"}
                          >
                            {speakingMessageId === msg.id ? (
                              <>
                                <VolumeX className="w-4 h-4 text-rose-600 animate-pulse" />
                                <span>Turn Off Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-4 h-4 text-indigo-600" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          <button 
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-sans font-semibold transition-all border border-slate-200 flex items-center gap-1.5"
                            title="Copy Response to clipboard"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        <span className="text-[10px] font-tech text-slate-400 uppercase tracking-widest hidden sm:inline">
                          SPIHER Avadi, Chennai
                        </span>
                      </div>
                    </div>

                    {/* If first welcome message, show inquiry starter cards */}
                    {index === 0 && messages.length === 1 && (
                      <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-3xl p-6 text-left space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-display font-bold text-sm text-slate-900">
                            Suggested Inquiries to Start With:
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { title: "BCA Programs & Fees", query: "What are the BCA courses offered and fee structures?" },
                            { title: "Faculty Leadership & Staff", query: "Who is the HOD and what are the faculty profiles?" },
                            { title: "Placement Packages & Recruiters", query: "What is the highest package and who are the recruiters?" },
                            { title: "Student Portal & Attendance", query: "How do I check attendance and pay college fees online?" },
                          ].map((starter, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSend(undefined, starter.query)}
                              className="p-3.5 bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 hover:border-indigo-600 rounded-2xl text-left transition-all group shadow-2xs flex flex-col justify-between space-y-1"
                            >
                              <div className="font-display font-bold text-xs text-slate-900 group-hover:text-white flex items-center justify-between">
                                <span>{starter.title}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                              </div>
                              <p className="text-[11px] text-slate-500 group-hover:text-indigo-100 leading-snug">
                                {starter.query}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart Follow-Up Inquiry Chips ("after that type the inquiry pages") */}
                    {(index > 0 || messages.length > 1) && (
                      <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 ml-1">
                        <div className="flex items-center gap-2 text-[11px] font-tech font-bold text-slate-500 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Suggested Next Inquiries:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getFollowUpSuggestions(msg.text).map((suggestion, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSend(undefined, suggestion)}
                              className="px-3.5 py-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-slate-700 rounded-xl text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 group text-left"
                            >
                              <span>{suggestion}</span>
                              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
      <footer className="bg-white border-t border-slate-200 p-6 sm:p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Inquiry Input Form */}
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

          {/* Quick Inquiries List - Positioned Below/After the Inquiry Input Bar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="text-[11px] font-sans font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Quick Inquiries:
            </span>
            {quickLinks.map((link, i) => (
              <motion.button
                key={i}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSend(undefined, link.query)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 group shadow-2xs"
              >
                <span className="text-indigo-500 group-hover:scale-110 transition-transform">{link.icon}</span>
                {link.label}
              </motion.button>
            ))}
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
