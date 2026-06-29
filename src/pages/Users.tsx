import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { AppUser, UserRole } from '../db/database';
import { useAppStore } from '../store/store';
import { createAuditLog } from '../rbac/auth';
import { Plus, UserCheck, Trash2 } from 'lucide-react';

const UsersPage: React.FC = () => {
  const authUser = useAppStore((state) => state.authUser);
  const authRole = useAppStore((state) => state.authRole);
  const organizationId = useAppStore((state) => state.organizationId);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('general');
  const [message, setMessage] = useState('');

  const users = useLiveQuery(async () => {
    const allUsers = await db.users.toArray();
    return allUsers.sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || authRole !== 'admin') return;
    if (!fullName || !email || !password) {
      setMessage('Please complete all fields.');
      return;
    }

    const existing = await db.users.where('email').equals(email).first();
    if (existing) {
      setMessage('A user with that email already exists.');
      return;
    }

    const newUser: AppUser = {
      id: crypto.randomUUID(),
      fullName,
      email,
      password,
      role,
      organizationId: organizationId || 'sample-hospital',
      isActive: true,
      createdAt: Date.now(),
    };

    await db.users.add(newUser);
    await createAuditLog({
      actorUserId: authUser.id,
      actorRole: authRole,
      organizationId: organizationId || 'sample-hospital',
      timestamp: Date.now(),
      action: 'approval',
      targetType: 'user',
      targetId: newUser.id,
      details: `Created ${role} user`,
    });
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('general');
    setMessage('User created successfully.');
  };

  const removeUser = async (userId: string) => {
    if (!authUser || authRole !== 'admin') return;
    await db.users.delete(userId);
    setMessage('User removed.');
  };

  if (authRole !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-4 text-center">
          <p className="font-medium text-slate-200">Access denied</p>
          <p className="mt-1 text-sm text-slate-500">Only admins can manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">User Management</h1>
        <p className="text-sm text-slate-400">Create and manage admin, hospital, and general users.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-100">Create New User</h2>
        </div>
        {message ? <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-sm text-slate-300">{message}</div> : null}
        <form onSubmit={createUser} className="grid gap-4 md:grid-cols-2">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100">
            <option value="general">General User</option>
            <option value="hospital">Hospital User</option>
            <option value="admin">Admin</option>
          </select>
          <div className="md:col-span-2">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Create User</button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold text-slate-100">Existing Users</h2>
        </div>
        <div className="space-y-3">
          {(users ?? []).map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div>
                <p className="font-medium text-slate-200">{user.fullName}</p>
                <p className="text-sm text-slate-500">{user.email} • {user.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{user.role}</span>
                <button onClick={() => removeUser(user.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
