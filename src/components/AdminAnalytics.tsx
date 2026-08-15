import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Shield, Activity, Users, Calendar, AlertTriangle, Info, Download, 
  Search, RefreshCw, Layers, CheckCircle2, ArrowUpRight, Filter, Clock,
  ChevronRight, Database, Server, Cpu, Mail, Lock, Key, UserPlus, LogOut,
  Eye, EyeOff, X, Check, Trash2, HardDrive, DatabaseZap, AlertOctagon, Sparkles, Eraser, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch, where } from 'firebase/firestore';
import { db, signInWithEmail, signUpWithEmail, signOutUser, getActiveUserSession, AppUserSession, getStoredAccounts, saveStoredAccount, deleteStoredAccount, clearAllStoredAccounts } from '../lib/firebase';
import { PredictionLog, UserProfile, DateRangeOption, Severity } from '../types';

interface AdminAnalyticsProps {
  user: FirebaseUser | null;
  onBackToApp: () => void;
  onSignIn?: () => void;
}

// Color palette for charts
const COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];
const CONFIDENCE_COLORS = {
  VeryHigh: '#059669', // >90%
  High: '#0d9488',     // 80-90%
  Moderate: '#f59e0b', // 70-80%
  Low: '#ef4444'       // <70%
};

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ user, onBackToApp, onSignIn }) => {
  const [currentSession, setCurrentSession] = useState<AppUserSession | null>(getActiveUserSession());
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'raw_logs'>('analytics');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Real-time Firestore or generated states
  const [predictionLogs, setPredictionLogs] = useState<PredictionLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Email & Password Admin Auth states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Sync session on mount and storage changes
  useEffect(() => {
    const updateSession = () => {
      setCurrentSession(getActiveUserSession());
    };
    window.addEventListener('storage', updateSession);
    return () => window.removeEventListener('storage', updateSession);
  }, []);

  const isAdmin = currentSession?.role === 'Admin';

  // Add New User / Admin Modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<'Admin' | 'Dermatologist' | 'Clinic Worker'>('Clinic Worker');
  const [addUserSuccess, setAddUserSuccess] = useState<string>('');
  const [addUserError, setAddUserError] = useState<string>('');
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);

  // Storage & History Management states
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeSuccess, setPurgeSuccess] = useState<string>('');
  const [purgeError, setPurgeError] = useState<string>('');
  const [selectedStorageAction, setSelectedStorageAction] = useState<'all_logs' | 'all_users' | 'older_30d' | 'older_7d' | 'device_cache' | 'deep_wipe' | null>(null);
  const [isConfirmingPurge, setIsConfirmingPurge] = useState<boolean>(false);

  // Local storage metrics
  const localHistoryRaw = typeof window !== 'undefined' ? localStorage.getItem('dermal_history') : null;
  const localCasesCount = useMemo(() => {
    try {
      return localHistoryRaw ? (JSON.parse(localHistoryRaw) || []).length : 0;
    } catch {
      return 0;
    }
  }, [localHistoryRaw, isStorageModalOpen]);

  const estimatedLocalKB = useMemo(() => {
    return localHistoryRaw ? Math.round(new Blob([localHistoryRaw]).size / 1024) : 0;
  }, [localHistoryRaw, isStorageModalOpen]);

  const estimatedFirestoreKB = useMemo(() => {
    return Math.round(predictionLogs.length * 0.45); // ~0.45 KB per document
  }, [predictionLogs.length]);

  const totalEstimatedStorageKB = estimatedLocalKB + estimatedFirestoreKB;

  // Single Log Delete
  const handleDeleteSingleLog = async (logId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'predictions', logId));
    } catch (err) {
      console.warn('Firestore delete single record fallback:', err);
    }
    setPredictionLogs(prev => prev.filter(l => l.id !== logId));
  };

  // Single User Account Delete
  const handleDeleteSingleUser = async (userId: string, userEmail: string, displayName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      try {
        await deleteDoc(doc(db, 'user_profiles', userId));
      } catch (err) {
        console.warn('Firestore delete user fallback:', err);
      }
      deleteStoredAccount(userEmail);
      deleteStoredAccount(userId);
      setUserProfiles(prev => prev.filter(u => u.id !== userId && u.email.toLowerCase() !== userEmail.toLowerCase()));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      console.warn("Delete user error:", err);
    }
  };

  // Clear individual user's prediction history & activity
  const handleClearSingleUserHistory = async (userId: string, userEmail: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const matchingLogs = predictionLogs.filter(l => l.userId === userId || l.userId === userEmail);
      if (matchingLogs.length > 0) {
        try {
          const batch = writeBatch(db);
          matchingLogs.forEach(l => {
            batch.delete(doc(db, 'predictions', l.id));
          });
          await batch.commit();
        } catch (err) {
          console.warn('Firestore batch delete user history fallback:', err);
        }
        setPredictionLogs(prev => prev.filter(l => l.userId !== userId && l.userId !== userEmail));
      }
      setUserProfiles(prev => prev.map(u => {
        if (u.id === userId || u.email.toLowerCase() === userEmail.toLowerCase()) {
          return { ...u, predictionsCount: 0 };
        }
        return u;
      }));
    } catch (err: any) {
      console.warn("Clear user history error:", err);
    }
  };

  // Clear All Prediction Logs
  const handleClearAllPredictionLogs = async () => {
    setIsPurging(true);
    setPurgeError('');
    setPurgeSuccess('');
    try {
      let count = 0;
      try {
        const snap = await getDocs(collection(db, 'predictions'));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => {
            batch.delete(d.ref);
            count++;
          });
          await batch.commit();
        }
      } catch (firestoreErr) {
        console.warn('Firestore batch delete error/offline:', firestoreErr);
      }
      const prevLength = predictionLogs.length;
      setPredictionLogs([]);
      setPurgeSuccess(`Purged ${Math.max(count, prevLength)} telemetry logs from database storage.`);
      setIsConfirmingPurge(false);
      setSelectedStorageAction(null);
    } catch (err: any) {
      setPurgeError(err.message || 'Failed to clear prediction telemetry.');
    } finally {
      setIsPurging(false);
    }
  };

  // Clear All Registered Users & Activity records
  const handleClearAllUsers = async () => {
    setIsPurging(true);
    setPurgeError('');
    setPurgeSuccess('');
    try {
      try {
        const snap = await getDocs(collection(db, 'user_profiles'));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Firestore clear users fallback:', e);
      }
      clearAllStoredAccounts();
      localStorage.setItem('dermal_users_cleared', 'true');
      setUserProfiles([]);
      setPurgeSuccess('All registered user accounts and activity records have been permanently cleared.');
      setIsConfirmingPurge(false);
      setSelectedStorageAction(null);
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setPurgeError(err.message || 'Failed to clear registered user accounts.');
    } finally {
      setIsPurging(false);
    }
  };

  // Seed sample users on demand
  const handleSeedDemoUsers = async () => {
    setIsPurging(true);
    setPurgeError('');
    setPurgeSuccess('');
    try {
      const mockUsers = generateMockUsers();
      try {
        const batch = writeBatch(db);
        mockUsers.forEach(u => {
          batch.set(doc(db, 'user_profiles', u.id), u);
        });
        await batch.commit();
      } catch (e) {
        console.warn('Seed mock users Firestore fallback:', e);
      }
      localStorage.removeItem('dermal_users_cleared');
      setUserProfiles(mockUsers);
      setPurgeSuccess(`Seeded ${mockUsers.length} sample registered user accounts.`);
    } catch (err: any) {
      setPurgeError(err.message || 'Failed to seed sample user accounts.');
    } finally {
      setIsPurging(false);
    }
  };

  // Prune Logs older than X days
  const handlePruneLogs = async (days: number) => {
    setIsPurging(true);
    setPurgeError('');
    setPurgeSuccess('');
    try {
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      let prunedCount = 0;
      try {
        const qOld = query(collection(db, 'predictions'), where('timestamp', '<', cutoff));
        const snap = await getDocs(qOld);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => {
            batch.delete(d.ref);
            prunedCount++;
          });
          await batch.commit();
        }
      } catch (e) {
        console.warn('Firestore prune error/offline:', e);
      }
      const beforeCount = predictionLogs.length;
      const filtered = predictionLogs.filter(l => l.timestamp >= cutoff);
      setPredictionLogs(filtered);
      const totalRemoved = Math.max(prunedCount, beforeCount - filtered.length);
      setPurgeSuccess(`Successfully pruned ${totalRemoved} logs older than ${days} days.`);
      setIsConfirmingPurge(false);
      setSelectedStorageAction(null);
    } catch (err: any) {
      setPurgeError(err.message || `Failed to prune logs older than ${days} days.`);
    } finally {
      setIsPurging(false);
    }
  };

  // Clear Local Device Image & Scan Cache
  const handleClearLocalDeviceHistory = () => {
    setIsPurging(true);
    setPurgeError('');
    setPurgeSuccess('');
    try {
      const count = localCasesCount;
      localStorage.removeItem('dermal_history');
      window.dispatchEvent(new Event('storage'));
      setPurgeSuccess(`Successfully purged local device cache (${count} scan cases & images).`);
      setIsConfirmingPurge(false);
      setSelectedStorageAction(null);
    } catch (err: any) {
      setPurgeError(err.message || 'Failed to clear local device history cache.');
    } finally {
      setIsPurging(false);
    }
  };

  // Deep Storage Reset (Logs + Registered Users + Local History)
  const handleDeepStorageWipe = async () => {
    setIsPurging(true);
    setPurgeError('');
    setPurgeSuccess('');
    try {
      // 1. Delete all predictions
      try {
        const snap = await getDocs(collection(db, 'predictions'));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Deep wipe firestore predictions fallback:', e);
      }

      // 2. Delete all user profiles
      try {
        const snapUsers = await getDocs(collection(db, 'user_profiles'));
        if (!snapUsers.empty) {
          const batchUsers = writeBatch(db);
          snapUsers.docs.forEach(d => batchUsers.delete(d.ref));
          await batchUsers.commit();
        }
      } catch (e) {
        console.warn('Deep wipe firestore users fallback:', e);
      }

      // 3. Clear local storage states
      setPredictionLogs([]);
      setUserProfiles([]);
      clearAllStoredAccounts();
      localStorage.setItem('dermal_users_cleared', 'true');
      localStorage.removeItem('dermal_history');
      window.dispatchEvent(new Event('storage'));

      setPurgeSuccess('Deep storage reset complete: All prediction telemetry, registered user accounts & activity records, and local scan history have been permanently deleted.');
      setIsConfirmingPurge(false);
      setSelectedStorageAction(null);
    } catch (err: any) {
      setPurgeError(err.message || 'Deep storage reset failed.');
    } finally {
      setIsPurging(false);
    }
  };

  // Execute selected action
  const handleExecutePurge = async () => {
    if (selectedStorageAction === 'all_logs') {
      await handleClearAllPredictionLogs();
    } else if (selectedStorageAction === 'all_users') {
      await handleClearAllUsers();
    } else if (selectedStorageAction === 'older_30d') {
      await handlePruneLogs(30);
    } else if (selectedStorageAction === 'older_7d') {
      await handlePruneLogs(7);
    } else if (selectedStorageAction === 'device_cache') {
      handleClearLocalDeviceHistory();
    } else if (selectedStorageAction === 'deep_wipe') {
      await handleDeepStorageWipe();
    }
  };

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!loginEmail || !loginPassword) {
      setAuthError('Please enter both admin email and password.');
      return;
    }
    setIsAuthLoading(true);
    try {
      const loggedUser = await signInWithEmail(loginEmail, loginPassword);
      const isVirtual = (loggedUser as any)?.isVirtualAdmin;
      setAuthSuccess(`Successfully authenticated as ${loggedUser.email || 'Admin'}${isVirtual ? ' (Demo Mode)' : ''}!`);
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setAuthSuccess('');
      }, 1000);
    } catch (err: any) {
      console.error('Email login error:', err);
      if (err.code === 'auth/invalid-email') {
        setAuthError('Invalid email format.');
      } else if (err.code === 'auth/wrong-password') {
        setAuthError('Incorrect password. Please verify administrative credentials.');
      } else {
        setAuthError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setLoginEmail('admin@dermai.org');
    setLoginPassword('AdminPassword123!');
    setAuthError('');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserSuccess('');
    if (!newEmail || !newPassword || !newName) {
      setAddUserError('Please fill in name, email, and password.');
      return;
    }
    setIsAddingUser(true);
    try {
      const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
      const newUserDoc: UserProfile = {
        id: userId,
        email: newEmail,
        displayName: newName,
        registeredAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        predictionsCount: 0,
        role: newRole
      };

      // Save to local registered accounts
      saveStoredAccount({
        uid: userId,
        email: newEmail,
        password: newPassword,
        displayName: newName,
        role: newRole,
        createdAt: new Date().toISOString()
      });
      localStorage.removeItem('dermal_users_cleared');

      // Save to Firestore user_profiles
      try {
        await setDoc(doc(db, 'user_profiles', userId), newUserDoc);
      } catch (e) {
        console.warn('Firestore user save fallback:', e);
      }

      setUserProfiles(prev => [newUserDoc, ...prev.filter(u => u.email.toLowerCase() !== newEmail.toLowerCase())]);
      setAddUserSuccess(`Added ${newName} (${newRole}) successfully!`);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setTimeout(() => {
        setIsAddUserModalOpen(false);
        setAddUserSuccess('');
      }, 1200);
    } catch (err: any) {
      setAddUserError(err.message || 'Failed to add user account.');
    } finally {
      setIsAddingUser(false);
    }
  };

  // Seed Demo Predictions on demand
  const handleSeedDemoPredictions = async () => {
    setIsPurging(true);
    setPurgeError('');
    setPurgeSuccess('');
    try {
      const mocks = generateMockPredictions();
      const batch = writeBatch(db);
      mocks.slice(0, 20).forEach(m => {
        const ref = doc(db, 'predictions', m.id);
        batch.set(ref, m);
      });
      await batch.commit();
      setPredictionLogs(mocks);
      setPurgeSuccess(`Successfully seeded ${mocks.length} demo prediction records into analytics.`);
    } catch (e: any) {
      console.warn('Seed fallback note:', e);
      const mocks = generateMockPredictions();
      setPredictionLogs(mocks);
      setPurgeSuccess(`Seeded ${mocks.length} demo prediction records in active session.`);
    } finally {
      setIsPurging(false);
    }
  };

  // Fetch Firestore predictions and user profiles
  useEffect(() => {
    let unsubPredictions: () => void;
    let unsubUsers: () => void;

    try {
      const qPreds = query(collection(db, 'predictions'), orderBy('timestamp', 'desc'));
      unsubPredictions = onSnapshot(qPreds, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as PredictionLog[];
        setPredictionLogs(logs);
        setIsLoading(false);
      }, (err) => {
        console.warn('Firestore prediction logs listener error:', err);
        setIsLoading(false);
      });

      const qUsers = query(collection(db, 'user_profiles'), orderBy('registeredAt', 'desc'));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        const firestoreUsers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as UserProfile[];
        const localAccounts = getStoredAccounts();
        const map = new Map<string, UserProfile>();

        firestoreUsers.forEach(u => {
          if (u.email) map.set(u.email.toLowerCase(), u);
        });

        localAccounts.forEach(acc => {
          if (acc.email && !map.has(acc.email.toLowerCase())) {
            map.set(acc.email.toLowerCase(), {
              id: acc.uid,
              email: acc.email,
              displayName: acc.displayName,
              registeredAt: acc.createdAt,
              lastLoginAt: acc.createdAt,
              role: acc.role,
              predictionsCount: 0
            });
          }
        });

        const merged = Array.from(map.values());
        const isExplicitlyCleared = localStorage.getItem('dermal_users_cleared') === 'true';

        if (merged.length > 0) {
          setUserProfiles(merged);
        } else if (!isExplicitlyCleared) {
          setUserProfiles(generateMockUsers());
        } else {
          setUserProfiles([]);
        }
      }, (err) => {
        console.warn('Firestore user profiles listener error, using fallback:', err);
        const localAccounts = getStoredAccounts();
        if (localAccounts.length > 0) {
          setUserProfiles(localAccounts.map(acc => ({
            id: acc.uid,
            email: acc.email,
            displayName: acc.displayName,
            registeredAt: acc.createdAt,
            lastLoginAt: acc.createdAt,
            role: acc.role,
            predictionsCount: 0
          })));
        } else if (localStorage.getItem('dermal_users_cleared') !== 'true') {
          setUserProfiles(generateMockUsers());
        } else {
          setUserProfiles([]);
        }
      });
    } catch (e) {
      console.warn('Firebase error initializing listeners:', e);
      setIsLoading(false);
    }

    return () => {
      if (unsubPredictions) unsubPredictions();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    const now = new Date();
    let cutoff = new Date();

    if (dateRange === '7d') cutoff.setDate(now.getDate() - 7);
    else if (dateRange === '30d') cutoff.setDate(now.getDate() - 30);
    else if (dateRange === '90d') cutoff.setDate(now.getDate() - 90);
    else if (dateRange === 'ytd') cutoff = new Date(now.getFullYear(), 0, 1);
    else if (dateRange === 'all') cutoff = new Date(2020, 0, 1);

    return predictionLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (customStartDate && customEndDate) {
        return logDate >= new Date(customStartDate) && logDate <= new Date(customEndDate + 'T23:59:59');
      }
      return logDate >= cutoff;
    });
  }, [predictionLogs, dateRange, customStartDate, customEndDate]);

  // Aggregation 1: Predictions Per Day
  const predictionsPerDayData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const day = log.timestamp.slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });

    const sortedDays = Object.keys(map).sort();
    return sortedDays.map(day => ({
      date: day.slice(5), // MM-DD
      fullDate: day,
      predictions: map[day]
    }));
  }, [filteredLogs]);

  // Aggregation 2: Predictions Per Week
  const predictionsPerWeekData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp);
      const year = date.getFullYear();
      // calculate week number
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const label = `W${weekNum} (${year})`;
      map[label] = (map[label] || 0) + 1;
    });

    return Object.keys(map).map(week => ({
      week,
      predictions: map[week]
    }));
  }, [filteredLogs]);

  // Aggregation 3: Predictions Per Month
  const predictionsPerMonthData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const month = log.timestamp.slice(0, 7); // YYYY-MM
      map[month] = (map[month] || 0) + 1;
    });

    return Object.keys(map).sort().map(month => {
      const date = new Date(month + '-01');
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return {
        month: label,
        fullMonth: month,
        predictions: map[month]
      };
    });
  }, [filteredLogs]);

  // Aggregation 4: User Registrations Over Time
  const userRegistrationsData = useMemo(() => {
    const map: Record<string, number> = {};
    userProfiles.forEach(u => {
      const date = u.registeredAt.slice(0, 10);
      map[date] = (map[date] || 0) + 1;
    });

    let runningTotal = 0;
    const sortedDates = Object.keys(map).sort();
    return sortedDates.map(date => {
      runningTotal += map[date];
      return {
        date: date.slice(5),
        newRegistrations: map[date],
        totalUsers: runningTotal
      };
    });
  }, [userProfiles]);

  // Aggregation 5: Prediction Class Distribution
  const classDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const condition = log.condition || 'Unspecified Skin Condition';
      map[condition] = (map[condition] || 0) + 1;
    });

    return Object.keys(map).map(condition => ({
      name: condition,
      value: map[condition]
    })).sort((a, b) => b.value - a.value);
  }, [filteredLogs]);

  // Aggregation 6: Model Confidence Distribution
  const confidenceDistributionData = useMemo(() => {
    let vHigh = 0, high = 0, mod = 0, low = 0;

    filteredLogs.forEach(log => {
      const prob = log.probability > 1 ? log.probability / 100 : log.probability;
      if (prob >= 0.90) vHigh++;
      else if (prob >= 0.80) high++;
      else if (prob >= 0.70) mod++;
      else low++;
    });

    return [
      { category: 'Very High (≥90%)', count: vHigh, fill: CONFIDENCE_COLORS.VeryHigh },
      { category: 'High (80-89%)', count: high, fill: CONFIDENCE_COLORS.High },
      { category: 'Moderate (70-79%)', count: mod, fill: CONFIDENCE_COLORS.Moderate },
      { category: 'Low (<70%)', count: low, fill: CONFIDENCE_COLORS.Low }
    ];
  }, [filteredLogs]);

  // Aggregation 7: Usage Trends over Time (Predictions vs Active Users)
  const usageTrendsData = useMemo(() => {
    const map: Record<string, { predictions: number; usersSet: Set<string>; avgConf: number; confSum: number }> = {};

    filteredLogs.forEach(log => {
      const day = log.timestamp.slice(0, 10);
      if (!map[day]) {
        map[day] = { predictions: 0, usersSet: new Set(), avgConf: 0, confSum: 0 };
      }
      map[day].predictions += 1;
      map[day].usersSet.add(log.userId || 'anon');
      const prob = log.probability > 1 ? log.probability : log.probability * 100;
      map[day].confSum += prob;
    });

    return Object.keys(map).sort().map(day => ({
      date: day.slice(5),
      predictions: map[day].predictions,
      activeUsers: map[day].usersSet.size,
      avgConfidence: Math.round(map[day].confSum / map[day].predictions)
    }));
  }, [filteredLogs]);

  // Metric summaries
  const totalPredictionsCount = filteredLogs.length;
  const avgConfidenceOverall = useMemo(() => {
    if (filteredLogs.length === 0) return 0;
    const sum = filteredLogs.reduce((acc, l) => acc + (l.probability > 1 ? l.probability : l.probability * 100), 0);
    return Math.round(sum / filteredLogs.length);
  }, [filteredLogs]);

  // Filtered User list search
  const filteredUsers = useMemo(() => {
    return userProfiles.filter(u => 
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.role && u.role.toLowerCase().includes(userSearchQuery.toLowerCase()))
    );
  }, [userProfiles, userSearchQuery]);

  // Export CSV of Usage Analytics
  const handleExportCSV = () => {
    const headers = "Prediction_ID,User_ID,Condition_Class,Model_Confidence_Pct,Severity_Tier,Timestamp\n";
    const rows = filteredLogs.map(l => 
      `"${l.id}","${l.userId}","${l.condition}","${l.probability > 1 ? l.probability : (l.probability*100).toFixed(1)}","${l.severity}","${l.timestamp}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DermAI_Model_Usage_Analytics_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // RESTRICTED ACCESS GATE FOR NON-ADMIN USERS
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
        {/* Top Navbar Header */}
        <div className="w-full max-w-lg flex items-center justify-between pb-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
            <Shield size={16} className="text-teal-900" />
            <span>DermAI Security Clearance</span>
          </div>
          <button
            type="button"
            onClick={onBackToApp}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            ← Return to Clinical App
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-900 text-white flex items-center justify-center shadow-lg shadow-teal-900/25 mb-4">
              <Shield size={32} />
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-extrabold uppercase tracking-wider mb-2">
              <Lock size={12} />
              <span>Private Admin Surveillance Portal</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Administrative Clearance Required</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-sm font-medium leading-relaxed">
              This portal contains sensitive model telemetry, prediction distributions, and user credentials. It is strictly private and restricted to authorized administrative personnel.
            </p>
          </div>

          {currentSession && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-bold">Current Account:</span> {currentSession.displayName} ({currentSession.role})
                <p className="text-[11px] text-amber-700">Role '{currentSession.role}' does not have admin permissions.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await signOutUser();
                  setCurrentSession(null);
                  window.dispatchEvent(new Event('storage'));
                }}
                className="text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 ml-2 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Inline Admin Authentication Form */}
          <form onSubmit={handleAdminEmailLogin} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                <Mail size={13} />
                <span>Admin Email</span>
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter administrator email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-900/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                  <Key size={13} />
                  <span>Admin Security Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-teal-800 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter security password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-900/20 font-mono"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-teal-900 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-teal-900/20 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isAuthLoading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <Key size={18} />
                  <span>Authenticate & Unlock Admin Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Credentials */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                <Sparkles size={12} className="text-teal-700" />
                <span>Authorized Admin Credentials</span>
              </span>
              <span className="text-[10px] text-teal-800 bg-teal-100 font-bold px-2 py-0.5 rounded-md">1-Tap Fill</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginEmail('admin@dermai.clinical');
                setLoginPassword('admin12345');
              }}
              className="w-full bg-white hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer group"
            >
              <div>
                <p className="font-bold text-slate-800">admin@dermai.clinical</p>
                <p className="text-[11px] text-slate-500 font-mono">Password: admin12345</p>
              </div>
              <span className="text-[11px] font-bold text-teal-800 group-hover:underline">Fill & Sign In →</span>
            </button>
          </div>

          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={onBackToApp}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              Return to Clinical Skin Scanner Workspace
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pb-24 font-sans">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-11 h-11 rounded-2xl bg-teal-900 text-white flex items-center justify-center font-bold shadow-md shadow-teal-900/20">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Admin Management</h1>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  /admin/analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Application Telemetry & Model Usage Analytics Console</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user.displayName || user.email}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Authenticated Admin</p>
                </div>
                <button
                  onClick={() => signOutUser()}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-teal-900 hover:bg-teal-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
                >
                  <Lock size={14} />
                  <span>Admin Sign In</span>
                </button>
                {onSignIn && (
                  <button
                    onClick={onSignIn}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all hidden sm:inline-block"
                  >
                    Google
                  </button>
                )}
              </div>
            )}

            {/* Storage & Clear History Management Button */}
            <button
              onClick={() => {
                setPurgeSuccess('');
                setPurgeError('');
                setIsConfirmingPurge(false);
                setSelectedStorageAction(null);
                setIsStorageModalOpen(true);
              }}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
              title="Storage Optimization & History Clear"
            >
              <HardDrive size={14} className="text-red-600" />
              <span>Storage & History</span>
            </button>

            <button
              onClick={onBackToApp}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>Back to App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* CRITICAL DISCLAIMER BANNER */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="p-2 bg-amber-500 text-white rounded-xl mt-0.5 flex-shrink-0 shadow-sm">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900">
                  Application & Model Usage Analytics Disclaimer
                </h3>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Usage Telemetry Only
                </span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed font-medium">
                The metrics, prediction volumes, and class distribution charts shown below represent <strong>application model interaction counts and user scanner activity</strong>. They <strong>MUST NOT</strong> be interpreted as epidemiological statistics, public health data, or disease prevalence in the general population. Prediction counts solely reflect user scanner request volume and AI model inference executions.
              </p>
            </div>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest">Total Model Inferences</span>
              <Activity size={18} className="text-teal-700" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{totalPredictionsCount}</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={14} /> Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Scanner inferences in selected date range</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest">Avg Model Confidence</span>
              <Cpu size={18} className="text-indigo-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{avgConfidenceOverall}%</span>
              <span className="text-xs font-bold text-teal-600">TF.js Ensemble</span>
            </div>
            <p className="text-[11px] text-slate-500">Mean probability score across predictions</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest">Registered Users</span>
              <Users size={18} className="text-amber-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{userProfiles.length}</span>
              <span className="text-xs font-bold text-indigo-600">Clinic Accounts</span>
            </div>
            <p className="text-[11px] text-slate-500">Authenticated field workers & admins</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest">Database Node</span>
              <Server size={18} className="text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 font-mono">Firestore</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> Live Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Real-time usage collection active</p>
          </div>
        </div>

        {/* Tab Controls & Date Range Selector Header */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'analytics' ? 'bg-teal-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity size={15} />
              <span>Usage Visualizations</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'users' ? 'bg-teal-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={15} />
              <span>User Management ({userProfiles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('raw_logs')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'raw_logs' ? 'bg-teal-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database size={15} />
              <span>Prediction Logs ({filteredLogs.length})</span>
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs font-bold">
              <Calendar size={14} className="text-slate-400 ml-2 mr-1" />
              {(['7d', '30d', '90d', 'ytd', 'all'] as DateRangeOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setDateRange(option);
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all uppercase ${
                    dateRange === option && !customStartDate ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Custom Range Picker inputs */}
            <div className="flex items-center space-x-1 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono outline-none"
                placeholder="Start Date"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono outline-none"
                placeholder="End Date"
              />
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Export usage records to CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* TAB 1: VISUALIZATIONS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            
            {/* Visualizations Grid 1: Predictions Per Day & Predictions Per Week */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Predictions Per Day */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Predictions Per Day
                    </h3>
                    <p className="text-[11px] text-slate-400">Daily scanner model invocation volume</p>
                  </div>
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold px-2 py-1 rounded">
                    Usage Metric
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={predictionsPerDayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPredsDay" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                        formatter={(val) => [`${val} scanner predictions`, 'Inferences']}
                      />
                      <Area type="monotone" dataKey="predictions" stroke="#0f766e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPredsDay)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Predictions Per Week */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Predictions Per Week
                    </h3>
                    <p className="text-[11px] text-slate-400">Weekly aggregated prediction throughput</p>
                  </div>
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold px-2 py-1 rounded">
                    Usage Metric
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={predictionsPerWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        formatter={(val) => [`${val} predictions`, 'Weekly Volume']}
                      />
                      <Bar dataKey="predictions" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Visualizations Grid 2: Predictions Per Month & User Registrations Over Time */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Chart 3: Predictions Per Month */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Predictions Per Month
                    </h3>
                    <p className="text-[11px] text-slate-400">Monthly scanner prediction volume trends</p>
                  </div>
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold px-2 py-1 rounded">
                    Usage Metric
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={predictionsPerMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        formatter={(val) => [`${val} monthly inferences`, 'Volume']}
                      />
                      <Bar dataKey="predictions" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: User Registrations Over Time */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      User Registrations Over Time
                    </h3>
                    <p className="text-[11px] text-slate-400">Cumulative registered healthcare accounts</p>
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-extrabold px-2 py-1 rounded">
                    User Onboarding
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userRegistrationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        formatter={(val, name) => [val, name === 'totalUsers' ? 'Total Users' : 'New Signups']}
                      />
                      <Line type="monotone" dataKey="totalUsers" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Visualizations Grid 3: Class Distribution & Model Confidence Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Chart 5: Prediction Class Distribution */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Prediction Class Distribution
                    </h3>
                    <p className="text-[11px] text-slate-400">Frequency of condition classes returned by the AI model</p>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-1 rounded">
                    Model Outputs
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={classDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {classDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {classDistributionData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center space-x-2 truncate">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px] font-bold">{item.value} ({Math.round((item.value / totalPredictionsCount) * 100 || 0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart 6: Model Confidence Distribution */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Model Confidence Distribution
                    </h3>
                    <p className="text-[11px] text-slate-400">Probability score intervals from TF.js ensemble predictions</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-1 rounded">
                    Accuracy & Confidence
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confidenceDistributionData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={110} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        formatter={(val) => [`${val} prediction logs`, 'Count']}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {confidenceDistributionData.map((entry, index) => (
                          <Cell key={`cell-conf-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Chart 7: Overall Usage Trends Comparison */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    System Usage Trends Comparison
                  </h3>
                  <p className="text-[11px] text-slate-400">Daily prediction volume overlay with active healthcare user sessions</p>
                </div>
                <span className="text-[10px] bg-teal-50 text-teal-800 font-extrabold px-2 py-1 rounded">
                  System Multi-Metric
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageTrendsData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#f59e0b" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line yAxisId="left" type="monotone" name="Predictions (Inferences)" dataKey="predictions" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
                    <Line yAxisId="left" type="monotone" name="Active User Sessions" dataKey="activeUsers" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" />
                    <Line yAxisId="right" type="monotone" name="Avg Confidence %" dataKey="avgConfidence" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search & Actions Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user name, email, or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-900/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{filteredUsers.length}</strong> user records
                </span>

                {userProfiles.length > 0 ? (
                  <button
                    onClick={handleClearAllUsers}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                    title="Permanently wipe all registered user accounts and activity"
                  >
                    <UserX size={14} />
                    <span>Clear All Users</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSeedDemoUsers}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Seed Sample Users</span>
                  </button>
                )}

                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="bg-teal-900 hover:bg-teal-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <UserPlus size={15} />
                  <span>Add Admin / User</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Registered User Accounts & Activity
                  </h3>
                  <p className="text-[11px] text-slate-400">Manage clinician accounts, user history records, and individual storage quota</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">User Tracking Module</span>
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="px-6 py-3">User / Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Registered At</th>
                      <th className="px-6 py-3">Last Active</th>
                      <th className="px-6 py-3 text-center">Predictions Run</th>
                      <th className="px-6 py-3 text-right">Individual Storage Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <Users size={22} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">No registered user accounts found in storage</p>
                            <p className="text-xs text-slate-400">All accounts have been cleared or no matching search results.</p>
                          </div>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                              onClick={handleSeedDemoUsers}
                              className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5"
                            >
                              <Sparkles size={14} />
                              <span>Seed Sample Clinicians</span>
                            </button>
                            <button
                              onClick={() => setIsAddUserModalOpen(true)}
                              className="px-4 py-2 bg-teal-900 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5"
                            >
                              <UserPlus size={14} />
                              <span>Create New User</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-teal-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {(u.displayName || u.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{u.displayName || "Clinic User"}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                              u.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                              u.role === 'Dermatologist' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                            }`}>
                              {u.role || 'Clinic Worker'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {new Date(u.registeredAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Recently'}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-slate-900">
                            {u.predictionsCount ?? 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Individual Clear Activity */}
                              <button
                                type="button"
                                onClick={(e) => handleClearSingleUserHistory(u.id, u.email, e)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200 cursor-pointer"
                                title={`Clear scan & prediction history for ${u.email}`}
                              >
                                <Eraser size={15} />
                              </button>

                              {/* Individual Delete User */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSingleUser(u.id, u.email, u.displayName, e)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                                title={`Permanently delete user ${u.email}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RAW PREDICTION LOGS */}
        {activeTab === 'raw_logs' && (
          <div className="space-y-4">
            {/* Storage Optimization & Quick Actions Bar */}
            <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-teal-800/40">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-white/10 text-teal-300">
                    <DatabaseZap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center space-x-2">
                      <span>Database Storage & Log Maintenance</span>
                      <span className="bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-teal-500/30">
                        Admin Quota Tool
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Total {predictionLogs.length} events logged (~{estimatedFirestoreKB} KB) | Local device cache: {localCasesCount} scans (~{estimatedLocalKB} KB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedStorageAction('older_30d');
                    setIsConfirmingPurge(true);
                    setPurgeSuccess('');
                    setPurgeError('');
                    setIsStorageModalOpen(true);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Clock size={13} />
                  <span>Prune &gt;30 Days</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedStorageAction('all_logs');
                    setIsConfirmingPurge(true);
                    setPurgeSuccess('');
                    setPurgeError('');
                    setIsStorageModalOpen(true);
                  }}
                  className="bg-red-500/80 hover:bg-red-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Clear All Prediction Logs</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedStorageAction(null);
                    setIsConfirmingPurge(false);
                    setPurgeSuccess('');
                    setPurgeError('');
                    setIsStorageModalOpen(true);
                  }}
                  className="bg-teal-500 hover:bg-teal-400 text-teal-950 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <HardDrive size={13} />
                  <span>Full Storage Manager</span>
                </button>
              </div>
            </div>

            {/* Audit Trail Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    System Prediction Audit Trail ({filteredLogs.length} events)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Firestore: /predictions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-500 font-medium">Showing latest {Math.min(filteredLogs.length, 50)} records</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">User ID</th>
                      <th className="px-6 py-3">Predicted Class</th>
                      <th className="px-6 py-3">Model Confidence</th>
                      <th className="px-6 py-3">Severity</th>
                      <th className="px-6 py-3 text-right">Storage Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          <Database size={32} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-slate-600">No prediction records in storage</p>
                          <p className="text-xs text-slate-400 mt-1">Logs have been cleared or no scans have been performed yet.</p>
                          <button
                            type="button"
                            onClick={handleSeedDemoPredictions}
                            className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Sparkles size={12} className="text-amber-500" />
                            <span>Seed Sample Telemetry</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.slice(0, 50).map((log) => {
                        const prob = log.probability > 1 ? log.probability : log.probability * 100;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                            <td className="px-6 py-3 text-slate-500 text-[11px]">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-slate-700 text-[11px]">
                              {log.userId}
                            </td>
                            <td className="px-6 py-3 font-bold text-slate-900 font-sans">
                              {log.condition}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                prob >= 90 ? 'bg-emerald-100 text-emerald-800' :
                                prob >= 80 ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {prob.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-3 font-sans">
                              <span className="text-[10px] font-bold text-slate-600 uppercase">
                                {log.severity}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right font-sans">
                              <button
                                onClick={(e) => handleDeleteSingleLog(log.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                                title="Delete this log record from storage"
                              >
                                <Trash2 size={13} />
                                <span className="text-[10px] font-bold">Delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ADMIN EMAIL & PASSWORD AUTH MODAL */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative space-y-6"
            >
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-900 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-900/20">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Admin Authentication</h3>
                  <p className="text-xs text-slate-500">Sign in with email and password to access telemetry</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleAdminEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                    <Mail size={13} />
                    <span>Admin Email</span>
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter administrator email"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-900/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                      <Lock size={13} />
                      <span>Admin Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-teal-800 font-bold hover:underline flex items-center space-x-1"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter security password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-900/20"
                    required
                  />
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                    <CheckCircle2 size={16} className="flex-shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-teal-900 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-teal-900/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isAuthLoading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Key size={18} />
                      <span>Authenticate Admin Account</span>
                    </>
                  )}
                </button>
              </form>

              {onSignIn && (
                <div className="pt-2 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400 mb-2">Or continue with Google single sign-on</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthModalOpen(false);
                      onSignIn();
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition-colors"
                  >
                    Sign In with Google SSO
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD NEW USER / ADMIN MODAL */}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative space-y-6"
            >
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-900 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-900/20">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Add Healthcare User</h3>
                  <p className="text-xs text-slate-500">Register new admin or field worker credentials</p>
                </div>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Dr. Rajesh Gupta"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-900/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g., rajesh.gupta@health.gov.in"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-900/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Initial Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Set temporary password"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-900/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">System Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-900/20"
                  >
                    <option value="Admin">Admin (Full Access)</option>
                    <option value="Dermatologist">Dermatologist (Clinician)</option>
                    <option value="Clinic Worker">Clinic Worker (Field Scanner)</option>
                  </select>
                </div>

                {addUserError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                    <AlertTriangle size={15} />
                    <span>{addUserError}</span>
                  </div>
                )}

                {addUserSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                    <CheckCircle2 size={15} />
                    <span>{addUserSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="w-full bg-teal-900 hover:bg-teal-800 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md shadow-teal-900/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isAddingUser ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STORAGE & HISTORY MANAGEMENT MODAL */}
      <AnimatePresence>
        {isStorageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 relative space-y-6 my-8"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsStorageModalOpen(false);
                  setIsConfirmingPurge(false);
                  setSelectedStorageAction(null);
                }}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Modal Header */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-lg shadow-red-600/20">
                  <HardDrive size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Storage & History Management</h3>
                  <p className="text-xs text-slate-500">Purge database telemetry logs and client image cache to recover storage</p>
                </div>
              </div>

              {/* Storage Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Logs</span>
                    <Database size={13} className="text-teal-600" />
                  </div>
                  <p className="text-base font-black text-slate-900">{predictionLogs.length}</p>
                  <p className="text-[10px] text-slate-500 font-mono">~{estimatedFirestoreKB} KB</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Users</span>
                    <Users size={13} className="text-indigo-600" />
                  </div>
                  <p className="text-base font-black text-slate-900">{userProfiles.length}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Accounts</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Photos</span>
                    <Layers size={13} className="text-amber-600" />
                  </div>
                  <p className="text-base font-black text-slate-900">{localCasesCount}</p>
                  <p className="text-[10px] text-slate-500 font-mono">~{estimatedLocalKB} KB</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
                    <Server size={13} className="text-purple-600" />
                  </div>
                  <p className="text-base font-black text-slate-900">~{totalEstimatedStorageKB} KB</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Optimizable</p>
                </div>
              </div>

              {/* Success and Error Alerts */}
              {purgeSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center space-x-2.5">
                  <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-600" />
                  <span className="font-medium leading-relaxed">{purgeSuccess}</span>
                </div>
              )}

              {purgeError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2.5">
                  <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
                  <span className="font-medium leading-relaxed">{purgeError}</span>
                </div>
              )}

              {/* Confirmation Step */}
              {isConfirmingPurge && selectedStorageAction ? (
                <div className="bg-red-50/80 border border-red-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-red-500 text-white rounded-xl flex-shrink-0 mt-0.5">
                      <AlertOctagon size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-red-900">Confirm Storage Purge Operation</h4>
                      <p className="text-xs text-red-800 leading-relaxed font-medium">
                        {selectedStorageAction === 'all_logs' && (
                          <span>This will permanently delete all {predictionLogs.length} prediction records from the Firestore database. Model telemetry history will be reset.</span>
                        )}
                        {selectedStorageAction === 'all_users' && (
                          <span>This will permanently delete all {userProfiles.length} registered clinician &amp; user accounts from storage and reset user tracking records.</span>
                        )}
                        {selectedStorageAction === 'older_30d' && (
                          <span>This will delete all telemetry records older than 30 days. Recent 30-day analytics will be preserved.</span>
                        )}
                        {selectedStorageAction === 'older_7d' && (
                          <span>This will delete all telemetry records older than 7 days. Only the last week of predictions will remain.</span>
                        )}
                        {selectedStorageAction === 'device_cache' && (
                          <span>This will delete {localCasesCount} local case evaluations and base64 lesion photos stored in this browser to free device quota.</span>
                        )}
                        {selectedStorageAction === 'deep_wipe' && (
                          <span>This will perform a full reset: permanently clearing all database prediction telemetry AND deleting all registered user accounts AND deleting all local device case archives.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      disabled={isPurging}
                      onClick={() => {
                        setIsConfirmingPurge(false);
                        setSelectedStorageAction(null);
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isPurging}
                      onClick={handleExecutePurge}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                    >
                      {isPurging ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Purging Records...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          <span>Confirm &amp; Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Action List */
                <div className="space-y-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Storage Optimization Options</p>
                  
                  {/* Action 1: Clear All Logs */}
                  <div className="p-4 border border-slate-200 hover:border-red-300 rounded-2xl flex items-center justify-between gap-3 transition-colors bg-white">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Database size={15} className="text-red-500" />
                        <h4 className="text-xs font-bold text-slate-900">Clear All Prediction Logs</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">Purges all {predictionLogs.length} events from Firestore (~{estimatedFirestoreKB} KB)</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStorageAction('all_logs');
                        setIsConfirmingPurge(true);
                      }}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all flex-shrink-0 cursor-pointer"
                    >
                      Clear Logs
                    </button>
                  </div>

                  {/* Action 2: Clear All Users */}
                  <div className="p-4 border border-slate-200 hover:border-red-300 rounded-2xl flex items-center justify-between gap-3 transition-colors bg-white">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Users size={15} className="text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900">Clear Registered User Accounts &amp; Activity</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">Deletes all {userProfiles.length} clinician accounts from database &amp; storage records</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStorageAction('all_users');
                        setIsConfirmingPurge(true);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex-shrink-0 cursor-pointer"
                    >
                      Clear Users
                    </button>
                  </div>

                  {/* Action 3: Prune > 30 Days */}
                  <div className="p-4 border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between gap-3 transition-colors bg-white">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Clock size={15} className="text-amber-500" />
                        <h4 className="text-xs font-bold text-slate-900">Prune Logs Older Than 30 Days</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">Maintains rolling 30-day analytics window while removing older records</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStorageAction('older_30d');
                        setIsConfirmingPurge(true);
                      }}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition-all flex-shrink-0 cursor-pointer"
                    >
                      Prune &gt;30d
                    </button>
                  </div>

                  {/* Action 4: Prune > 7 Days */}
                  <div className="p-4 border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between gap-3 transition-colors bg-white">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Clock size={15} className="text-amber-600" />
                        <h4 className="text-xs font-bold text-slate-900">Prune Logs Older Than 7 Days</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">Keeps only recent 7 days of model inference data</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStorageAction('older_7d');
                        setIsConfirmingPurge(true);
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex-shrink-0 cursor-pointer"
                    >
                      Prune &gt;7d
                    </button>
                  </div>

                  {/* Action 5: Clear Device Image Cache */}
                  <div className="p-4 border border-slate-200 hover:border-teal-300 rounded-2xl flex items-center justify-between gap-3 transition-colors bg-white">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Layers size={15} className="text-teal-600" />
                        <h4 className="text-xs font-bold text-slate-900">Purge Device Local Photos &amp; Cases</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">Deletes {localCasesCount} local case photos in browser cache (~{estimatedLocalKB} KB)</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStorageAction('device_cache');
                        setIsConfirmingPurge(true);
                      }}
                      className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold rounded-xl transition-all flex-shrink-0 cursor-pointer"
                    >
                      Clear Cache
                    </button>
                  </div>

                  {/* Action 6: Deep Storage Reset */}
                  <div className="p-4 border border-red-200 bg-red-50/40 rounded-2xl flex items-center justify-between gap-3 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Trash2 size={15} className="text-red-600" />
                        <h4 className="text-xs font-bold text-red-900">Deep Storage Reset (Full Wipe)</h4>
                      </div>
                      <p className="text-[11px] text-red-700/80">Wipes all database logs + registered user accounts + local scan archives simultaneously</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStorageAction('deep_wipe');
                        setIsConfirmingPurge(true);
                      }}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-xs flex-shrink-0 cursor-pointer"
                    >
                      Full Wipe
                    </button>
                  </div>
                </div>
              )}

              {/* Close footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Admin Quota &amp; Storage Utility</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsStorageModalOpen(false);
                    setIsConfirmingPurge(false);
                    setSelectedStorageAction(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Seed Mock Data Generators for immediate visualization rendering
function generateMockPredictions(): PredictionLog[] {
  const conditions = [
    { name: 'Tinea Corporis (Ringworm)', severity: Severity.MODERATE },
    { name: 'Scabies & Parasitic Lesions', severity: Severity.HIGH },
    { name: 'Atopic Dermatitis (Eczema)', severity: Severity.LOW },
    { name: 'Psoriasis Vulgaris', severity: Severity.MODERATE },
    { name: 'Actinic Keratosis', severity: Severity.HIGH },
    { name: 'Suspected Melanoma Risk', severity: Severity.CRITICAL },
    { name: 'Contact Dermatitis', severity: Severity.LOW }
  ];

  const logs: PredictionLog[] = [];
  const now = new Date();

  // Generate 120 prediction entries over past 90 days
  for (let i = 0; i < 120; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now.getTime() - daysAgo * 86400000 - Math.random() * 43200000);
    const condObj = conditions[Math.floor(Math.random() * conditions.length)];
    const prob = Math.floor(Math.random() * 30) + 70; // 70-99%

    logs.push({
      id: `pred_${Math.random().toString(36).substring(2, 9)}`,
      userId: `user_worker_${Math.floor(Math.random() * 6) + 1}`,
      condition: condObj.name,
      probability: prob,
      severity: condObj.severity,
      timestamp: date.toISOString(),
      skinTone: Math.floor(Math.random() * 4) + 3 // 3 to 6
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateMockUsers(): UserProfile[] {
  const now = new Date();
  return [
    {
      id: 'u1',
      email: 'dr.sharma@primaryhealth.in',
      displayName: 'Dr. Anita Sharma',
      registeredAt: new Date(now.getTime() - 86400000 * 85).toISOString(),
      lastLoginAt: new Date(now.getTime() - 3600000 * 2).toISOString(),
      predictionsCount: 42,
      role: 'Dermatologist'
    },
    {
      id: 'u2',
      email: 'asha.worker.mumbai@health.gov.in',
      displayName: 'Sunita Patil (ASHA)',
      registeredAt: new Date(now.getTime() - 86400000 * 60).toISOString(),
      lastLoginAt: new Date(now.getTime() - 3600000 * 5).toISOString(),
      predictionsCount: 38,
      role: 'Clinic Worker'
    },
    {
      id: 'u3',
      email: 'clinic.karnataka.rural@health.gov.in',
      displayName: 'Dr. Ramesh Kumar',
      registeredAt: new Date(now.getTime() - 86400000 * 40).toISOString(),
      lastLoginAt: new Date(now.getTime() - 3600000 * 12).toISOString(),
      predictionsCount: 29,
      role: 'Clinic Worker'
    },
    {
      id: 'u4',
      email: 'admin.surveillance@dermAI.org',
      displayName: 'Chief Surveillance Admin',
      registeredAt: new Date(now.getTime() - 86400000 * 90).toISOString(),
      lastLoginAt: new Date().toISOString(),
      predictionsCount: 15,
      role: 'Admin'
    }
  ];
}
