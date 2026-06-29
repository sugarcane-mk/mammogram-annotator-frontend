import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { DownloadRequest } from '../db/database';
import { Users, Image as ImageIcon, Activity, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/store';
import { createAuditLog, createDownloadRequest } from '../rbac/auth';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const authRole = useAppStore((state) => state.authRole);
  const organizationId = useAppStore((state) => state.organizationId);
  const authUser = useAppStore((state) => state.authUser);
  const [requestSummary, setRequestSummary] = useState('Protected dataset export');

  const patientCount = useLiveQuery(() => {
    const base = db.patients.where('organizationId').equals(organizationId ?? '');
    return authRole === 'admin' ? db.patients.count() : base.count();
  }, [authRole, organizationId]) || 0;
  const imageCount = useLiveQuery(() => {
    const base = db.images.where('organizationId').equals(organizationId ?? '');
    return authRole === 'admin' ? db.images.count() : base.count();
  }, [authRole, organizationId]) || 0;
  const annotationCount = useLiveQuery(() => {
    const base = db.annotations.where('organizationId').equals(organizationId ?? '');
    return authRole === 'admin' ? db.annotations.count() : base.count();
  }, [authRole, organizationId]) || 0;
  
  const reviewedCount = useLiveQuery(() => {
    const base = db.images.where('organizationId').equals(organizationId ?? '');
    return authRole === 'admin'
      ? db.images.where('status').anyOf(['Reviewed', 'Approved']).count()
      : base.and(img => ['Reviewed', 'Approved'].includes(img.status)).count();
  }, [authRole, organizationId]) || 0;

  const stats = [
    { name: 'Total Patients', value: patientCount, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Mammograms', value: imageCount, icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Annotations', value: annotationCount, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { name: 'Reviewed', value: reviewedCount, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  const recentImages = useLiveQuery(async () => {
    const images = authRole === 'admin'
      ? await db.images.toArray()
      : authRole === 'general'
        ? await db.images.where('visibility').equals('sample').toArray()
        : await db.images.where('organizationId').equals(organizationId ?? '').toArray();
    return images.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp).slice(0, 5);
  }, [authRole, organizationId]);

  const requests = useLiveQuery(async () => {
    const data = authRole === 'admin'
      ? await db.downloadRequests.toArray()
      : await db.downloadRequests.where('requesterUserId').equals(authUser?.id || '').toArray();
    return data.sort((a, b) => b.requestedAt - a.requestedAt);
  }, [authRole, authUser?.id]);

  const submitRequest = async () => {
    if (!authUser || authRole !== 'general') return;
    await createDownloadRequest({
      requesterUserId: authUser.id,
      requesterEmail: authUser.email,
      organizationId: authUser.organizationId || 'sample-hospital',
      requestedAt: Date.now(),
      status: 'pending',
      requestedDatasetSummary: requestSummary,
    });
    await createAuditLog({
      actorUserId: authUser.id,
      actorRole: authRole,
      organizationId: authUser.organizationId || 'sample-hospital',
      timestamp: Date.now(),
      action: 'download',
      targetType: 'download-request',
      details: 'Submitted a protected dataset download request',
    });
    setRequestSummary('Protected dataset export');
  };

  const reviewRequest = async (requestId: string, status: DownloadRequest['status']) => {
    if (!authUser) return;
    await db.downloadRequests.update(requestId, {
      status,
      reviewedByUserId: authUser.id,
      reviewedAt: Date.now(),
      reviewerNotes: status === 'approved' ? 'Approved by admin' : 'Rejected by admin',
    });
    await createAuditLog({
      actorUserId: authUser.id,
      actorRole: authRole || 'admin',
      organizationId: organizationId || 'sample-hospital',
      timestamp: Date.now(),
      action: 'approval',
      targetType: 'download-request',
      targetId: requestId,
      details: `Marked request as ${status}`,
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400">{authRole === 'general' ? 'Sample-only view for general users.' : 'System overview and annotation progress.'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex items-center shadow-lg">
            <div className={`p-4 rounded-full ${stat.bg} ${stat.color} mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{stat.name}</p>
              <h3 className="text-2xl font-bold text-slate-100">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-lg overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-100">Recently Uploaded</h2>
          <button onClick={() => navigate('/gallery')} className="text-sm text-blue-500 hover:text-blue-400">View All</button>
        </div>
        <div className="p-4 overflow-auto flex-1">
          {recentImages?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No images uploaded yet.</div>
          ) : (
            <div className="space-y-4">
              {recentImages?.map((img) => (
                <div key={img.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-200">{img.id}</h4>
                      <p className="text-xs text-slate-500">{img.patientId} • {img.viewCode === 0 ? 'CC' : 'MLO'} • {img.sideCode === 0 ? 'L' : 'R'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${img.status === 'Not Reviewed' ? 'bg-slate-800 text-slate-300' : img.status === 'In Progress' ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'}`}>
                      {img.status}
                    </span>
                    <button onClick={() => navigate(`/annotate/${img.id}`)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded transition-colors">
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Download Requests</h2>
            <p className="text-sm text-slate-400">General users can request protected access; admins can approve or reject it.</p>
          </div>
        </div>
        {authRole === 'general' ? (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <label className="block text-sm font-medium text-slate-300">Requested dataset summary</label>
            <textarea value={requestSummary} onChange={(e) => setRequestSummary(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <button onClick={submitRequest} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Submit Request</button>
          </div>
        ) : null}
        <div className="mt-4 space-y-2">
          {(requests ?? []).map((request) => (
            <div key={request.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-200">{request.requestedDatasetSummary}</p>
                  <p className="text-xs text-slate-500">{request.requesterEmail} • {new Date(request.requestedAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${request.status === 'approved' ? 'bg-green-900/50 text-green-300' : request.status === 'rejected' ? 'bg-red-900/50 text-red-300' : 'bg-amber-900/50 text-amber-300'}`}>{request.status}</span>
              </div>
              {authRole === 'admin' && request.status === 'pending' ? (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => reviewRequest(request.id, 'approved')} className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white">Approve</button>
                  <button onClick={() => reviewRequest(request.id, 'rejected')} className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white">Reject</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
