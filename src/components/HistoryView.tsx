import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronRight, Activity, Calendar, Trash2 } from 'lucide-react';
import { HistoryItem, Severity } from '../types';
import { cn } from '../lib/utils';

interface HistoryViewProps {
  items: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ items, onSelectItem, onClearHistory, onDeleteItem }) => {
  const getSeverityColor = (s: Severity) => {
    switch (s) {
      case Severity.LOW: return 'text-green-500 bg-green-50';
      case Severity.MODERATE: return 'text-clinical-primary bg-clinical-primary/5';
      case Severity.HIGH: return 'text-orange-500 bg-orange-50';
      case Severity.CRITICAL: return 'text-red-500 bg-red-50';
      default: return 'text-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clinical-primary">Clinical Archive</h4>
          <h1 className="text-5xl font-black tracking-tight text-clinical-text">Case History</h1>
          <p className="text-clinical-text/40 text-sm">Reviewing localized patient data stored on this device.</p>
        </div>
        
        {items.length > 0 && (
          <button 
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to permanently clear all patient scan history? This action cannot be undone.")) {
                onClearHistory();
              }
            }}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
            title="Permanently clear all scan history"
          >
            <Trash2 size={16} />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border border-clinical-border border-dashed">
          <div className="w-20 h-20 rounded-full bg-clinical-bg flex items-center justify-center mx-auto mb-6 text-clinical-text/20">
            <Clock size={40} />
          </div>
          <h3 className="text-xl font-bold text-clinical-text">No records found</h3>
          <p className="text-clinical-text/40 text-sm mt-1">Evaluations will appear here after analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-white border border-clinical-border p-5 rounded-[2rem] flex items-center justify-between hover:border-clinical-primary hover:shadow-xl hover:shadow-clinical-primary/5 transition-all text-left"
              >
                <div 
                  onClick={() => onSelectItem(item)}
                  className="flex items-center space-x-6 flex-1 cursor-pointer"
                >
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                    <img src={item.image} className="w-full h-full object-cover" alt="Scan" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                       <span className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider",
                        getSeverityColor(item.analysis.severity)
                      )}>
                        {item.analysis.severity}
                      </span>
                      <span className="text-[10px] font-bold text-clinical-text/30 flex items-center space-x-1">
                        <Calendar size={10} />
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-clinical-text">{item.analysis.condition}</h3>
                    <p className="text-xs text-clinical-text/40 font-medium line-clamp-1 max-w-md">
                      Type {item.skinTone} • {item.analysis.recommendation.slice(0, 80)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this record?")) onDeleteItem(item.id);
                    }}
                    className="w-10 h-10 rounded-full border border-red-50 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div 
                    onClick={() => onSelectItem(item)}
                    className="w-12 h-12 rounded-full border border-clinical-border flex items-center justify-center text-clinical-text/20 group-hover:text-clinical-primary group-hover:border-clinical-primary/30 transition-all cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
