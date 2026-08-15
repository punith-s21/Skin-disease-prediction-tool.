import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, ArrowRight, Activity, Shield, Users, Volume2, VolumeX, Square, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Analysis, Severity } from '../types';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { generatePDFReport } from '../services/reportService';
import { auth } from '../lib/firebase';

interface AnalysisResultProps {
  analysis: Analysis;
  image: string;
  onClose: () => void;
  onReport: () => void;
  language: string;
}

export function parseRecommendationPoints(raw: string): string[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const points: string[] = [];

  for (const line of lines) {
    let clean = line.replace(/^\*\*.*?\*\*:\s*/, '').trim();
    if (!clean) continue;

    const bulletMatch = clean.match(/^[-*•\d\.\)]+\s*(.*)$/);
    if (bulletMatch && bulletMatch[1].trim()) {
      clean = bulletMatch[1].trim();
    }

    if (clean.includes('. ') && clean.length > 90) {
      const sentences = clean
        .split(/(?<=[.?!])\s+(?=[A-Z0-9\u0900-\u0DFF])/g)
        .map(s => s.trim().replace(/^[-*•\d\.\)]+\s*/, ''))
        .filter(s => s.length > 5);
      if (sentences.length > 1) {
        points.push(...sentences);
        continue;
      }
    }

    if (clean.length > 0) {
      points.push(clean);
    }
  }

  if (points.length === 0) {
    return raw
      .split(/(?<=[.?!])\s+/g)
      .map(s => s.replace(/^[-*•\d\.\)]+\s*/, '').trim())
      .filter(s => s.length > 5);
  }

  return points;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ 
  analysis, 
  image, 
  onClose,
  onReport,
  language
}) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const recommendationPoints = React.useMemo(() => {
    return parseRecommendationPoints(analysis.recommendation);
  }, [analysis.recommendation]);

  const [downloadStatus, setDownloadStatus] = React.useState<'idle' | 'generating' | 'downloaded' | 'error'>('idle');
  const [speechNotice, setSpeechNotice] = React.useState<string | null>(null);

  // Clean up any speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startSound = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeechNotice(null);

      const spokenPoints = recommendationPoints.length > 0 
        ? recommendationPoints.join('. ') 
        : analysis.recommendation.replace(/[#*`_>~-]/g, '');
      const cleanText = `${analysis.condition}. Primary Recommendation: ${spokenPoints}`;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      utterance.lang = language || 'en-US';
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.warn("Speech synthesis playback event:", e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setSpeechNotice("Speech playback is not supported on this browser.");
      setTimeout(() => setSpeechNotice(null), 4000);
    }
  };

  const stopSound = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const toggleSound = () => {
    if (isSpeaking) {
      stopSound();
    } else {
      startSound();
    }
  };

  const getSeverityStyle = (s: Severity) => {
    switch (s) {
      case Severity.LOW: return 'bg-green-50 text-green-700 border-green-100';
      case Severity.MODERATE: return 'bg-clinical-primary/5 text-clinical-primary border-clinical-primary/10';
      case Severity.HIGH: return 'bg-orange-50 text-orange-700 border-orange-100';
      case Severity.CRITICAL: return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const handleDownloadReport = async () => {
    setDownloadStatus('generating');
    try {
      await generatePDFReport(
        analysis, 
        image, 
        auth.currentUser?.displayName || "Anonymous Patient",
        new Date().toLocaleString(),
        language
      );
      setDownloadStatus('downloaded');
      setTimeout(() => setDownloadStatus('idle'), 3500);
    } catch (err) {
      console.warn("PDF Export note:", err);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 4000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[3rem] shadow-2xl shadow-clinical-primary/5 border border-clinical-border overflow-hidden max-w-4xl w-full mx-auto"
    >
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-1/2 bg-black relative aspect-square lg:aspect-auto">
          <img src={image} alt="Capture" className="w-full h-full object-cover" />
          <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none"></div>
          <div className="absolute bottom-6 left-6 right-6 p-4 glass-morphism rounded-2xl">
            <span className="text-[10px] text-clinical-text/80 font-bold tracking-[0.2em] uppercase flex items-center space-x-2">
              <Shield size={12} className="text-clinical-primary" />
              <span>Verified Clinical Specimen</span>
            </span>
          </div>
        </div>

        <div className="lg:w-1/2 p-8 lg:p-12 space-y-8 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className={cn(
                "inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                getSeverityStyle(analysis.severity)
              )}>
                <Activity size={12} />
                <span>{analysis.severity} Priority</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-clinical-text tracking-tighter leading-[0.95] pt-2">
                {analysis.condition}
              </h2>
              {analysis.localization && (
                <p className="text-xl text-clinical-primary font-bold mt-2">{analysis.localization}</p>
              )}
            </div>
            <div className="text-right flex flex-col items-end">
               <div className="w-16 h-16 rounded-full border-4 border-clinical-primary/20 flex flex-col items-center justify-center">
                  <span className="text-[8px] font-black text-clinical-text/40 uppercase leading-none">Conf.</span>
                  <span className="text-sm font-black text-clinical-primary">{Math.round(analysis.probability * 100)}%</span>
               </div>
               <span className="text-[8px] font-bold text-clinical-text/30 uppercase mt-2">TF.js Hybrid System</span>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="bg-clinical-bg rounded-3xl p-6 border border-clinical-border relative">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center space-x-2 text-clinical-primary/60">
                  <Info size={16} />
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest leading-none pt-0.5">Primary Recommendation</h4>
                </div>
                
                {/* Sound Controls: Sound On and Stop */}
                <div className="flex items-center bg-white border border-clinical-border rounded-xl p-1 shadow-2xs space-x-1">
                  <button 
                    type="button"
                    onClick={startSound}
                    className={cn(
                      "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer",
                      isSpeaking 
                        ? "bg-clinical-primary text-white shadow-sm shadow-clinical-primary/25 ring-2 ring-clinical-primary/30" 
                        : "text-clinical-primary bg-clinical-primary/5 hover:bg-clinical-primary/10"
                    )}
                    title="Turn Sound On (Listen to recommendation)"
                  >
                    <Volume2 size={14} className={isSpeaking ? "animate-pulse" : ""} />
                    <span>Sound On</span>
                  </button>

                  <button 
                    type="button"
                    onClick={stopSound}
                    disabled={!isSpeaking}
                    className={cn(
                      "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer",
                      isSpeaking 
                        ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-2xs" 
                        : "text-slate-400 opacity-60 hover:opacity-100 hover:bg-slate-100"
                    )}
                    title="Stop audio narration"
                  >
                    <VolumeX size={14} />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              {speechNotice && (
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                  {speechNotice}
                </div>
              )}
              <div className="space-y-2.5">
                {recommendationPoints.length > 0 ? (
                  recommendationPoints.map((point, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start space-x-3 bg-white rounded-2xl p-3.5 border border-clinical-border shadow-2xs transition-all hover:border-clinical-primary/30"
                    >
                      <div className="w-5 h-5 rounded-full bg-clinical-primary/10 text-clinical-primary flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-clinical-text/80 text-xs sm:text-sm leading-relaxed font-medium">
                        {point}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-clinical-text/70 text-sm leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown>{analysis.recommendation}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={onReport}
                className="bg-clinical-primary text-white rounded-2xl py-6 font-bold active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-clinical-primary/20"
              >
                <Users size={18} />
                <span>Report to Cluster</span>
              </button>
              <button 
                type="button"
                onClick={handleDownloadReport}
                disabled={downloadStatus === 'generating'}
                className={cn(
                  "rounded-2xl py-6 font-bold active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border",
                  downloadStatus === 'downloaded' 
                    ? "bg-green-50 text-green-700 border-green-300"
                    : downloadStatus === 'error'
                    ? "bg-red-50 text-red-700 border-red-300"
                    : "bg-clinical-primary/5 text-clinical-primary border-clinical-primary/20 hover:bg-clinical-primary/10"
                )}
              >
                <FileDown size={18} className={downloadStatus === 'generating' ? 'animate-bounce' : ''} />
                <span>
                  {downloadStatus === 'generating' 
                    ? 'Generating PDF...' 
                    : downloadStatus === 'downloaded'
                    ? 'PDF Downloaded!'
                    : downloadStatus === 'error'
                    ? 'Download Failed'
                    : 'Download Report'}
                </span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="w-full bg-white border border-clinical-border text-clinical-text rounded-2xl py-6 font-bold active:scale-95 transition-all"
            >
              New Scan
            </button>
          </div>

          <div className="flex items-start space-x-3 pt-6 border-t border-clinical-border">
            <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
            <p className="text-[10px] leading-relaxed text-red-600/60 font-bold uppercase tracking-tight">
              ETHICAL DISCLAIMER (MANDATORY): This system is for educational and research purposes only. It is not a medical diagnostic tool. Please consult a qualified healthcare professional.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
