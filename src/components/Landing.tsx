import React from 'react';
import { Leaf, ChevronRight, Shield, Mic, Activity, Globe, LogIn, LogOut, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User as FirebaseUser } from 'firebase/auth';

interface LandingProps {
  onStartScanner: () => void;
  onViewRadar: () => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  user: FirebaseUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Landing: React.FC<LandingProps> = ({ 
  onStartScanner, 
  onViewRadar,
  selectedLanguage,
  onLanguageChange,
  user,
  onSignIn,
  onSignOut
}) => {
  const languages = [
    { name: 'English', native: 'English', id: 'en-IN' },
    { name: 'Hindi', native: 'हिन्दी', id: 'hi-IN' },
    { name: 'Tamil', native: 'தமிழ்', id: 'ta-IN' },
    { name: 'Telugu', native: 'తెలుగు', id: 'te-IN' },
    { name: 'Bengali', native: 'বাংলা', id: 'bn-IN' },
    { name: 'Marathi', native: 'मराठी', id: 'mr-IN' },
    { name: 'Kannada', native: 'ಕನ್ನಡ', id: 'kn-IN' },
  ];

  const translations: Record<string, { start: string, radar: string }> = {
    'en-IN': { start: 'Start skin check', radar: 'Community alerts' },
    'hi-IN': { start: 'त्वचा की जांच शुरू करें', radar: 'सामुदायिक अलर्ट' },
    'ta-IN': { start: 'தோல் பரிசோதனையைத் தொடங்குங்கள்', radar: 'சமூக எச்சரிக்கைகள்' },
    'te-IN': { start: 'చర్మ తనిఖీని ప్రారంభించండి', radar: 'కమ్యూనిటీ అలర్ట్‌లు' },
    'bn-IN': { start: 'ত্বক পরীক্ষা শুরু করুন', radar: 'কমিউনিটি সতর্কতা' },
    'mr-IN': { start: 'त्वचा तपासणी सुरू करा', radar: 'सामुदायिक अलर्ट' },
    'kn-IN': { start: 'ಚರ್ಮದ ತಪಾಸಣೆ ಪ್ರಾರಂಭಿಸಿ', radar: 'ಸಮುದಾಯ ಎಚ್ಚರಿಕೆಗಳು' },
  };

  const currentLabels = translations[selectedLanguage] || translations['en-IN'];

  return (
    <div className="min-h-screen medical-grid pt-12 pb-24 px-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-16">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-clinical-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-clinical-primary/20">
            <Leaf size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-clinical-text">DermAl</span>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-clinical-text/40 uppercase tracking-widest">Clinic Worker</div>
                <div className="text-xs font-bold text-clinical-text">{user.displayName || "Dr. Field"}</div>
              </div>
              <button 
                onClick={onSignOut}
                className="w-10 h-10 rounded-xl bg-clinical-surface border border-clinical-border flex items-center justify-center text-clinical-text/40 hover:text-red-500 transition-colors"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={onSignIn}
              className="flex items-center space-x-2 bg-clinical-primary/10 text-clinical-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-clinical-primary hover:text-white transition-all shadow-sm"
            >
              <LogIn size={16} />
              <span>Sign in for centralized storage</span>
            </button>
          )}
          <div className="text-[10px] font-bold tracking-[0.2em] text-clinical-primary/40 uppercase hidden md:block">
            V1 • Field Build
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="mb-20">
        <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clinical-primary border-l-2 border-clinical-primary pl-3 mb-6">
          For Community Health Workers
        </h4>
        <h1 className="text-6xl md:text-8xl font-black tracking-[-0.04em] text-clinical-text leading-[0.9] mb-8">
          Dermatology care <br />
          <span className="text-clinical-primary">that reaches the last mile.</span>
        </h1>
        <p className="text-xl text-clinical-text/60 max-w-xl leading-relaxed mb-12">
          Dermatology AI for every community. Bias-aware AI tuned for 
          Fitzpatrick V & VI skin tones, voice input in regional Indian languages, 
          and community-level outbreak alerts — built for low-resource clinics.
        </p>

