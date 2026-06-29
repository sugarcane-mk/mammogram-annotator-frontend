import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/store';
import { db } from '../db/database';
import type { Patient, MammogramImage } from '../db/database';
import { Users, Images, Upload, AlertCircle, Search, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';

interface HospitalStats {
  totalPatients: number;
  totalImages: number;
  pendingReview: number;
  annotated: number;
}

const HospitalDashboard: React.FC = () => {
  const { authUser } = useAppStore();
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [images, setImages] = useState<MammogramImage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'images'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!authUser?.organizationId) return;

      try {
        const orgId = authUser.organizationId;

        const [patientsList, imagesList] = await Promise.all([
          db.patients.where('organizationId').equals(orgId).toArray(),
          db.images.where('organizationId').equals(orgId).toArray(),
        ]);

        const pendingReviewCount = imagesList.filter(img => img.status === 'Not Reviewed' || img.status === 'In Progress').length;
        const annotatedCount = imagesList.filter(img => img.status === 'Annotated' || img.status === 'Reviewed').length;

        setStats({
          totalPatients: patientsList.length,
          totalImages: imagesList.length,
          pendingReview: pendingReviewCount,
          annotated: annotatedCount,
        });

        setPatients(patientsList);
        setImages(imagesList);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error loading dashboard data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [authUser]);

  if (!authUser || authUser.role !== 'hospital') {
    return (
      <Layout>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-300 mb-1">Access Denied</h3>
            <p className="text-red-300 text-sm">You do not have permission to access the Hospital Dashboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredPatients = patients.filter(p =>
    p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const filteredImages = images.filter(img =>
    img.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (img.remarks?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Hospital Dashboard</h1>
          <p className="text-slate-400">Manage patients, images, and annotations for your institution</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Patients</p>
                  <p className="text-3xl font-bold text-white">{stats.totalPatients}</p>
                </div>
                <Users className="text-cyan-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Images</p>
                  <p className="text-3xl font-bold text-white">{stats.totalImages}</p>
                </div>
                <Images className="text-blue-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Pending Review</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.pendingReview}</p>
                </div>
                <Filter className="text-orange-400" size={32} />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Annotated</p>
                  <p className="text-3xl font-bold text-green-400">{stats.annotated}</p>
                </div>
                <Upload className="text-green-400" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-700 flex gap-0">
          {(['overview', 'patients', 'images'] as const).map(tab => (
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
              <h2 className="text-xl font-semibold text-white mb-4">Hospital Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors text-left flex items-center gap-2">
                      <Upload size={18} />
                      Upload Images
                    </button>
                    <button className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors text-left flex items-center gap-2">
                      <Users size={18} />
                      Add Patient
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Institution Info</h3>
                  <div className="space-y-2 text-sm text-slate-400">
                    <p><span className="text-slate-300">Organization:</span> {authUser.organizationId}</p>
                    <p><span className="text-slate-300">Role:</span> Hospital User</p>
                    <p><span className="text-slate-300">User:</span> {authUser.fullName}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Patient Management</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search by patient ID or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {filteredPatients.length === 0 ? (
                <p className="text-slate-400">No patients found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="px-4 py-3 text-left text-cyan-400">Patient ID</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Name</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Age</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Study Date</th>
                        <th className="px-4 py-3 text-left text-cyan-400">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map(patient => (
                        <tr key={patient.id} className="border-b border-slate-700 hover:bg-slate-900/30">
                          <td className="px-4 py-3">{patient.patientId}</td>
                          <td className="px-4 py-3 text-slate-400">{patient.name || 'N/A'}</td>
                          <td className="px-4 py-3">{patient.age || 'N/A'}</td>
                          <td className="px-4 py-3">{new Date(patient.studyDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Image Management</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search by patient ID or remarks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {filteredImages.length === 0 ? (
                <p className="text-slate-400">No images found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredImages.map(image => (
                    <div key={image.id} className="p-4 bg-slate-900/30 border border-slate-600 rounded-lg hover:border-cyan-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-white font-semibold">{image.patientId}</p>
                          <p className="text-slate-400 text-sm">{image.originalFilename}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          image.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                          image.status === 'Annotated' ? 'bg-blue-500/20 text-blue-400' :
                          image.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {image.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mb-3">
                        View: {image.viewCode === 0 ? 'CC' : 'MLO'} | Side: {image.sideCode === 0 ? 'Left' : 'Right'}
                      </p>
                      {image.remarks && <p className="text-slate-400 text-xs mb-3">Remarks: {image.remarks}</p>}
                      <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">View & Annotate</button>
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

export default HospitalDashboard;
