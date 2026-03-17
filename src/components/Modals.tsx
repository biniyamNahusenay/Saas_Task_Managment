import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckSquare, Layout, Users, Plus, AlertTriangle, Calendar, MessageSquare, Send, Trash2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, query, where, getDocs, arrayUnion, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, TaskPriority, TaskStatus, UserProfile } from '../types';
import { useToast } from '../context/ToastContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const CreateTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
}> = ({ isOpen, onClose, workspaceId, userId }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      };
      fetchUsers();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !workspaceId) return;

    setLoading(true);
    try {
      const taskRef = await addDoc(collection(db, 'tasks'), {
        title,
        description,
        priority,
        deadline: deadline || null,
        status: 'todo',
        workspaceId,
        creatorId: userId,
        assignedTo: assignedTo || null,
        createdAt: new Date().toISOString(),
      });

      // Notify assignee
      if (assignedTo && assignedTo !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: assignedTo,
          title: 'New Task Assigned',
          message: `You have been assigned to: ${title}`,
          type: 'task_assigned',
          taskId: taskRef.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      showToast('Task created successfully!');
      setTitle('');
      setDescription('');
      setDeadline('');
      onClose();
    } catch (error) {
      console.error("Failed to create task", error);
      showToast('Failed to create task', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">Task Title</label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Design landing page"
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add some details..."
            rows={3}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Assigned To</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-200"
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </Modal>
  );
};

export const EditTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  userId: string;
  userName: string;
}> = ({ isOpen, onClose, task, userId, userName }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo || '');
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      };
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setAssignedTo(task.assignedTo || '');
      setDeadline(task.deadline || '');

      // Subscribe to comments
      const q = query(
        collection(db, 'comments'),
        where('taskId', '==', task.id)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const c = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory to avoid needing a composite index
        c.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setComments(c);
      });
      return () => unsubscribe();
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !task) return;

    setLoading(true);
    try {
      const oldStatus = task.status;
      const oldAssignee = task.assignedTo;

      await updateDoc(doc(db, 'tasks', task.id), {
        title,
        description,
        priority,
        status,
        assignedTo: assignedTo || null,
        deadline: deadline || null,
        updatedAt: new Date().toISOString(),
      });

      // Notify status change
      if (status !== oldStatus && task.creatorId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: task.creatorId,
          title: 'Task Status Updated',
          message: `Task "${title}" is now ${status.replace('-', ' ')}`,
          type: 'status_changed',
          taskId: task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Notify new assignee
      if (assignedTo && assignedTo !== oldAssignee && assignedTo !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: assignedTo,
          title: 'New Task Assigned',
          message: `You have been assigned to: ${title}`,
          type: 'task_assigned',
          taskId: task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      showToast('Task updated successfully!');
      onClose();
    } catch (error) {
      console.error("Failed to update task", error);
      showToast('Failed to update task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    setCommentLoading(true);
    try {
      await addDoc(collection(db, 'comments'), {
        text: newComment.trim(),
        taskId: task.id,
        authorId: userId,
        authorName: userName,
        createdAt: new Date().toISOString(),
      });
      
      // Increment comment count on task
      await updateDoc(doc(db, 'tasks', task.id), {
        commentsCount: (task.commentsCount || 0) + 1
      });

      // Notify task creator
      if (task.creatorId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: task.creatorId,
          title: 'New Comment',
          message: `${userName} commented on "${task.title}"`,
          type: 'comment_added',
          taskId: task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Notify assignee if different from creator and user
      if (task.assignedTo && task.assignedTo !== task.creatorId && task.assignedTo !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: task.assignedTo,
          title: 'New Comment',
          message: `${userName} commented on "${task.title}"`,
          type: 'comment_added',
          taskId: task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      setNewComment('');
    } catch (error) {
      console.error("Failed to add comment", error);
      showToast('Failed to add comment', 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      
      // Decrement comment count on task
      if (task) {
        await updateDoc(doc(db, 'tasks', task.id), {
          commentsCount: Math.max(0, (task.commentsCount || 0) - 1)
        });
      }
    } catch (error) {
      console.error("Failed to delete comment", error);
      showToast('Failed to delete comment', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Details Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Task Title</label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Assigned To</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-200"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Comments Section */}
        <div className="flex flex-col h-[400px] lg:h-auto border-t lg:border-t-0 lg:border-l border-zinc-100 pt-6 lg:pt-0 lg:pl-8">
          <h4 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            Comments
          </h4>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-200">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-zinc-900">{comment.authorName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {(comment.authorId === userId) && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-xl text-sm text-zinc-700 border border-zinc-100">
                    {comment.text}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">No comments yet. Start the conversation!</p>
              </div>
            )}
          </div>

          <form onSubmit={handleAddComment} className="relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={commentLoading || !newComment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export const ConfirmDeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h4 className="font-bold text-red-900">Confirm Deletion</h4>
            <p className="text-sm text-red-700">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const CreateWorkspaceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}> = ({ isOpen, onClose, userId }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'workspaces'), {
        name,
        ownerId: userId,
        members: [userId],
        createdAt: new Date().toISOString(),
      });
      showToast('Workspace created successfully!');
      setName('');
      onClose();
    } catch (error) {
      console.error("Failed to create workspace", error);
      showToast('Failed to create workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">Workspace Name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Marketing Team"
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            required
          />
        </div>
        <p className="text-xs text-zinc-500">You'll be able to invite team members to this workspace later.</p>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-200"
        >
          {loading ? 'Creating...' : 'Create Workspace'}
        </button>
      </form>
    </Modal>
  );
};

export const InviteMemberModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}> = ({ isOpen, onClose, workspaceId }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !workspaceId) return;

    setLoading(true);
    try {
      // 1. Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showToast('User not found. They must sign up first.', 'error');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const targetUserId = userDoc.id;

      // 2. Add user to workspace members
      const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        members: arrayUnion(targetUserId)
      });

      showToast(`Successfully added ${email} to workspace!`);
      setEmail('');
      onClose();
    } catch (error) {
      console.error("Failed to invite member", error);
      showToast('Failed to invite member', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">User Email</label>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            required
          />
        </div>
        <p className="text-xs text-zinc-500">
          The user must have already signed up for TaskFlow with this email address.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-200"
        >
          {loading ? 'Inviting...' : 'Add to Workspace'}
        </button>
      </form>
    </Modal>
  );
};