        <div className="space-y-6 mb-16">
          <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-clinical-text/40">
            Choose your language / भाषा चुनें
          </h5>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button 
                key={lang.id}
                onClick={() => onLanguageChange(lang.id)}
                className={cn(
                  "px-6 py-3 rounded-full text-sm font-bold border transition-all active:scale-95",
                  selectedLanguage === lang.id 
                    ? "bg-clinical-primary text-white border-clinical-primary shadow-lg shadow-clinical-primary/20" 
                    : "bg-white border-clinical-border text-clinical-text hover:border-clinical-primary/40"
                )}
              >
                {lang.native}
              </button>
            ))}
          </div>
        </div>


        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={onStartScanner}
            className="flex-1 bg-clinical-primary text-white py-6 rounded-full text-lg font-bold flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl shadow-clinical-primary/20"
          >
            <Activity size={24} />
            <span>{currentLabels.start}</span>
            <ChevronRight size={24} />
          </button>
          <button 
            onClick={onViewRadar}
            className="flex-1 bg-white border border-clinical-primary/20 text-clinical-primary py-6 rounded-full text-lg font-bold flex items-center justify-center space-x-3 active:scale-95 transition-all"
          >
            <span>{currentLabels.radar}</span>
          </button>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {[
          { icon: <Shield />, title: 'Edge Extraction', desc: 'TensorFlow.js runs on-device feature extraction before cloud verification, ensuring data remains localized where possible.' },
          { icon: <Mic />, title: 'Voice-first', desc: 'Describe symptoms in Hindi, Tamil, Telugu, Bengali, Marathi or English. Audio readouts for low-literacy patients.' },
          { icon: <Activity />, title: 'Outbreak radar', desc: 'Anonymized community clusters flag potential outbreaks so local workers act before conditions spread.' }
        ].map((feature, i) => (
          <motion.div 
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-clinical-border p-8 rounded-[2rem] space-y-6 hover:shadow-xl hover:shadow-clinical-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-clinical-primary/10 flex items-center justify-center text-clinical-primary group-hover:bg-clinical-primary group-hover:text-white transition-colors">
              {feature.icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-clinical-text">{feature.title}</h3>
              <p className="text-sm text-clinical-text/50 leading-relaxed">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Disclaimer */}
      <div className="space-y-6">
        <div className="p-8 bg-white border border-clinical-border rounded-[2rem] flex items-start space-x-4">
          <Globe className="text-clinical-primary mt-1" size={24} />
          <p className="text-sm text-clinical-text/60 leading-relaxed">
            Designed for rural India. Built to run on minimal hardware. DermAl provides <strong>assistive insights, not medical diagnoses.</strong> Always route severe or worsening cases to a qualified clinician.
          </p>
        </div>

        <div className="px-8 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
           <div className="flex flex-col">
             <span className="text-[8px] font-black uppercase tracking-widest text-clinical-text mb-1">Total Trained</span>
             <span className="text-xs font-bold text-clinical-text">85,000+ Samples</span>
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] font-black uppercase tracking-widest text-clinical-text mb-1">Source Dataset</span>
             <span className="text-xs font-bold text-clinical-text">HAM10000 + ISIC</span>
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] font-black uppercase tracking-widest text-clinical-text mb-1">Bias Dataset</span>
             <span className="text-xs font-bold text-clinical-text">Fitzpatrick 17k</span>
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] font-black uppercase tracking-widest text-clinical-text mb-1">Accuracy</span>
             <span className="text-xs font-bold text-clinical-text">~94.2% Consensus</span>
           </div>
        </div>

        <div className="mt-12 p-8 bg-clinical-bg/50 border border-clinical-border rounded-[2rem]">
          <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-clinical-text/40 mb-4">Supported Clinical Categories</h5>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['Actinic keratoses', 'Basal cell carcinoma', 'Benign keratosis', 'Dermatofibroma', 'Melanoma', 'Melanocytic nevi', 'Vascular lesions'].map(cat => (
              <span key={cat} className="text-[11px] font-bold text-clinical-text/60 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-clinical-primary/40" />
                <span>{cat}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
