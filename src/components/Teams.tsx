import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Workspace, UserProfile } from '../types';
import { Users, UserPlus, Mail, Shield, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { InviteMemberModal } from './Modals';

export const Teams: React.FC<{ workspace: Workspace | null }> = ({ workspace }) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    if (!workspace) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        const memberProfiles: UserProfile[] = [];
        for (const memberId of workspace.members) {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            memberProfiles.push(userDoc.data() as UserProfile);
          }
        }
        setMembers(memberProfiles);
      } catch (error) {
        console.error("Failed to fetch members", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [workspace]);

  if (!workspace) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <Users className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-900">No Workspace Selected</h3>
        <p className="text-zinc-500">Select a workspace to view your team.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Team Members</h2>
          <p className="text-zinc-500">Manage who has access to the {workspace.name} workspace.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <motion.div 
            key={member.uid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4 mb-6">
              {member.photoURL ? (
                <img 
                  src={member.photoURL} 
                  className="w-12 h-12 rounded-full border border-zinc-100" 
                  alt={member.displayName || 'User'} 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold border border-zinc-200">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-zinc-900 truncate">{member.displayName || 'Anonymous User'}</h4>
                <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {member.email}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${member.role === 'admin' ? 'text-purple-500' : 'text-zinc-400'}`} />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{member.role}</span>
              </div>
              {workspace.ownerId === member.uid && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                  Owner
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-md">
          <h3 className="text-xl font-bold mb-2">Need a bigger team?</h3>
          <p className="text-zinc-400 text-sm mb-6">Upgrade to TaskFlow Pro to invite unlimited members and create specialized sub-teams for your projects.</p>
          <button className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20">
            View Pricing
          </button>
        </div>
        <Users className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5 rotate-12" />
      </div>
      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        workspaceId={workspace.id} 
      />
    </div>
  );
};
