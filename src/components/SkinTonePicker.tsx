import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';

export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6;

interface SkinTonePickerProps {
  selected: SkinTone;
  onChange: (tone: SkinTone) => void;
}

const tones = [
  { id: 1, name: 'Type I', desc: 'Very fair, always burns', color: '#F7E3CD' },
  { id: 2, name: 'Type II', desc: 'Fair, burns easily', color: '#E8C6A5' },
  { id: 3, name: 'Type III', desc: 'Medium, sometimes burns', color: '#C99E7B' },
  { id: 4, name: 'Type IV', desc: 'Olive, rarely burns', color: '#A5714E' },
  { id: 5, name: 'Type V', desc: 'Brown, very rarely burns', color: '#6F432A' },
  { id: 6, name: 'Type VI', desc: 'Black, never burns', color: '#311E14' },
];

export const SkinTonePicker: React.FC<SkinTonePickerProps> = ({ selected, onChange }) => {
  return (
    <div className="bg-clinical-surface border border-clinical-border rounded-[2rem] p-6 shadow-sm">
      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clinical-primary/60 mb-5">
        Fitzpatrick Skin Tone
      </h4>
      
      <div className="flex space-x-3 overflow-x-auto pb-4 scroll-hide -mx-2 px-2">
        {tones.map((tone) => (
          <button
            key={tone.id}
            onClick={() => onChange(tone.id as SkinTone)}
            className={cn(
              "flex-shrink-0 w-32 p-4 rounded-2xl border-2 transition-all text-left group",
              selected === tone.id 
                ? "border-clinical-primary bg-clinical-primary/5 ring-4 ring-clinical-primary/5" 
                : "border-clinical-border hover:border-clinical-primary/30"
            )}
          >
            <div 
              className="w-12 h-12 rounded-xl mb-3 shadow-inner"
              style={{ backgroundColor: tone.color }}
            />
            <div className="space-y-0.5">
              <span className="block text-sm font-bold text-gray-900 leading-tight">{tone.name}</span>
              <span className="block text-[10px] text-gray-500 leading-tight">{tone.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {(selected === 5 || selected === 6) && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 bg-clinical-primary/5 border border-clinical-primary/10 rounded-xl flex items-start space-x-2"
        >
          <Info size={14} className="text-clinical-primary mt-0.5 flex-shrink-0" />
          <p className="text-[10px] leading-relaxed text-clinical-primary font-medium">
            <strong>Bias-aware mode active:</strong> analysis will prioritize pigmentation, induration and texture over redness (erythema).
          </p>
        </motion.div>
      )}
    </div>
  );
};
