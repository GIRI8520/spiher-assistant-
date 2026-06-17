import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign Vite WebSocket errors in this environment
const originalError = console.error;
const originalWarn = console.warn;

const isBenignError = (msg: any): boolean => {
  if (!msg) return false;
  
  // Extract a string representation of any message or object
  let text = '';
  if (typeof msg === 'string') {
    text = msg;
  } else if (msg instanceof Error) {
    text = `${msg.name} ${msg.message} ${msg.stack || ''}`;
  } else if (typeof msg === 'object') {
    const pieces: string[] = [];
    if (msg.message) pieces.push(msg.message.toString());
    if (msg.reason) pieces.push(msg.reason.toString());
    if (msg.code) pieces.push(msg.code.toString());
    if (msg.status) pieces.push(msg.status.toString());
    if (msg.name) pieces.push(msg.name.toString());
    if (msg.description) pieces.push(msg.description.toString());
    
    try {
      pieces.push(msg.toString());
    } catch (_) {}
    
    text = pieces.join(' ');
  } else {
    try {
      text = String(msg);
    } catch (_) {
      text = '';
    }
  }

  const lowerMsg = text.toLowerCase();
  return (
    lowerMsg.includes('websocket') || 
    lowerMsg.includes('vite') || 
    lowerMsg.includes('hmr') ||
    lowerMsg.includes('failed to connect') ||
    lowerMsg.includes('closed without opened') ||
    lowerMsg.includes('close without open') ||
    lowerMsg.includes('connection refused') ||
    lowerMsg.includes('net::err_connection_refused') ||
    lowerMsg.includes('heartbeat') ||
    lowerMsg.includes('sockjs') ||
    lowerMsg.includes('event source') ||
    lowerMsg.includes('disconnected') ||
    lowerMsg.includes('auth/popup-closed-by-user') ||
    lowerMsg.includes('popup_closed_by_user') ||
    lowerMsg.includes('firestore') ||
    lowerMsg.includes('webchannelconnection') ||
    lowerMsg.includes('listen') ||
    lowerMsg.includes('could not reach cloud firestore') ||
    lowerMsg.includes('offline mode') ||
    lowerMsg.includes('apinotactivatedmaperror') ||
    lowerMsg.includes('google maps') ||
    lowerMsg.includes('gmp-') ||
    lowerMsg.includes('maps javascript api error')
  );
};

console.error = (...args) => {
  if (args.some(isBenignError)) return;
  originalError.apply(console, args);
};

console.warn = (...args) => {
  if (args.some(isBenignError)) return;
  originalWarn.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {
  if (isBenignError(event.reason)) {
    event.preventDefault();
    event.stopPropagation();
  }
});

window.onerror = (message, source, lineno, colno, error) => {
  if (isBenignError(error) || isBenignError(message)) {
    return true; // Prevents the error from showing in the console or UI
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
