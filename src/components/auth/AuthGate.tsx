import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/store';
import { getActiveUser, getCurrentUserDetails, persistSession, seedDefaultData } from '../../rbac/auth';
import { db } from '../../db/database';
import type { AppUser, UserRole } from '../../db/database';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('general');
  const [error, setError] = useState('');
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const authUser = useAppStore((state) => state.authUser);

  useEffect(() => {
    const initialize = async () => {
      await seedDefaultData();
      const existing = await getCurrentUserDetails();
      if (existing) {
        setAuthUser(existing);
      } else {
        const demoUser = await getActiveUser('general@example.com', 'Password123!');
        if (demoUser) {
          persistSession(demoUser);
          setAuthUser(demoUser);
        }
      }
      setReady(true);
    };

    initialize();
  }, [setAuthUser]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p>Initializing access control…</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 p-6 text-slate-200">
        <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <h1 className="mb-2 text-2xl font-semibold">RBAC Demo</h1>
          <p className="mb-4 text-sm text-slate-400">General users can browse the demo right away. Sign in or register for other roles if needed.</p>
          <div className="mb-4 flex rounded-lg border border-slate-800 p-1">
            <button className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`} onClick={() => { setMode('login'); setError(''); }}>Login</button>
            <button className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400'}`} onClick={() => { setMode('register'); setError(''); }}>Register</button>
          </div>
          {error ? <div className="mb-3 rounded-lg border border-red-900/60 bg-red-950/40 p-2 text-sm text-red-300">{error}</div> : null}
          {mode === 'register' ? (
            <div className="space-y-3">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                <option value="general">General User</option>
                <option value="hospital">Hospital User</option>
              </select>
              <button className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white" onClick={async () => {
                if (!email || !password || !fullName) {
                  setError('Please complete all fields.');
                  return;
                }
                const existing = await db.users.where('email').equals(email).first();
                if (existing) {
                  setError('That email already exists.');
                  return;
                }
                const user: AppUser = {
                  id: crypto.randomUUID(),
                  fullName,
                  email,
                  password,
                  role,
                  organizationId: role === 'admin' ? 'sample-hospital' : 'sample-hospital',
                  isActive: true,
                  createdAt: Date.now(),
                };
                await db.users.add(user);
                persistSession(user);
                setAuthUser(user);
              }}>Create account</button>
            </div>
          ) : (
            <div className="space-y-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
              <button className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white" onClick={async () => {
                const demoUser = await getActiveUser(email, password);
                if (!demoUser) {
                  setError('Invalid credentials. Try admin@example.com / Password123!');
                  return;
                }
                persistSession(demoUser);
                setAuthUser(demoUser);
              }}>Sign in</button>
            </div>
          )}
          <div className="mt-4 space-y-2 text-sm text-slate-400">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><strong>Admin:</strong> admin@example.com / Password123!</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><strong>Hospital:</strong> hospital@example.com / Password123!</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><strong>General:</strong> general@example.com / Password123!</div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
