import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/store';
import { db } from '../db/database';
import type { MammogramImage, Patient, DownloadRequest } from '../db/database';
import { Download, AlertCircle, Eye, FileUp } from 'lucide-react';
import Layout from '../components/layout/Layout';

interface SampleDataset {
  patient: Patient;
  image: MammogramImage;
}

const GeneralUserDashboard: React.FC = () => {
  const { authUser, addToast } = useAppStore();
  const [sampleData, setSampleData] = useState<SampleDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadRequests, setDownloadRequests] = useState<DownloadRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'samples' | 'requests'>('samples');

  useEffect(() => {
    const loadData = async () => {
      if (!authUser?.id) return;

      try {
        // Load sample images (up to 5 visible ones)
        const sampleImages = await db.images
          .where('visibility').equals('sample')
          .limit(5)
          .toArray();

        const datasets: SampleDataset[] = [];
        for (const image of sampleImages) {
          const patient = await db.patients
            .where('patientId').equals(image.patientId)
            .first();
          
          if (patient) {
            datasets.push({ patient, image });
          }
        }
        setSampleData(datasets);

        // Load user's download requests
        const requests = await db.downloadRequests
          .where('requesterUserId').equals(authUser.id)
          .toArray();
        setDownloadRequests(requests);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error loading data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authUser]);

  if (!authUser || authUser.role !== 'general') {
    return (
      <Layout>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-300 mb-1">Access Denied</h3>
            <p className="text-red-300 text-sm">You do not have permission to access this dashboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleRequestDownload = async (imageId: string) => {
    try {
      const downloadRequest: DownloadRequest = {
        id: crypto.randomUUID(),
        requesterUserId: authUser.id,
        requesterEmail: authUser.email,
        organizationId: authUser.organizationId || 'general-user',
        requestedAt: Date.now(),
        status: 'pending',
        requestedDatasetSummary: `Sample image: ${imageId}`,
      };

      await db.downloadRequests.add(downloadRequest);
      setDownloadRequests([...downloadRequests, downloadRequest]);
      addToast('Download request submitted successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit download request';
      addToast(message, 'error');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">General User Dashboard</h1>
          <p className="text-slate-400">View sample datasets and manage your download requests</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Welcome, {authUser.fullName}!</h2>
          <p className="text-slate-300 mb-4">
            Access sample datasets from our public repository. To request full access to specific datasets, submit a download request below.
          </p>
          <p className="text-slate-400 text-sm">
            All download requests are reviewed by administrators and you will be notified once approved.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-700 flex gap-0">
          {(['samples', 'requests'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'samples' ? 'Sample Data' : 'My Requests'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg">
          {activeTab === 'samples' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Available Sample Data</h2>

              {loading ? (
                <p className="text-slate-400">Loading sample data...</p>
              ) : sampleData.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto text-slate-500 mb-4" size={48} />
                  <p className="text-slate-400">No sample data available at the moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sampleData.map((dataset, index) => (
                    <div key={index} className="bg-slate-900/30 border border-slate-600 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors">
                      {/* Image Preview Placeholder */}
                      <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-b border-slate-600">
                        <Eye className="text-slate-600" size={48} />
                      </div>

                      {/* Image Info */}
                      <div className="p-4">
                        <div className="mb-3">
                          <p className="text-white font-semibold text-sm">Patient: {dataset.patient.patientId}</p>
                          <p className="text-slate-400 text-xs mt-1">{dataset.image.originalFilename}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                          <div className="bg-slate-800/50 p-2 rounded">
                            <p className="text-slate-500">View</p>
                            <p className="text-cyan-400 font-semibold">{dataset.image.viewCode === 0 ? 'CC' : 'MLO'}</p>
                          </div>
                          <div className="bg-slate-800/50 p-2 rounded">
                            <p className="text-slate-500">Side</p>
                            <p className="text-cyan-400 font-semibold">{dataset.image.sideCode === 0 ? 'L' : 'R'}</p>
                          </div>
                          <div className="bg-slate-800/50 p-2 rounded">
                            <p className="text-slate-500">Age</p>
                            <p className="text-cyan-400 font-semibold">{dataset.image.ageAtUpload || '-'}</p>
                          </div>
                          <div className="bg-slate-800/50 p-2 rounded">
                            <p className="text-slate-500">Status</p>
                            <p className={`font-semibold text-xs ${
                              dataset.image.status === 'Approved' ? 'text-green-400' :
                              dataset.image.status === 'Annotated' ? 'text-blue-400' :
                              'text-yellow-400'
                            }`}>
                              {dataset.image.status}
                            </p>
                          </div>
                        </div>

                        {dataset.image.remarks && (
                          <p className="text-slate-400 text-xs mb-4 bg-slate-800/50 p-2 rounded">
                            <span className="text-slate-500">Remarks:</span> {dataset.image.remarks}
                          </p>
                        )}

                        <button
                          onClick={() => handleRequestDownload(dataset.image.id)}
                          className="w-full px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded text-sm font-medium hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Request Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">My Download Requests</h2>

              {downloadRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileUp className="mx-auto text-slate-500 mb-4" size={48} />
                  <p className="text-slate-400">No download requests yet</p>
                  <p className="text-slate-500 text-sm mt-2">Click "Request Download" on a sample to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {downloadRequests.map(request => (
                    <div key={request.id} className="p-4 bg-slate-900/30 border border-slate-600 rounded-lg hover:border-cyan-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-semibold">{request.requestedDatasetSummary}</p>
                          <p className="text-slate-400 text-sm">{request.requesterEmail}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          request.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className="flex gap-4 text-xs text-slate-400 mb-3">
                        <p>Requested: {new Date(request.requestedAt).toLocaleDateString()}</p>
                        {request.reviewedAt && (
                          <p>Reviewed: {new Date(request.reviewedAt).toLocaleDateString()}</p>
                        )}
                      </div>

                      {request.reviewerNotes && (
                        <p className="text-slate-300 text-sm bg-slate-800/50 p-3 rounded">
                          <span className="text-slate-400">Reviewer Notes:</span> {request.reviewerNotes}
                        </p>
                      )}

                      {request.status === 'approved' && (
                        <button className="mt-3 px-4 py-2 bg-green-500/20 text-green-400 rounded text-sm font-medium hover:bg-green-500/30 transition-colors flex items-center gap-2">
                          <Download size={16} />
                          Download Dataset
                        </button>
                      )}
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

export default GeneralUserDashboard;
