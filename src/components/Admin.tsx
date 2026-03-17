import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Briefcase, Activity, ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export const Admin: React.FC = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalWorkspaces, setTotalWorkspaces] = useState(0);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch totals
    const fetchTotals = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const workspacesSnap = await getDocs(collection(db, 'workspaces'));
        setTotalUsers(usersSnap.size);
        setTotalWorkspaces(workspacesSnap.size);
      } catch (error) {
        console.error("Failed to fetch admin totals", error);
      }
    };

    // Subscribe to recent users
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentUsers(users);
      setLoading(false);
    });

    fetchTotals();
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Admin Dashboard</h2>
        <p className="text-zinc-500">System-wide overview and management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-zinc-500">Total Users</p>
          </div>
          <h3 className="text-3xl font-bold text-zinc-900">{totalUsers}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-zinc-500">Total Workspaces</p>
          </div>
          <h3 className="text-3xl font-bold text-zinc-900">{totalWorkspaces}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-zinc-500">System Health</p>
          </div>
          <h3 className="text-3xl font-bold text-emerald-500">Optimal</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">Recent Users</h3>
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="divide-y divide-zinc-100">
            {recentUsers.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                    {user.displayName?.charAt(0) || user.email?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{user.displayName || 'Anonymous'}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">System Controls</h3>
            <Activity className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="p-6 space-y-4">
            <button className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:bg-zinc-100 transition-all group">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900">User Management</p>
                  <p className="text-xs text-zinc-500">View and edit all system users</p>
                </div>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:bg-zinc-100 transition-all group">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900">Workspace Management</p>
                  <p className="text-xs text-zinc-500">Monitor and manage all workspaces</p>
                </div>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-red-50/50 rounded-xl border border-red-100 hover:bg-red-50 transition-all group">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-400 group-hover:text-red-600" />
                <div className="text-left">
                  <p className="text-sm font-bold text-red-900">System Logs</p>
                  <p className="text-xs text-red-500">Clear old activity logs</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
