import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Users, Image as ImageIcon, Activity, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const patientCount = useLiveQuery(() => db.patients.count(), []) || 0;
  const imageCount = useLiveQuery(() => db.images.count(), []) || 0;
  const annotationCount = useLiveQuery(() => db.annotations.count(), []) || 0;
  
  const reviewedCount = useLiveQuery(
    () => db.images.where('status').anyOf('Reviewed', 'Approved').count(), 
    []
  ) || 0;

  const stats = [
    { name: 'Total Patients', value: patientCount, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Mammograms', value: imageCount, icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Annotations', value: annotationCount, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { name: 'Reviewed', value: reviewedCount, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  const recentImages = useLiveQuery(
    () => db.images.orderBy('uploadTimestamp').reverse().limit(5).toArray(),
    []
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400">System overview and annotation progress.</p>
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
    </div>
  );
};

export default Dashboard;
