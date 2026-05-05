import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CameraCaptureProps {
  onCapture: (image: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimensions 1200px
        const MAX_DIM = 1200;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to 0.7 quality should keep it around 100-300kb
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError("File too large (max 15MB)");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        onCapture(compressed);
        setError(null);
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-video bg-white rounded-[2rem] overflow-hidden border border-clinical-border shadow-sm group">
      <AnimatePresence mode="wait">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center space-y-6 p-8 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-clinical-primary/5 flex items-center justify-center text-clinical-primary/40 group-hover:scale-110 transition-transform duration-500">
            <Camera size={40} className="stroke-[1.5px]" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-clinical-text">Add skin image</h3>
            <p className="text-clinical-text/40 text-[13px] leading-relaxed px-12">
              Upload a clear photo or use your camera. High resolution ensures better HAM10000 pattern analysis.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-100">
              {error}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full max-w-md">
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:flex-1 py-4 bg-clinical-primary text-white rounded-full font-bold active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-clinical-primary/20"
            >
              <Camera size={18} />
              <span>Capture Specimen</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:flex-1 py-4 bg-white text-clinical-text border border-clinical-border rounded-full font-bold active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <ImageIcon size={18} />
              <span>Gallery</span>
            </button>
            
            {/* Hidden Inputs */}
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
              capture="environment"
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-clinical-text/30 font-bold uppercase tracking-widest pt-2">
            <FileText size={12} />
            <span>Supported: JPG, PNG, WEBP</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
