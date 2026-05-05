import React, { useState, useEffect } from 'react';
import { Shield, Activity, Radar, ArrowLeft, Menu, Settings, User, Languages, Leaf, Clock, Users, ChevronRight, ScanLine, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraCapture } from './components/CameraCapture';
import { VoiceInterface } from './components/VoiceInterface';
import { AnalysisResult } from './components/AnalysisResult';
import { CommunityRadar } from './components/CommunityRadar';
import { SkinTonePicker, SkinTone } from './components/SkinTonePicker';
import { Landing } from './components/Landing';
import { analyzeSkinCondition } from './services/geminiService';
import { initEnsemble } from './services/modelService';
import { Analysis, Severity, HistoryItem, Language } from './types';
import { cn } from './lib/utils';
import { HistoryView } from './components/HistoryView';
import { auth, signIn, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';

const LOCALE_TO_LANGUAGE: Record<string, Language> = {
  'en-IN': Language.ENGLISH,
  'hi-IN': Language.HINDI,
  'ta-IN': Language.TAMIL,
  'te-IN': Language.TELUGU,
  'bn-IN': Language.BENGALI,
  'mr-IN': Language.MARATHI,
  'kn-IN': Language.KANNADA,
};

export default function App() {
  const [view, setView] = useState<'landing' | 'scanner' | 'radar' | 'history'>('landing');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [voiceDescription, setVoiceDescription] = useState("");
  const [skinTone, setSkinTone] = useState<SkinTone>(5);
  const [language, setLanguage] = useState("en-IN");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isTfReady, setIsTfReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    initEnsemble().then(success => setIsTfReady(success));
    
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('dermal_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync with Firestore history if logged in
  useEffect(() => {
    if (!user) {
      // Revert to local history when logged out
      const saved = localStorage.getItem('dermal_history');
      setHistory(saved ? JSON.parse(saved) : []);
      return;
    }

    // Clear local storage when logging in to avoid confusion with cloud records
    // or we could merge them, but for this clinical app, let's keep them separate
    // localStorage.removeItem('dermal_history'); 

    const historyPath = `users/${user.uid}/history`;
    const q = query(
      collection(db, historyPath),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as HistoryItem[];
      setHistory(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, historyPath);
    });

    return () => unsubscribe();
  }, [user]);

  const saveToHistory = async (newAnalysis: Analysis, image: string) => {
    const timestamp = new Date().toISOString();
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      image,
      analysis: newAnalysis,
      timestamp,
      voiceDescription,
      skinTone
    };

    if (user) {
      const historyPath = `users/${user.uid}/history`;
      try {
        await setDoc(doc(db, historyPath, newItem.id), {
          ...newItem,
          userId: user.uid,
          timestamp: timestamp // Store as string for consistency with types, or use FieldValue
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, historyPath);
      }
    } else {
      const updated = [newItem, ...history];
      setHistory(updated);
      localStorage.setItem('dermal_history', JSON.stringify(updated));
    }
  };

  const deleteHistoryItem = async (id: string) => {
    // Optimistic update for better UX
    const previousHistory = [...history];
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);

    if (user) {
      const path = `users/${user.uid}/history/${id}`;
      try {
        await deleteDoc(doc(db, `users/${user.uid}/history`, id));
      } catch (error) {
        setHistory(previousHistory); // Rollback
        alert("Failed to delete item from server.");
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      localStorage.setItem('dermal_history', JSON.stringify(updated));
    }
  };

  const clearHistory = async () => {
    const previousHistory = [...history];
    setHistory([]);

    if (user) {
      const historyPath = `users/${user.uid}/history`;
      try {
        const q = query(collection(db, historyPath));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (error) {
        setHistory(previousHistory); // Rollback
        alert("Failed to clear history from server.");
        handleFirestoreError(error, OperationType.DELETE, historyPath);
      }
    } else {
      localStorage.removeItem('dermal_history');
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      alert("Sign in failed");
    }
  };

  const handleSignOut = () => signOut(auth);

  const handleCapture = (image: string) => {
    setCapturedImage(image);
  };

  const startAnalysis = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    try {
      const langEnum = LOCALE_TO_LANGUAGE[language] || Language.ENGLISH;
      const result = await analyzeSkinCondition(capturedImage, voiceDescription, skinTone, "India", langEnum);
      setAnalysis(result);
      saveToHistory(result, capturedImage);
    } catch (err) {
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setVoiceDescription("");
  };

  const reportToCommunity = async () => {
    if (!analysis) return;
    const alertId = Math.random().toString(36).substr(2, 9);
    const alertPath = `alerts/${alertId}`;
    try {
      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId,
        condition: analysis.condition,
        severity: analysis.severity,
        location: "Maharashtra-Rural",
        timestamp: new Date().toISOString()
      });
      alert("Reported successfully to community surveillance.");
      resetScanner();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, alertPath);
    }
  };

  if (view === 'landing') {
    return (
      <Landing 
        onStartScanner={() => setView('scanner')} 
        onViewRadar={() => setView('radar')} 
        selectedLanguage={language}
        onLanguageChange={setLanguage}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-clinical-bg selection:bg-clinical-primary selection:text-white pb-32">
      {/* Header */}
      <nav className="fixed top-0 inset-x-0 h-16 glass-morphism z-50 px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div 
              onClick={() => setView('landing')}
              className="w-8 h-8 bg-clinical-primary rounded-lg flex items-center justify-center text-white cursor-pointer"
            >
              <Leaf size={18} />
            </div>
            <span className="text-xl font-black tracking-tighter text-clinical-text">DermAl</span>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-clinical-text uppercase hidden sm:block tracking-wider">{user.displayName || "Dr."}</span>
                <button onClick={handleSignOut} className="text-clinical-text/40 hover:text-red-500 transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            )}
            <div className="text-[10px] font-bold text-clinical-text/40 uppercase tracking-widest">Field Clinic</div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-24 px-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'scanner' ? (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {analysis ? (
                <AnalysisResult 
                  analysis={analysis} 
                  image={capturedImage!} 
                  onClose={resetScanner} 
                  onReport={reportToCommunity}
                  language={language}
                />
              ) : isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-8 text-center bg-white rounded-[3rem] border border-clinical-border">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-clinical-primary/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-clinical-primary rounded-full border-t-transparent animate-spin"></div>
                    <Activity className="absolute inset-0 m-auto text-clinical-primary animate-pulse" size={40} />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight">Hybrid Ensemble Pulse</h2>
                    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                      {['CNN', 'VGG16', 'InceptionV3', 'DenseNet'].map(m => (
                        <div key={m} className="flex items-center space-x-2 bg-clinical-bg border border-clinical-border px-3 py-1.5 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-mono font-bold text-clinical-text/60">{m}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-clinical-text/40 text-sm max-w-xs mx-auto mt-2 italic font-medium">
                      Validating across four architectures via TF.js Hybrid Consensus...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Scanner Section */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clinical-primary">New Skin Check</h4>
                      <h1 className="text-5xl font-black tracking-tight text-clinical-text">Capture & describe</h1>
                      <p className="text-clinical-text/50">Take a clear, well-lit photo of the affected skin area, ideally within 15cm. Bias-aware analysis for darker skin tones.</p>
                    </div>
                    <CameraCapture onCapture={handleCapture} />
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 gap-6">
                    <SkinTonePicker selected={skinTone} onChange={setSkinTone} />
                    
                    <div className="bg-clinical-surface border border-clinical-border rounded-[2rem] p-6 shadow-sm">
                       <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clinical-primary/60 mb-4">
                        Describe Symptoms (Optional)
                      </h4>
                      <textarea 
                        value={voiceDescription}
                        onChange={(e) => setVoiceDescription(e.target.value)}
                        placeholder="e.g., itchy patches for 2 weeks, worse at night..."
                        className="w-full h-32 p-4 bg-clinical-bg border border-clinical-border rounded-xl resize-none text-sm focus:ring-2 focus:ring-clinical-primary/20 outline-none"
                      />
                      <div className="mt-4 flex items-center justify-between">
                         <VoiceInterface onTranscriptChange={setVoiceDescription} language={language} />
                         <select 
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="bg-white border border-clinical-border rounded-xl px-4 py-3 text-xs font-bold text-gray-600 outline-none"
                         >
                           <option value="en-IN">English</option>
                           <option value="hi-IN">हिन्दी (Hindi)</option>
                           <option value="mr-IN">मराठी (Marathi)</option>
                           <option value="ta-IN">தமிழ் (Tamil)</option>
                           <option value="te-IN">తెలుగు (Telugu)</option>
                           <option value="bn-IN">বাংলা (Bengali)</option>
                           <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                         </select>
                      </div>
                    </div>
                  </div>

                  {capturedImage && (
                    <motion.button 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={startAnalysis}
                      className="w-full bg-clinical-primary text-white py-8 rounded-[2rem] text-xl font-bold flex items-center justify-center space-x-3 shadow-xl shadow-clinical-primary/30 active:scale-[0.98] transition-all"
                    >
                      <span>Analyze skin</span>
                      <ChevronRight size={24} />
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          ) : view === 'radar' ? (
            <motion.div 
              key="radar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CommunityRadar />
            </motion.div>
          ) : view === 'history' ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HistoryView 
                items={history} 
                onSelectItem={(item) => {
                  setCapturedImage(item.image);
                  setAnalysis(item.analysis);
                  setVoiceDescription(item.voiceDescription || "");
                  setSkinTone(item.skinTone as SkinTone);
                  setView('scanner');
                }}
                onClearHistory={clearHistory}
                onDeleteItem={deleteHistoryItem}
              />
            </motion.div>
          ) : (
             <div className="py-32 text-center text-clinical-text/40 italic">
               Module Error
             </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 p-6 z-50">
        <div className="max-w-md mx-auto h-20 glass-morphism rounded-3xl flex items-center justify-around px-2 shadow-2xl shadow-black/5">
          {[
            { id: 'scanner', icon: ScanLine, label: 'Scan' },
            { id: 'history', icon: Clock, label: 'History' },
            { id: 'radar', icon: Users, label: 'Community' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center space-y-1 h-14 rounded-2xl transition-all",
                view === tab.id 
                  ? "bg-clinical-primary/5 text-clinical-primary" 
                  : "text-clinical-text/30 hover:text-clinical-text/60"
              )}
            >
              <tab.icon size={24} className={view === tab.id ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

