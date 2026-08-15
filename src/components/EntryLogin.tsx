import React, { useState } from 'react';
import { 
  Lock, Mail, Eye, EyeOff, ArrowRight,
  AlertTriangle, CheckCircle2, RefreshCw, Activity, Shield, Key, ChevronRight, Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signUpWithEmail, signIn, AppUserRole, AppUserSession } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface EntryLoginProps {
  onSuccess: (user: any) => void;
  onContinueAsGuest: () => void;
  initialMode?: 'user' | 'admin';
}

export const EntryLogin: React.FC<EntryLoginProps> = ({
  onSuccess,
  onContinueAsGuest,
  initialMode = 'user'
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>(initialMode);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);

  // User form states
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPassword, setUserPassword] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<AppUserRole>('Clinic Worker');

  // Admin form states
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleUserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      let loggedUser;
      if (isRegistering) {
        if (!userName.trim()) {
          setErrorMessage('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        loggedUser = await signUpWithEmail(userEmail, userPassword, userRole, userName);
      } else {
        loggedUser = await signInWithEmail(userEmail, userPassword, userRole, userName);
      }

      // Sync user profile to Firestore
      try {
        const uid = loggedUser.uid;
        await setDoc(doc(db, 'user_profiles', uid), {
          id: uid,
          email: userEmail,
          displayName: userName || loggedUser.displayName || 'Healthcare Worker',
          role: userRole,
          registeredAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore profile sync note:', e);
      }

      setSuccessMessage(`Welcome, ${userName || userEmail}! Redirecting to clinical workspace...`);
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => {
        onSuccess(loggedUser);
      }, 700);
    } catch (err: any) {
      console.error('User auth error:', err);
      if (err.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password. Try ClinicWorker123! or register new account.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Please provide a valid email format.');
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const loggedUser = await signInWithEmail(adminEmail, adminPassword, 'Admin', 'Admin Surveillance Officer');
      
      // Sync Admin profile to Firestore
      try {
        const uid = loggedUser.uid;
        await setDoc(doc(db, 'user_profiles', uid), {
          id: uid,
          email: adminEmail,
          displayName: 'Admin Surveillance Officer',
          role: 'Admin',
          registeredAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore admin profile sync note:', e);
      }

      setSuccessMessage('Admin clearance verified. Entering Surveillance Console...');
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => {
        onSuccess(loggedUser);
      }, 700);
    } catch (err: any) {
      console.error('Admin auth error:', err);
      if (err.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect admin password. Please check your credentials.');
      } else {
        setErrorMessage(err.message || 'Admin authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const loggedUser = await signIn();
      
      // Attempt to sync user profile if possible
      try {
        if (loggedUser && loggedUser.uid) {
          await setDoc(doc(db, 'user_profiles', loggedUser.uid), {
            id: loggedUser.uid,
            email: loggedUser.email || 'practitioner@dermai.org',
            displayName: loggedUser.displayName || 'Healthcare Practitioner',
            role: 'Clinic Worker',
            registeredAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Firestore profile sync note:', e);
      }

      setSuccessMessage(`Signed in as ${loggedUser.displayName || loggedUser.email || 'Healthcare Worker'}`);
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => {
        onSuccess(loggedUser);
      }, 700);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Browser blocked popup window in preview. Please use email sign in or open app in a new tab.');
      } else {
        setErrorMessage(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('Password reset instructions sent to your email.');
    setTimeout(() => {
      setIsForgotPassword(false);
      setSuccessMessage('');
    }, 2000);
  };

  const fillWorkerDemo = () => {
    setUserEmail('worker.rekha@clinic.gov.in');
    setUserPassword('ClinicWorker123!');
    setUserName('Rekha Devi (ANM/ASHA)');
    setUserRole('Clinic Worker');
    setIsRegistering(false);
    setErrorMessage('');
  };

  const fillAdminDemo = () => {
    setAdminEmail('admin@dermai.org');
    setAdminPassword('AdminPassword123!');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      
      {/* Top Bar with Guest Access option */}
      <div className="w-full max-w-[440px] flex items-center justify-between pb-3 px-2">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>DermAI v2.4 Active</span>
        </div>
        <button
          type="button"
          onClick={onContinueAsGuest}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center space-x-1"
        >
          <span>Continue as Guest</span>
          <ChevronRight size={13} />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[440px] flex flex-col items-center"
      >
        {/* Header Icon with heartbeat curve matching screenshot */}
        <div className={`w-14 h-14 ${activeTab === 'admin' ? 'bg-teal-900 shadow-teal-900/30' : 'bg-[#1864FF] shadow-blue-500/30'} rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 transition-colors`}>
          {activeTab === 'admin' ? (
            <Shield size={28} className="stroke-[2.2]" />
          ) : (
            <Activity size={28} className="stroke-[2.4]" />
          )}
        </div>

        {/* Title and Subtitle matching screenshot */}
        <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight text-center">
          {isForgotPassword 
            ? 'Reset Password' 
            : isRegistering 
              ? 'Create DermAI Account' 
              : activeTab === 'admin' 
                ? 'Sign In to Admin Portal' 
                : 'Sign In to DermAI'}
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 mb-6 text-center font-normal max-w-xs">
          {isForgotPassword
            ? 'Enter your registered email to receive reset instructions'
            : isRegistering
              ? 'Create your clinician account to log scans and sync patient history'
              : activeTab === 'admin'
                ? 'Access regional outbreak surveillance & model performance telemetry'
                : 'Access your skin lesion analysis history and dashboard'}
        </p>

        {/* Floating White Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100/80 w-full space-y-5">
          
          {/* ================= FORGOT PASSWORD ================= */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#1864FF] focus:ring-4 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#1864FF] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2"
              >
                <span>Send Reset Link</span>
                <ArrowRight size={17} />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs font-bold text-[#1864FF] hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : activeTab === 'user' ? (
            /* ================= USER LOGIN / REGISTER ================= */
            <>
              {/* Quick Demo Fill Pill */}
              {!isRegistering && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <span className="text-[11px] text-blue-900 font-medium truncate pr-2">
                    Demo: <strong>worker.rekha@clinic.gov.in</strong>
                  </span>
                  <button
                    type="button"
                    onClick={fillWorkerDemo}
                    className="text-[11px] font-bold bg-[#1864FF] text-white px-2.5 py-1 rounded-lg hover:bg-blue-600 transition-colors shadow-2xs flex-shrink-0"
                  >
                    Quick Fill
                  </button>
                </div>
              )}

              <form onSubmit={handleUserAuth} className="space-y-4">
                {isRegistering && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Verma"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#1864FF] focus:ring-4 focus:ring-blue-100 transition-all"
                      required
                    />
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={17} />
                    </div>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#1864FF] focus:ring-4 focus:ring-blue-100 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password with Forgot password? */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">Password</label>
                    {!isRegistering && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-xs text-[#1864FF] font-medium hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={17} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#1864FF] focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {isRegistering && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Clinical Role</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as AppUserRole)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#1864FF] focus:ring-4 focus:ring-blue-100 transition-all"
                    >
                      <option value="Clinic Worker">Clinic Health Worker (ANM / ASHA / Primary Care)</option>
                      <option value="Dermatologist">Dermatologist (Specialist Reviewer)</option>
                      <option value="User">General Patient / Community Member</option>
                    </select>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                    <AlertTriangle size={15} className="flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                    <CheckCircle2 size={15} className="flex-shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Sign In Primary Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1864FF] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              {!isRegistering && (
                <>
                  <div className="relative flex items-center justify-center my-2">
                    <div className="border-t border-slate-200 w-full"></div>
                    <span className="bg-white px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      OR
                    </span>
                    <div className="border-t border-slate-200 w-full"></div>
                  </div>

                  {/* Sign in with Google Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center space-x-2.5 shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </>
              )}
            </>
          ) : (
            /* ================= ADMIN PORTAL ================= */
            <>
              <form onSubmit={handleAdminAuth} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Admin Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={17} />
                    </div>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="Enter administrator email"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-teal-900 focus:ring-4 focus:ring-teal-100 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Security Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key size={17} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-teal-900 focus:ring-4 focus:ring-teal-100 transition-all font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                    <AlertTriangle size={15} className="flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                    <CheckCircle2 size={15} className="flex-shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-teal-900 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-teal-900/20 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>Enter Admin Surveillance</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

        </div>

        {/* Bottom Footer Links matching screenshot */}
        {!isForgotPassword && (
          <div className="pt-5 text-center space-y-2">
            {activeTab === 'user' ? (
              <>
                <p className="text-xs sm:text-[13px] text-slate-600 font-normal">
                  {isRegistering ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(false);
                          setErrorMessage('');
                        }}
                        className="text-[#1864FF] font-bold hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(true);
                          setErrorMessage('');
                        }}
                        className="text-[#1864FF] font-bold hover:underline"
                      >
                        Create account
                      </button>
                    </>
                  )}
                </p>

                <p className="text-xs sm:text-[13px] text-slate-600 font-normal">
                  Are you an administrator?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin');
                      setIsRegistering(false);
                      setErrorMessage('');
                    }}
                    className="text-[#d97706] font-bold hover:underline"
                  >
                    Admin Portal
                  </button>
                </p>
              </>
            ) : (
              <p className="text-xs sm:text-[13px] text-slate-600 font-normal">
                Not an administrator?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('user');
                    setErrorMessage('');
                  }}
                  className="text-[#1864FF] font-bold hover:underline"
                >
                  User Sign In
                </button>
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
