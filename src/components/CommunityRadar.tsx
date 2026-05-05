import React, { useEffect, useState } from 'react';
import { Radar, AlertCircle, TrendingUp, Users, MapPin, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommunityAlert, Severity } from '../types';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

export const CommunityRadar: React.FC = () => {
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const alertsPath = 'alerts';
    const q = query(
      collection(db, alertsPath),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as CommunityAlert[];
      setAlerts(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, alertsPath);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clusters = alerts.reduce((acc: any, curr) => {
    acc[curr.condition] = (acc[curr.condition] || 0) + 1;
    return acc;
  }, {});

  const topConditions = Object.entries(clusters)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-[3rem] p-8 lg:p-12 border border-clinical-border shadow-sm medical-grid">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-clinical-primary mb-2">
            <Radar size={24} className="animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.3em]">Active Surveillance</span>
          </div>
          <h2 className="text-5xl font-black tracking-tight text-clinical-text leading-tight">National Skin <br />Health Radar</h2>
          <p className="text-clinical-text/40 text-sm max-w-lg leading-relaxed">Real-time anonymized cluster detection in your local district. Data synced via edge gateway protocols.</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-clinical-bg border border-clinical-border p-6 rounded-[2rem] flex items-center space-x-6">
            <div className="text-center">
              <span className="block text-[10px] text-clinical-text/30 font-black uppercase tracking-widest mb-1">Reports</span>
              <span className="text-3xl font-black text-clinical-text">{alerts.length}</span>
            </div>
            <div className="w-px h-10 bg-clinical-border" />
            <div className="text-center">
              <span className="block text-[10px] text-clinical-text/30 font-black uppercase tracking-widest mb-1">Clusters</span>
              <span className="text-3xl font-black text-orange-600">{topConditions.filter(([_, v]: any) => v >= 3).length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Trend Analysis */}
        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[.2em] text-clinical-text/30 flex items-center space-x-2">
            <TrendingUp size={16} />
            <span>Local Trends (Last 7 Days)</span>
          </h3>
          
          <div className="space-y-4">
            {topConditions.length > 0 ? topConditions.map(([condition, count]: any) => (
              <div key={condition} className="bg-white p-6 rounded-[2rem] border border-clinical-border hover:border-clinical-primary hover:shadow-xl hover:shadow-clinical-primary/5 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black",
                      count >= 3 ? "bg-orange-50 text-orange-600" : "bg-clinical-primary/5 text-clinical-primary"
                    )}>
                      {count}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-clinical-text group-hover:text-clinical-primary transition-colors">{condition}</h4>
                      <p className="text-xs text-clinical-text/40 font-medium">Regional cluster detected in Maharashtra-Rural</p>
                    </div>
                  </div>
                  {count >= 3 && (
                    <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-wider">High Frequency</span>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="py-20 text-center text-clinical-text/20 italic font-medium">
                No clusters detected in this region currently.
              </div>
            )}
          </div>
        </div>

        {/* Recent Feed */}
        <div className="space-y-8">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[.2em] text-clinical-text/30 flex items-center space-x-2">
             <MapPin size={16} />
             <span>Active Scan Feed</span>
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4 scroll-hide">
            <AnimatePresence initial={false}>
              {alerts.slice(0, 10).map((alert) => (
                <motion.div 
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-clinical-bg border border-clinical-border p-5 rounded-2xl space-y-2 group hover:border-clinical-primary/20 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-clinical-text text-sm">{alert.condition}</span>
                    <span className="text-[10px] text-clinical-text/30 font-bold uppercase">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-clinical-text/40">
                    <MapPin size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">ID: {alert.id.slice(0, 8)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <button className="w-full py-5 text-sm font-bold text-clinical-primary border border-clinical-primary/20 rounded-[2rem] hover:bg-clinical-primary hover:text-white transition-all active:scale-95">
            Download Surveillance PDF
          </button>
        </div>
      </div>
    </div>
  );
};
