import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store/store';
import { getActiveUser, persistSession } from '../rbac/auth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthUser, addToast } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await getActiveUser(email, password);
      if (user) {
        persistSession(user);
        setAuthUser(user);
        addToast(`Welcome back, ${user.fullName}!`, 'success');
        
        // Redirect based on role
        switch (user.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'hospital':
            navigate('/hospital');
            break;
          default:
            navigate('/dashboard');
        }
      } else {
        setError('Invalid email or password');
        addToast('Invalid email or password', 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during login';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'hospital' | 'general') => {
    setError('');
    setLoading(true);

    try {
      const demoEmails = {
        admin: 'admin@example.com',
        hospital: 'hospital@example.com',
        general: 'general@example.com'
      };

      const user = await getActiveUser(demoEmails[role], 'Password123!');
      if (user) {
        persistSession(user);
        setAuthUser(user);
        addToast(`Welcome, ${user.fullName}!`, 'success');

        switch (role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'hospital':
            navigate('/hospital');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Demo login failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-cyan-400 mb-2">MammoDB</div>
          <p className="text-slate-400">Secure Authentication</p>
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Login to Your Account</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-slate-400 text-sm mt-4">
            Don't have an account?{' '}
            <Link to="/request-access" className="text-cyan-400 hover:text-cyan-300">
              Request Access
            </Link>
          </p>
        </div>

        {/* Demo Login Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <p className="text-sm font-medium text-slate-300 mb-4 text-center">Try Demo Accounts</p>
          <div className="space-y-3">
            <button
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-600/30 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              Admin Demo
            </button>
            <button
              onClick={() => handleDemoLogin('hospital')}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-600/30 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              Hospital User Demo
            </button>
            <button
              onClick={() => handleDemoLogin('general')}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              General User Demo
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            Demo credentials: <span className="text-slate-400">Password123!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
