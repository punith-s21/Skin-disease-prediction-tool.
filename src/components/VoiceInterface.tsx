import React, { useState, useEffect, useRef } from 'react';
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

  const [errorNotice, setErrorNotice] = useState<string | null>(null);

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
            const next = (prev ? prev + " " : "") + currentTranscript;
            onTranscriptChange(next);
            return next;
          });
        }
      };

      recognition.current.onerror = (event: any) => {
        console.warn("Speech recognition error notice:", event?.error || event);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setBrowserSupported(false);
    }

    return () => {
      if (recognition.current) {
        try {
          recognition.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [language, onTranscriptChange]);

  const toggleListening = () => {
    if (!browserSupported) {
      setErrorNotice("Speech input is not supported in this browser. Please type symptoms in the notes field.");
      setTimeout(() => setErrorNotice(null), 4000);
      return;
    }

    if (isListening) {
      try {
        recognition.current?.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        setErrorNotice(null);
        recognition.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn("Speech recognition start failed:", e);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <button 
          type="button"
          onClick={toggleListening}
          className={cn(
            "h-14 px-6 rounded-full flex items-center justify-center space-x-2 transition-all active:scale-95 border cursor-pointer",
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

      {errorNotice && (
        <motion.p 
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
        >
          {errorNotice}
        </motion.p>
      )}
    </div>
  );
};
