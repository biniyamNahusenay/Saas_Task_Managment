import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task, TaskStatus, TaskPriority } from '../types';
import { 
  MoreVertical, 
  Plus, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  User as UserIcon,
  Trash2,
  Search,
  Filter,
  Edit2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EditTaskModal, ConfirmDeleteModal } from './Modals';
import { useToast } from '../context/ToastContext';

interface TaskBoardProps {
  workspaceId: string;
  userId: string;
  userName: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'zinc' },
  { id: 'in-progress', label: 'In Progress', color: 'blue' },
  { id: 'review', label: 'Review', color: 'purple' },
  { id: 'done', label: 'Done', color: 'emerald' },
];

const PRIORITY_COLORS = {
  low: 'bg-zinc-100 text-zinc-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ workspaceId, userId, userName }) => {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const q = query(collection(db, 'tasks'), where('workspaceId', '==', workspaceId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(t);
      setLoading(false);
    }, (err) => {
      console.error("Task listener error:", err);
      const errInfo = {
        error: err.message,
        operationType: 'get',
        path: 'tasks',
        authInfo: {
          userId: userId,
        }
      };
      console.error('Firestore Error Info:', JSON.stringify(errInfo));
    });

    return () => unsubscribe();
  }, [workspaceId]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      showToast(`Moved to ${newStatus.replace('-', ' ')}`);
    } catch (error) {
      console.error("Failed to update task status", error);
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      showToast('Task deleted successfully');
      setActiveMenu(null);
    } catch (error) {
      console.error("Failed to delete task", error);
      showToast('Failed to delete task', 'error');
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsEditModalOpen(true);
    setActiveMenu(null);
  };

  const confirmDelete = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
    setActiveMenu(null);
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Board Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const count = tasks.filter(t => t.status === col.id).length;
          const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
          return (
            <div key={col.id} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{col.label}</span>
                <span className="text-lg font-bold text-zinc-900">{count}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  className={`h-full ${
                    col.id === 'todo' ? 'bg-zinc-400' :
                    col.id === 'in-progress' ? 'bg-blue-500' :
                    col.id === 'review' ? 'bg-purple-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col gap-4 min-w-[280px]">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900">{column.label}</h3>
                <span className="text-xs font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">
                  {filteredTasks.filter(t => t.status === column.id).length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-h-[500px] bg-zinc-100/50 p-2 rounded-xl border border-dashed border-zinc-200">
              <AnimatePresence mode="popLayout">
                {filteredTasks
                  .filter(t => t.status === column.id)
                  .map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => handleEditTask(task)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 group relative cursor-pointer hover:border-emerald-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(activeMenu === task.id ? null : task.id);
                            }}
                            className="p-1 text-zinc-400 hover:bg-zinc-50 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenu === task.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 z-10 py-1 overflow-hidden"
                              >
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTask(task);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit Task
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(task);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Task
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <h4 className="font-semibold text-zinc-900 mb-1 leading-tight">{task.title}</h4>
                      <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{task.description}</p>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-zinc-400">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium">{task.commentsCount || 0}</span>
                          </div>
                          {task.deadline && (
                            <div className="flex items-center gap-1 text-zinc-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-medium">
                                {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center border border-white shadow-sm">
                          <UserIcon className="w-3 h-3 text-zinc-400" />
                        </div>
                      </div>

                      <div className="mt-3 flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                        {COLUMNS.filter(c => c.id !== task.status).map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleStatusChange(task.id, c.id)}
                            className="text-[9px] font-bold px-2 py-1 bg-zinc-50 text-zinc-400 hover:bg-zinc-100 rounded transition-colors whitespace-nowrap"
                          >
                            Move to {c.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <EditTaskModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        task={taskToEdit} 
        userId={userId}
        userName={userName}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => taskToDelete && handleDeleteTask(taskToDelete.id)}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
      />
    </div>
  );
};
