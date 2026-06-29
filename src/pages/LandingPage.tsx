import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, BarChart3, Users, Zap } from 'lucide-react';
import { useAppStore } from '../store/store';
import { db } from '../db/database';
import type { MammogramImage, Patient } from '../db/database';

interface SampleData {
  patient: Patient;
  image: MammogramImage;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { authUser } = useAppStore();
  const [sampleData, setSampleData] = useState<SampleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSampleData = async () => {
      try {
        // Fetch top 10 sample images
        const images = await db.images
          .where('visibility').equals('sample')
          .limit(10)
          .toArray();

        const data: SampleData[] = [];
        for (const image of images) {
          const patient = await db.patients
            .where('patientId').equals(image.patientId)
            .first();
          
          if (patient) {
            data.push({ patient, image });
          }
        }
        setSampleData(data);
      } catch (error) {
        console.error('Error loading sample data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSampleData();
  }, []);

  if (authUser) {
    return (
      <Navigate
        to={authUser.role === 'admin' ? '/admin' : authUser.role === 'hospital' ? '/hospital' : '/dashboard'}
        replace
      />
    );
  }

  const features = [
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Enterprise-grade security with role-based access control for researchers and hospitals'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive tools for mammogram analysis, annotation, and BI-RADS classification'
    },
    {
      icon: Users,
      title: 'Multi-Institutional',
      description: 'Support for hospitals, research centers, and collaborative research initiatives'
    },
    {
      icon: Zap,
      title: 'Real-time Collaboration',
      description: 'Instant annotation synchronization and download request management'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-slate-700">
        <div className="text-2xl font-bold text-cyan-400">MammoDB</div>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/request-access')}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium flex items-center gap-2"
          >
            Request Access
            <ArrowRight size={18} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 py-20 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Advanced Mammogram Database Platform
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          A comprehensive platform for mammogram annotation, analysis, and collaborative research. 
          Designed for radiologists, researchers, and healthcare institutions worldwide.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-semibold flex items-center gap-2"
          >
            Get Started
            <ArrowRight size={20} />
          </button>
          <button
            onClick={() => navigate('/request-access')}
            className="px-8 py-3 border-2 border-cyan-400 text-cyan-400 rounded-lg hover:bg-cyan-400/10 transition-colors font-semibold"
          >
            Request Access for Your Institution
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500/50 transition-colors">
              <feature.icon className="text-cyan-400 mb-4" size={32} />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample Data Table */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Sample Dataset</h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading sample data...</div>
          ) : sampleData.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No sample data available. Login to access the full database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-400">Patient ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-400">Age at Upload</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-400">Study Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-400">View</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-400">Side</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-400">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-400">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {sampleData.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 text-sm">{item.patient.patientId}</td>
                      <td className="px-6 py-4 text-sm">{item.image.ageAtUpload || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{new Date(item.patient.studyDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">{item.image.viewCode === 0 ? 'CC' : 'MLO'}</td>
                      <td className="px-6 py-4 text-sm">{item.image.sideCode === 0 ? 'Left' : 'Right'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.image.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                          item.image.status === 'Annotated' ? 'bg-blue-500/20 text-blue-400' :
                          item.image.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {item.image.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{item.image.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-slate-400 text-center">
          {sampleData.length > 0 ? `Showing ${sampleData.length} of available samples` : 'Create an account to access the complete database'}
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 px-8 py-8 text-center text-slate-500 text-sm">
        <p>© 2024 Mammogram Database Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
