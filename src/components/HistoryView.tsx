import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronRight, Activity, Calendar, Trash2, AlertTriangle, X } from 'lucide-react';
import { HistoryItem, Severity } from '../types';
import { cn } from '../lib/utils';

interface HistoryViewProps {
  items: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ items, onSelectItem, onClearHistory, onDeleteItem }) => {
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const getSeverityColor = (s: Severity) => {
    switch (s) {
      case Severity.LOW: return 'text-green-600 bg-green-50 border-green-200';
      case Severity.MODERATE: return 'text-clinical-primary bg-clinical-primary/5 border-clinical-primary/20';
      case Severity.HIGH: return 'text-orange-600 bg-orange-50 border-orange-200';
      case Severity.CRITICAL: return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const handleConfirmDeleteSingle = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const handleConfirmClearAll = () => {
    onClearHistory();
    setShowClearAllConfirm(false);
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clinical-primary">Clinical Archive</h4>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-clinical-text">Case History</h1>
          <p className="text-clinical-text/50 text-sm">Reviewing patient diagnostic records and localized evaluations.</p>
        </div>
        
        {items.length > 0 && (
          <button 
            type="button"
            onClick={() => setShowClearAllConfirm(true)}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
            title="Permanently clear all scan history"
          >
            <Trash2 size={16} />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-28 text-center bg-white rounded-[3rem] border border-clinical-border border-dashed shadow-2xs">
          <div className="w-20 h-20 rounded-full bg-clinical-bg flex items-center justify-center mx-auto mb-6 text-clinical-text/20">
            <Clock size={40} />
          </div>
          <h3 className="text-xl font-bold text-clinical-text">No records found</h3>
          <p className="text-clinical-text/40 text-sm mt-1">Evaluations will appear here automatically after analysis.</p>
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
                className="group relative bg-white border border-clinical-border p-5 rounded-[2rem] flex items-center justify-between hover:border-clinical-primary hover:shadow-xl hover:shadow-clinical-primary/5 transition-all text-left shadow-2xs"
              >
                <div 
                  onClick={() => onSelectItem(item)}
                  className="flex items-center space-x-5 flex-1 cursor-pointer pr-4"
                >
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-sm flex-shrink-0 border border-slate-100 bg-slate-100">
                    <img src={item.image} className="w-full h-full object-cover" alt="Scan" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </div>
                  
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                        getSeverityColor(item.analysis.severity)
                      )}>
                        {item.analysis.severity}
                      </span>
                      <span className="text-[11px] font-semibold text-clinical-text/40 flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-clinical-text truncate">{item.analysis.condition}</h3>
                    <p className="text-xs text-clinical-text/50 font-medium line-clamp-1 max-w-xl">
                      Phototype {item.skinTone} • {Math.round(item.analysis.probability * 100)}% Match • {item.analysis.recommendation.slice(0, 90)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button 
                    type="button"
                    title="Delete this record"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item);
                    }}
                    className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div 
                    onClick={() => onSelectItem(item)}
                    className="w-10 h-10 rounded-full border border-clinical-border flex items-center justify-center text-clinical-text/30 group-hover:text-clinical-primary group-hover:border-clinical-primary/30 transition-all cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Confirmation Dialog: Delete Single Item */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-100">
                    <Trash2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-clinical-text">Delete Case Record</h3>
                    <p className="text-xs text-clinical-text/50">This action will remove the record from history.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center space-x-3">
                <img 
                  src={itemToDelete.image} 
                  alt="Lesion" 
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-clinical-text truncate">{itemToDelete.analysis.condition}</h4>
                  <p className="text-[11px] text-slate-500">
                    {new Date(itemToDelete.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSingle}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog: Clear All History */}
      <AnimatePresence>
        {showClearAllConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-100">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-clinical-text">Clear All Case History</h3>
                    <p className="text-xs text-clinical-text/50">Permanently delete all {items.length} records.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200/70 rounded-2xl p-4 text-xs text-red-800 leading-relaxed">
                Are you sure you want to permanently clear all <strong>{items.length} patient scan record(s)</strong>? This will wipe both local device storage and synchronized cloud history. This action cannot be undone.
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
