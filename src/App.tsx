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

// --- BUILD FIX PANNINATHU DA --- ITHU THAAN MUKKIYAM
const VoiceVisualizer = () => null;
const TypingIndicator = () => null;

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
              n.type === 'success'? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              n.type === 'error'? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            {n.type === 'success'? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> :
             n.type === 'error'? <XCircle className="w-5 h-5 text-rose-600 shrink-0" /> :
             <InfoIcon className="w-5 h-5 text-indigo-600 shrink-0" />}
            <p className="text-sm font-medium leading-tight flex-1">{n.message}</p>
            <button onClick={() => removeNotification(n.id)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X className="w-4 h-4 opacity-40 hover:opacity-100" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
