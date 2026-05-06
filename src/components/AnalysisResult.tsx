import React from 'react';
import { AlertTriangle, CheckCircle, Info, ArrowRight, Activity, Shield, Users, Volume2, FileDown } from 'lucide-react';
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

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ 
  analysis, 
  image, 
  onClose,
  onReport,
  language
}) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);

  const speak = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        `${analysis.condition}. ${analysis.recommendation.replace(/[#*`]/g, '')}`
      );
      
      utterance.lang = language;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      alert("Speech synthesis not supported in this browser.");
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
    try {
      await generatePDFReport(
        analysis, 
        image, 
        auth.currentUser?.displayName || "Anonymous Patient"
      );
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to generate PDF. Please check your browser permissions.");
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-clinical-primary/60">
                  <Info size={16} />
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest leading-none pt-0.5">Primary Recommendation</h4>
                </div>
                <button 
                  onClick={speak}
                  className={cn(
                    "p-3 rounded-xl border transition-all active:scale-95",
                    isSpeaking 
                      ? "bg-clinical-primary text-white border-clinical-primary shadow-lg shadow-clinical-primary/20 animate-pulse" 
                      : "bg-white text-clinical-primary border-clinical-border hover:border-clinical-primary/40"
                  )}
                >
                  <Volume2 size={16} />
                </button>
              </div>
              <div className="text-clinical-text/70 text-sm leading-relaxed prose prose-sm max-w-none prose-p:mb-2 last:prose-p:mb-0">
                <ReactMarkdown>{analysis.recommendation}</ReactMarkdown>
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
                onClick={handleDownloadReport}
                className="bg-clinical-primary/5 text-clinical-primary border border-clinical-primary/20 rounded-2xl py-6 font-bold active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <FileDown size={18} />
                <span>Download Report</span>
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
