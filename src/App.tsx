import React, { useState, useEffect } from 'react';
import { Shield, Activity, Radar, ArrowLeft, Menu, Settings, User, Languages, Leaf, Clock, Users, ChevronRight, ScanLine, LogIn, LogOut, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraCapture } from './components/CameraCapture';
import { VoiceInterface } from './components/VoiceInterface';
import { AnalysisResult } from './components/AnalysisResult';
import { CommunityRadar } from './components/CommunityRadar';
import { SkinTonePicker, SkinTone } from './components/SkinTonePicker';
import { Landing } from './components/Landing';
import { AdminAnalytics } from './components/AdminAnalytics';
import { analyzeSkinCondition } from './services/geminiService';
import { initEnsemble } from './services/modelService';
import { Analysis, Severity, HistoryItem, Language } from './types';
import { cn } from './lib/utils';
import { HistoryView } from './components/HistoryView';
import { AuthModal } from './components/AuthModal';
import { EntryLogin } from './components/EntryLogin';
import { auth, signIn, db, getActiveUserSession, setActiveUserSession, signOutUser, AppUserSession } from './lib/firebase';
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
  // Determine initial view: check admin route, active session or login gate
  const getInitialView = (): 'login' | 'landing' | 'scanner' | 'radar' | 'history' | 'admin' => {
    if (window.location.pathname.startsWith('/admin')) return 'admin';
    const active = getActiveUserSession();
    if (active || localStorage.getItem('dermal_guest_entered') === 'true') {
      return 'landing';
    }
    return 'login';
  };

  const [view, setView] = useState<'login' | 'landing' | 'scanner' | 'radar' | 'history' | 'admin'>(getInitialView);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [voiceDescription, setVoiceDescription] = useState("");
  const [skinTone, setSkinTone] = useState<SkinTone>(5);
  const [language, setLanguage] = useState("en-IN");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isTfReady, setIsTfReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userSession, setUserSession] = useState<AppUserSession | null>(getActiveUserSession);

  // Auth modal management
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'user' | 'admin'>('user');

  const openAuthModal = (mode: 'user' | 'admin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Sync window URL path when switching views
  const changeView = (newView: 'login' | 'landing' | 'scanner' | 'radar' | 'history' | 'admin') => {
    setView(newView);
    if (newView === 'admin') {
      window.history.pushState({}, '', '/admin/analytics');
    } else if (newView === 'login') {
      window.history.pushState({}, '', '/login');
    } else if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/login')) {
      window.history.pushState({}, '', '/');
    }
  };

  useEffect(() => {
    initEnsemble().then(success => setIsTfReady(success));
    
    const checkLocalSession = () => {
      const active = getActiveUserSession();
      setUserSession(active);
      if (active) {
        return {
          uid: active.uid,
          email: active.email,
          displayName: active.displayName,
          emailVerified: true
        } as FirebaseUser;
      }
      return null;
    };

    const initialSessionUser = checkLocalSession();
    if (initialSessionUser) {
      setUser(initialSessionUser);
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const currentSession = getActiveUserSession();
        const role = currentSession?.role || 'Clinic Worker';
        const session: AppUserSession = {
          uid: authUser.uid,
          email: authUser.email || 'worker@clinic.gov.in',
          displayName: authUser.displayName || 'Clinic Worker',
          role: role
        };
        setActiveUserSession(session);
        setUserSession(session);

        // Sync user profile to Firestore user_profiles collection
        try {
          const userRef = doc(db, 'user_profiles', authUser.uid);
          await setDoc(userRef, {
            id: authUser.uid,
            email: authUser.email || 'worker@clinic.gov.in',
            displayName: authUser.displayName || 'Clinic Worker',
            registeredAt: authUser.metadata.creationTime ? new Date(authUser.metadata.creationTime).toISOString() : new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            role: role
          }, { merge: true });
        } catch (e) {
          console.warn('User profile sync note:', e);
        }
      } else {
        const localUser = checkLocalSession();
        setUser(localUser);
      }
    });

    const handleStorageChange = () => {
      const localUser = checkLocalSession();
      setUser(localUser);
      const saved = localStorage.getItem('dermal_history');
      setHistory(saved ? JSON.parse(saved) : []);
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for browser popstate
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin')) {
        setView('admin');
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('dermal_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync with Firestore history if logged in with Firebase Auth or user session
  useEffect(() => {
    const effectiveUserId = user?.uid || (auth.currentUser ? auth.currentUser.uid : null);

    if (!effectiveUserId) {
      const saved = localStorage.getItem('dermal_history');
      setHistory(saved ? JSON.parse(saved) : []);
      return;
    }

    const historyPath = `users/${effectiveUserId}/history`;
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
      localStorage.setItem('dermal_history', JSON.stringify(items));
    }, (error) => {
      console.warn("Firestore history sync note:", error);
      const saved = localStorage.getItem('dermal_history');
      setHistory(saved ? JSON.parse(saved) : []);
    });

    return () => unsubscribe();
  }, [user]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  const saveToHistory = async (newAnalysis: Analysis, image: string) => {
    const timestamp = new Date().toISOString();
    const newItem: HistoryItem = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      image,
      analysis: newAnalysis,
      timestamp,
      voiceDescription,
      skinTone
    };

    // 1. Log prediction event for global usage analytics
    const predId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    try {
      await setDoc(doc(db, 'predictions', predId), {
        id: predId,
        userId: user ? user.uid : (userSession?.uid || 'anon_worker'),
        userEmail: user?.email || (userSession?.email || 'Clinic Anonymous'),
        condition: newAnalysis.condition,
        probability: newAnalysis.probability,
        severity: newAnalysis.severity,
        timestamp: timestamp,
        skinTone: skinTone
      });
    } catch (e) {
      console.warn('Prediction log note:', e);
    }

    // 2. Save user specific history locally first
    const updated = [newItem, ...history];
    setHistory(updated);
    localStorage.setItem('dermal_history', JSON.stringify(updated));

    // 3. Save to Firestore if authenticated
    const effectiveUserId = user?.uid || (auth.currentUser ? auth.currentUser.uid : null);
    if (effectiveUserId) {
      const historyPath = `users/${effectiveUserId}/history`;
      try {
        await setDoc(doc(db, historyPath, newItem.id), {
          ...newItem,
          userId: effectiveUserId,
          timestamp: timestamp
        });
      } catch (error) {
        console.warn('Firestore history save fallback:', error);
      }
    }
  };

  const deleteHistoryItem = async (id: string) => {
    // 1. Update local state immediately for instant responsive UI
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('dermal_history', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    showToast("Case record deleted from history.", "info");

    // 2. Delete from Firestore if user has account or session
    const effectiveUserId = user?.uid || (auth.currentUser ? auth.currentUser.uid : null);
    if (effectiveUserId) {
      try {
        await deleteDoc(doc(db, `users/${effectiveUserId}/history`, id));
      } catch (error) {
        console.warn('Firestore history delete error:', error);
      }
    }
  };

  const clearHistory = async () => {
    // 1. Immediately wipe local history and cache
    setHistory([]);
    localStorage.removeItem('dermal_history');
    window.dispatchEvent(new Event('storage'));
    showToast("All case records have been cleared.", "info");

    // 2. Clear cloud history for user in Firestore
    const effectiveUserId = user?.uid || (auth.currentUser ? auth.currentUser.uid : null);
    if (effectiveUserId) {
      const historyPath = `users/${effectiveUserId}/history`;
      try {
        const q = query(collection(db, historyPath));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((d) => {
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      } catch (error) {
        console.warn('Firestore history clear note:', error);
      }
    }
  };

  const handleSignIn = async () => {
    openAuthModal('user');
  };

  const handleSignOut = async () => {
    localStorage.removeItem('dermal_guest_entered');
    await signOutUser();
    setUser(null);
    setUserSession(null);
    window.dispatchEvent(new Event('storage'));
    changeView('login');
  };

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
      showToast("Evaluation complete: " + result.condition, "success");
    } catch (err: any) {
      console.warn("Analysis error note:", err);
      showToast("Clinical analysis failed. Please ensure image is clear and try again.", "error");
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
      showToast("Reported successfully to Community Surveillance.", "success");
      resetScanner();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, alertPath);
      showToast("Failed to report to community surveillance.", "error");
    }
  };

  const userRole = userSession?.role || (user ? 'Clinic Worker' : null);
  const isAdmin = userRole === 'Admin';

  // Render Entry Login View
  if (view === 'login') {
    return (
      <EntryLogin
        initialMode={authModalMode}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setUserSession(getActiveUserSession());
          changeView('landing');
        }}
        onContinueAsGuest={() => {
          localStorage.setItem('dermal_guest_entered', 'true');
          changeView('landing');
        }}
      />
    );
  }

  // Render Admin View
  if (view === 'admin') {
    return (
      <>
        <AdminAnalytics
          user={user}
          onSignIn={() => openAuthModal('admin')}
          onBackToApp={() => changeView('landing')}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          onSuccess={(loggedUser) => {
            setUser(loggedUser);
            setUserSession(getActiveUserSession());
          }}
        />
      </>
    );
  }

  // Render Landing Page
  if (view === 'landing') {
    return (
      <>
        <Landing 
          onStartScanner={() => changeView('scanner')} 
          onViewRadar={() => changeView('radar')} 
          onOpenAdmin={() => changeView('admin')}
          onOpenUserLogin={() => openAuthModal('user')}
          onOpenAdminLogin={() => openAuthModal('admin')}
          selectedLanguage={language}
          onLanguageChange={setLanguage}
          user={user}
          userSession={userSession}
          onSignOut={handleSignOut}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          onSuccess={(loggedUser) => {
            setUser(loggedUser);
            setUserSession(getActiveUserSession());
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-clinical-bg selection:bg-clinical-primary selection:text-white pb-32">
      {/* Header */}
      <nav className="fixed top-0 inset-x-0 h-16 glass-morphism z-50 px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div 
              onClick={() => changeView('landing')}
              className="w-8 h-8 bg-clinical-primary rounded-lg flex items-center justify-center text-white cursor-pointer shadow-sm"
            >
              <Leaf size={18} />
            </div>
            <span 
              onClick={() => changeView('landing')}
              className="text-xl font-black tracking-tighter text-clinical-text cursor-pointer"
            >
              DermAl
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={() => changeView('admin')}
                className="flex items-center space-x-1.5 bg-teal-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-teal-800 transition-all shadow-sm cursor-pointer"
              >
                <Shield size={14} />
                <span className="hidden sm:inline">Admin Surveillance</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-2.5 bg-white px-3 py-1.5 rounded-xl border border-clinical-border shadow-sm">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                  isAdmin ? "bg-teal-900 text-white" : "bg-clinical-primary/10 text-clinical-primary"
                )}>
                  {userRole}
                </span>
                <span className="text-xs font-bold text-clinical-text hidden sm:block truncate max-w-[120px]">
                  {userSession?.displayName || user.displayName || user.email}
                </span>
                <button 
                  onClick={handleSignOut} 
                  className="text-clinical-text/40 hover:text-red-500 transition-colors p-1"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openAuthModal('user')}
                  className="text-xs font-bold text-clinical-primary bg-clinical-primary/10 px-3 py-1.5 rounded-xl hover:bg-clinical-primary hover:text-white transition-all"
                >
                  User Login
                </button>
                <button
                  onClick={() => openAuthModal('admin')}
                  className="text-xs font-bold text-teal-950 bg-teal-100 px-3 py-1.5 rounded-xl hover:bg-teal-900 hover:text-white transition-all hidden sm:inline-block"
                >
                  Admin Sign In
                </button>
              </div>
            )}
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
                  changeView('scanner');
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
            ...(isAdmin ? [{ id: 'admin', icon: Shield, label: 'Admin' }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => changeView(tab.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center space-y-1 h-14 rounded-2xl transition-all cursor-pointer",
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

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-[90%]"
          >
            <div className={cn(
              "px-4 py-3 rounded-2xl shadow-xl border flex items-center justify-between space-x-3 text-sm font-semibold backdrop-blur-md",
              toast.type === 'success' 
                ? "bg-teal-900/90 text-white border-teal-500/30" 
                : toast.type === 'error'
                ? "bg-red-900/90 text-white border-red-500/30"
                : "bg-slate-900/90 text-white border-slate-700/50"
            )}>
              <span className="leading-snug">{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setUserSession(getActiveUserSession());
        }}
      />
    </div>
  );
}
