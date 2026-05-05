import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface VoiceInterfaceProps {
  onTranscriptChange: (transcript: string) => void;
  language?: string; // 'hi-IN', 'ta-IN', 'mr-IN'
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ 
  onTranscriptChange, 
  language = 'hi-IN' 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognition = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = language;

      recognition.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        if (currentTranscript) {
          setTranscript(prev => {
            const next = prev + " " + currentTranscript;
            onTranscriptChange(next);
            return next;
          });
        }
      };

      recognition.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
    } else {
      setBrowserSupported(false);
    }
  }, [language, onTranscriptChange]);

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      recognition.current?.start();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={toggleListening}
        className={cn(
          "h-14 px-6 rounded-full flex items-center justify-center space-x-2 transition-all active:scale-95 border",
          isListening 
            ? "bg-red-50 text-red-500 border-red-200 shadow-lg shadow-red-100" 
            : "bg-white text-clinical-primary border-clinical-border shadow-sm hover:border-clinical-primary/40"
        )}
      >
        {isListening ? (
          <>
            <MicOff size={18} />
            <span className="text-sm font-bold">Stop Listening</span>
          </>
        ) : (
          <>
            <Mic size={18} />
            <span className="text-sm font-bold">Speak symptoms</span>
          </>
        )}
      </button>
      
      {isListening && (
        <div className="flex items-center space-x-1 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-red-300" />
          <div className="w-1.5 h-1.5 rounded-full bg-red-200" />
        </div>
      )}
    </div>
  );
};

import { useRef } from 'react';
