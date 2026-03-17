import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile, Workspace, Notification } from './types';
import { 
  CheckSquare, 
  LayoutDashboard,
  Search,
  Bell,
  ChevronDown,
  Briefcase,
  AlertCircle,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Check,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateDoc, deleteDoc } from 'firebase/firestore';
import { TaskBoard } from './components/TaskBoard';
import { MyTasks } from './components/MyTasks';
import { Teams } from './components/Teams';
import { Settings } from './components/Settings';
import { Admin } from './components/Admin';
import { CreateTaskModal, CreateWorkspaceModal } from './components/Modals';
import { ToastProvider, useToast } from './context/ToastContext';

// Components
const Login = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('The login popup was blocked by your browser. Please enable popups for this site and try again.');
      } else if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError('An unexpected error occurred during login. Please try again.');
        console.error("Login failed", err);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-zinc-200"
      >
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
          <CheckSquare className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">TaskFlow SaaS</h1>
        <p className="text-zinc-500 mb-8 text-lg">Manage tasks, teams, and workspaces in one place.</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-3 text-left"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </motion.div>
        )}

        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full py-4 px-6 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-6 text-xs text-zinc-400">
          If you're having trouble logging in, try opening the app in a new tab.
        </p>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  
  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    console.log("Setting up auth listener...");
    
    // Connection test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test', 'test'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firebase connection test failed: client is offline");
          setConnectionError("The app is having trouble connecting to the database. This often happens if third-party cookies are blocked or if you're behind a strict firewall.");
        }
      }
    };
    testConnection();

    // Loading timeout
    const timer = setTimeout(() => {
      if (loading) {
        setShowTimeoutMessage(true);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.uid);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Sync profile
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const isAdmin = firebaseUser.email === 'bininahu12@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: isAdmin ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(userSnap.data() as UserProfile);
          }
        } catch (err) {
          console.error("Error syncing profile:", err);
        }
      } else {
        setProfile(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Workspace Listener
  useEffect(() => {
    if (!user) return;

    console.log("Setting up workspace listener for user:", user.uid);
    const q = query(collection(db, 'workspaces'), where('members', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ws = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
      console.log("Workspaces updated:", ws.length);
      setWorkspaces(ws);
      if (ws.length > 0 && !activeWorkspace) {
        setActiveWorkspace(ws[0]);
      }
    }, (err) => {
      console.error("Workspace listener error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Notifications Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const n = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(n);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
  };

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, 'notifications', id));
  };

  // View State
  const [currentView, setCurrentView] = useState<'dashboard' | 'my-tasks' | 'teams' | 'settings' | 'admin'>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-6"></div>
        
        {showTimeoutMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md"
          >
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Still loading...</h2>
            <p className="text-zinc-500 mb-6 text-sm">
              This is taking longer than expected. This usually happens if the preview environment is restricted by your browser's security settings.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
              >
                Reload Page
              </button>
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white text-zinc-900 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all"
              >
                Open in New Tab
              </a>
            </div>
          </motion.div>
        )}

        {connectionError && (
          <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 max-w-md flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{connectionError}</p>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-100">
            <CheckSquare className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-zinc-900 tracking-tight">TaskFlow</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="mb-4 relative">
            <button 
              onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-600 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                {activeWorkspace?.name || 'Select Workspace'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isWorkspaceDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-20 overflow-hidden"
                >
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors ${activeWorkspace?.id === ws.id ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-zinc-600'}`}
                    >
                      {ws.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setIsWorkspaceModalOpen(true);
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-emerald-600 font-medium hover:bg-emerald-50 transition-colors border-t border-zinc-100 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Workspace
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentView === 'dashboard' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setCurrentView('my-tasks')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentView === 'my-tasks' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <CheckSquare className="w-5 h-5" />
            My Tasks
          </button>
          <button 
            onClick={() => setCurrentView('teams')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentView === 'teams' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <Users className="w-5 h-5" />
            Teams
          </button>
          <button 
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentView === 'settings' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <SettingsIcon className="w-5 h-5" />
            Settings
          </button>

          {profile?.role === 'admin' && (
            <button 
              onClick={() => setCurrentView('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentView === 'admin' ? 'text-purple-600 bg-purple-50 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}
            >
              <Settings className="w-5 h-5 text-purple-500" />
              Admin Panel
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <div className="flex items-center gap-3 mb-4">
            {profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                className="w-10 h-10 rounded-full border border-zinc-200" 
                alt="Avatar" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                {profile?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{profile?.displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search tasks, teams..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen) markAllAsRead();
                }}
                className="p-2 text-zinc-500 hover:bg-zinc-50 rounded-lg relative transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                      <h3 className="font-bold text-zinc-900">Notifications</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full uppercase tracking-wider">
                        {unreadCount} New
                      </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-zinc-50">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-4 hover:bg-zinc-50 transition-colors relative group ${!n.read ? 'bg-emerald-50/30' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                n.type === 'task_assigned' ? 'bg-blue-100 text-blue-600' :
                                n.type === 'comment_added' ? 'bg-purple-100 text-purple-600' :
                                n.type === 'status_changed' ? 'bg-emerald-100 text-emerald-600' :
                                'bg-zinc-100 text-zinc-600'
                              }`}>
                                {n.type === 'task_assigned' ? <Users className="w-4 h-4" /> :
                                 n.type === 'comment_added' ? <CheckSquare className="w-4 h-4" /> :
                                 n.type === 'status_changed' ? <Check className="w-4 h-4" /> :
                                 <Bell className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 leading-tight">{n.title}</p>
                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(n.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                              >
                                <Plus className="w-3 h-3 rotate-45" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                          <p className="text-sm text-zinc-500">No notifications yet</p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-center">
                        <button 
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-xs font-bold text-zinc-500 hover:text-zinc-900"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => setIsTaskModalOpen(true)}
              disabled={!activeWorkspace}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">
                      {activeWorkspace ? `${activeWorkspace.name} Board` : 'Welcome to TaskFlow'}
                    </h2>
                    <p className="text-zinc-500">
                      {activeWorkspace 
                        ? `Manage your team's progress and collaborate in real-time.` 
                        : 'Create a workspace to start managing your projects.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600">
                      Active Tasks
                    </div>
                  </div>
                </div>

                {activeWorkspace ? (
                  <TaskBoard 
                    workspaceId={activeWorkspace.id} 
                    userId={user.uid} 
                    userName={profile?.displayName || 'Anonymous'} 
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center p-12">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                      <Briefcase className="w-10 h-10 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">No workspace selected</h3>
                    <p className="text-zinc-500 max-w-sm mb-8">Create your first workspace to start organizing your tasks and teams.</p>
                    <button 
                      onClick={() => setIsWorkspaceModalOpen(true)}
                      className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                    >
                      Create Workspace
                    </button>
                  </div>
                )}
              </>
            )}

            {currentView === 'my-tasks' && (
              <MyTasks userId={user.uid} userName={profile?.displayName || 'Anonymous'} />
            )}

            {currentView === 'teams' && (
              <Teams workspace={activeWorkspace} />
            )}

            {currentView === 'settings' && (
              <Settings user={user} profile={profile} />
            )}

            {currentView === 'admin' && (
              <Admin />
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        workspaceId={activeWorkspace?.id || ''} 
        userId={user.uid} 
      />
      <CreateWorkspaceModal 
        isOpen={isWorkspaceModalOpen} 
        onClose={() => setIsWorkspaceModalOpen(false)} 
        userId={user.uid} 
      />
    </div>
  );
}
