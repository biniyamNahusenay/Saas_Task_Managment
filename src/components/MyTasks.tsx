import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Workspace } from '../types';
import { CheckSquare, Clock, AlertCircle, Briefcase, Edit2, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { EditTaskModal } from './Modals';

export const MyTasks: React.FC<{ userId: string; userName: string }> = ({ userId, userName }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('creatorId', '==', userId));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(t);
      
      // Fetch workspace names for these tasks
      const wsIds = Array.from(new Set(t.map(task => task.workspaceId)));
      const wsMap: Record<string, string> = { ...workspaces };
      
      for (const id of wsIds) {
        if (!wsMap[id]) {
          const wsDoc = await getDoc(doc(db, 'workspaces', id));
          if (wsDoc.exists()) {
            wsMap[id] = (wsDoc.data() as Workspace).name;
          }
        }
      }
      setWorkspaces(wsMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const todoTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">My Tasks</h2>
        <p className="text-zinc-500">A global view of all your assignments across all workspaces.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 mb-1">Total Tasks</p>
          <h3 className="text-3xl font-bold text-zinc-900">{tasks.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 mb-1">Pending</p>
          <h3 className="text-3xl font-bold text-orange-500">{todoTasks.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 mb-1">Completed</p>
          <h3 className="text-3xl font-bold text-emerald-500">{completedTasks.length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Your Assignments</h3>
          <span className="text-xs font-bold px-2 py-1 bg-zinc-100 text-zinc-500 rounded-full">
            {tasks.length} Tasks
          </span>
        </div>
        
        <div className="divide-y divide-zinc-100">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div 
                key={task.id} 
                onClick={() => handleEditTask(task)}
                className="p-6 hover:bg-zinc-50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    task.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-semibold text-zinc-900 ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {workspaces[task.workspaceId] || 'Loading...'}
                      </span>
                      {task.deadline && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {task.commentsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                    task.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {task.priority}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                    task.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                    task.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {task.status.replace('-', ' ')}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTask(task);
                    }}
                    className="p-2 text-zinc-400 hover:bg-white hover:text-zinc-900 rounded-lg transition-all border border-transparent hover:border-zinc-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-zinc-300" />
              </div>
              <h4 className="font-bold text-zinc-900">No tasks found</h4>
              <p className="text-sm text-zinc-500">You don't have any tasks assigned to you yet.</p>
            </div>
          )}
        </div>
      </div>

      <EditTaskModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        task={taskToEdit} 
        userId={userId}
        userName={userName}
      />
    </div>
  );
};
