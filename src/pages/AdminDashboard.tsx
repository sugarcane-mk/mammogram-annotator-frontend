import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/store';
import { db } from '../db/database';
import type { AppUser, Hospital, DownloadRequest } from '../db/database';
import { Users, Building2, Images, Download, FileUp, BarChart3, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';

interface DashboardStats {
  totalUsers: number;
  totalHospitals: number;
  totalPatients: number;
  totalImages: number;
  pendingDownloads: number;
  totalAnnotations: number;
}

const AdminDashboard: React.FC = () => {
  const { authUser } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [downloadRequests, setDownloadRequests] = useState<DownloadRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'hospitals' | 'downloads'>('overview');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [usersCount, hospitalsCount, patientsCount, imagesCount, downloadsCount, annotationsCount, usersList, hospitalsList, requests] = await Promise.all([
          db.users.count(),
          db.hospitals.count(),
          db.patients.count(),
          db.images.count(),
          db.downloadRequests.where('status').equals('pending').count(),
          db.annotations.count(),
          db.users.toArray(),
          db.hospitals.toArray(),
          db.downloadRequests.where('status').equals('pending').toArray(),
        ]);

        setStats({
          totalUsers: usersCount,
          totalHospitals: hospitalsCount,
          totalPatients: patientsCount,
          totalImages: imagesCount,
          pendingDownloads: downloadsCount,
          totalAnnotations: annotationsCount,
        });
        
        setUsers(usersList);
        setHospitals(hospitalsList);
        setDownloadRequests(requests);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error loading dashboard data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (!authUser || authUser.role !== 'admin') {
    return (
      <Layout>
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-300 mb-1">Access Denied</h3>
            <p className="text-red-300 text-sm">You do not have permission to access the Admin Dashboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">Manage users, hospitals, and monitor system activity</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <Users className="text-cyan-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Hospitals</p>
                  <p className="text-3xl font-bold text-white">{stats.totalHospitals}</p>
                </div>
                <Building2 className="text-blue-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Patients</p>
                  <p className="text-3xl font-bold text-white">{stats.totalPatients}</p>
                </div>
                <BarChart3 className="text-green-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Images</p>
                  <p className="text-3xl font-bold text-white">{stats.totalImages}</p>
                </div>
                <Images className="text-purple-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Pending Downloads</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.pendingDownloads}</p>
                </div>
                <Download className="text-orange-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Annotations</p>
                  <p className="text-3xl font-bold text-white">{stats.totalAnnotations}</p>
                </div>
                <FileUp className="text-indigo-400" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-700 flex gap-0">
          {(['overview', 'users', 'hospitals', 'downloads'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">System Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors text-left">
                      + Add New Hospital
                    </button>
                    <button className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors text-left">
                      + Create Admin User
                    </button>
                    <button className="w-full px-4 py-2 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors text-left">
                      + Manage Access Requests
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
                  <p className="text-slate-400 text-sm">No recent activities to display</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">User Management</h2>
              {users.length === 0 ? (
                <p className="text-slate-400">No users found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="px-4 py-3 text-left text-cyan-400">Name</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Email</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Role</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-900/30">
                          <td className="px-4 py-3">{user.fullName}</td>
                          <td className="px-4 py-3 text-slate-400">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                              user.role === 'hospital' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'hospitals' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Hospital Management</h2>
              {hospitals.length === 0 ? (
                <p className="text-slate-400">No hospitals found</p>
              ) : (
                <div className="space-y-4">
                  {hospitals.map(hospital => (
                    <div key={hospital.id} className="p-4 bg-slate-900/30 border border-slate-600 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-semibold">{hospital.name}</h3>
                          <p className="text-slate-400 text-sm">Code: {hospital.code}</p>
                          <p className="text-slate-500 text-xs mt-1">Created: {new Date(hospital.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm hover:bg-cyan-500/30">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'downloads' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Download Requests</h2>
              {downloadRequests.length === 0 ? (
                <p className="text-slate-400">No pending download requests</p>
              ) : (
                <div className="space-y-4">
                  {downloadRequests.map(request => (
                    <div key={request.id} className="p-4 bg-slate-900/30 border border-slate-600 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-white font-semibold">{request.requesterEmail}</p>
                          <p className="text-slate-400 text-sm">{request.requestedDatasetSummary}</p>
                        </div>
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                          {request.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mb-3">Requested: {new Date(request.requestedAt).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30">
                          Approve
                        </button>
                        <button className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
