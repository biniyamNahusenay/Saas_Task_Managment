import React, { useState } from 'react';
import { User, Mail, Shield, Bell, Lock, Globe, Palette, Save } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { motion } from 'motion/react';

interface SettingsProps {
  user: FirebaseUser;
  profile: UserProfile | null;
  className?: string;
}

export const Settings: React.FC<SettingsProps> = ({ user, profile, className }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'appearance'>('profile');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        updatedAt: new Date().toISOString(),
      });
      showToast('Profile updated successfully!');
    } catch (error) {
      console.error("Failed to update profile", error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Section */}
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" />
                Public Profile
              </h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center gap-6 mb-8">
                  {profile?.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      className="w-20 h-20 rounded-2xl border-4 border-zinc-50 shadow-sm" 
                      alt="Profile" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 border border-zinc-200">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                  <div>
                    <button type="button" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Change photo</button>
                    <p className="text-xs text-zinc-400 mt-1">JPG, GIF or PNG. Max size of 800K</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-zinc-700">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-zinc-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="email" 
                        value={user.email || ''} 
                        disabled 
                        className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-200"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* Account Details Section */}
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Account Details
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Account ID</span>
                  <span className="text-sm font-mono text-zinc-900">{profile?.uid}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Role</span>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${profile?.role === 'admin' ? 'text-purple-500' : 'text-zinc-400'}`} />
                    <span className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{profile?.role}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Member Since</span>
                  <span className="text-sm text-zinc-900">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        );
      case 'notifications':
        return (
          <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Notification Settings</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">Configure how and when you want to be notified about task updates and team activity.</p>
            <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-sm text-zinc-400 italic">
              Notification preferences are coming soon in a future update.
            </div>
          </section>
        );
      case 'security':
        return (
          <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Security & Privacy</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">Manage your password, two-factor authentication, and active sessions.</p>
            <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-sm text-zinc-400 italic">
              Security management tools are coming soon.
            </div>
          </section>
        );
      case 'appearance':
        return (
          <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Appearance</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">Customize your TaskFlow experience with dark mode and custom themes.</p>
            <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-sm text-zinc-400 italic">
              Theming and Dark Mode support are on our roadmap!
            </div>
          </section>
        );
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-8 ${className || ''}`}>
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Settings</h2>
        <p className="text-zinc-500">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Navigation for Settings */}
        <div className="space-y-1">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-2 rounded-xl font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'profile' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left px-4 py-2 rounded-xl font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'notifications' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-2 rounded-xl font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'security' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            Security
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`w-full text-left px-4 py-2 rounded-xl font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'appearance' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Palette className="w-4 h-4" />
            Appearance
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
