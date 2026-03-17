export type UserRole = 'admin' | 'user';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  currentWorkspaceId?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  workspaceId: string;
  members: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string;
  workspaceId: string;
  teamId?: string;
  assignedTo?: string;
  creatorId: string;
  commentsCount?: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  taskId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'comment_added' | 'status_changed' | 'workspace_invite';
  taskId?: string;
  workspaceId?: string;
  read: boolean;
  createdAt: string;
}
