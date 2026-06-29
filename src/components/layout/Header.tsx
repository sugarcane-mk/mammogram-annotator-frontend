import React, { useState } from 'react';
import JSZip from 'jszip';
import { Download, LogOut, LogIn, UserCog } from 'lucide-react';
import { db } from '../../db/database';
import { useAppStore } from '../../store/store';
import { clearSession, getActiveUser, persistSession } from '../../rbac/auth';

const Header: React.FC = () => {
  const authUser = useAppStore((state) => state.authUser);
  const authRole = useAppStore((state) => state.authRole);
  const organizationId = useAppStore((state) => state.organizationId);
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const clearAuthUser = useAppStore((state) => state.clearAuthUser);
  const [switching, setSwitching] = useState(false);

  const exportData = async () => {
    try {
      const patients = await db.patients.toArray();
      const images = await db.images.toArray();
      const annotations = await db.annotations.toArray();
      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      const annotationsFolder = zip.folder('annotations');
      const patientLookup = new Map(patients.map(patient => [patient.patientId, patient]));

      const csvRows: string[][] = [];
      const annotationRecords: Array<Record<string, unknown>> = [];

      for (const image of images) {
        const patient = patientLookup.get(image.patientId);
        const imageAnnotations = annotations.filter(annotation => annotation.imageId === image.id);
        const extension = getImageExtension(image.fileData, image.originalFilename);
        const safePatientId = sanitizeForFileName(image.patientId);
        const safeImageId = sanitizeForFileName(image.id);
        const imageFilename = `${safePatientId}_${safeImageId}${extension}`;

        if (imagesFolder) {
          imagesFolder.file(imageFilename, image.fileData, { binary: true });
        }

        const viewLabel = image.viewCode === 0 ? 'CC' : 'MLO';
        const sideLabel = image.sideCode === 0 ? 'Left' : 'Right';
        const labels = imageAnnotations.map(annotation => annotation.label).filter(Boolean).join(' | ');
        const biRads = imageAnnotations.map(annotation => annotation.biRads).filter(Boolean).join(' | ');
        const remarks = [image.remarks, ...imageAnnotations.map(annotation => annotation.remarks)].filter(Boolean).join(' | ');
        const boundingBoxes = imageAnnotations.filter(annotation => annotation.type === 'bbox').map(annotation => JSON.stringify(annotation.coordinates)).join(' | ');
        const freeformPaths = imageAnnotations.filter(annotation => annotation.type === 'freehand').map(annotation => JSON.stringify(annotation.coordinates)).join(' | ');

        csvRows.push([
          image.patientId,
          image.id,
          viewLabel,
          sideLabel,
          labels,
          biRads,
          remarks,
          boundingBoxes,
          freeformPaths,
        ]);

        annotationRecords.push({
          patientId: image.patientId,
          patientName: patient?.name || '',
          imageId: image.id,
          imageFilename,
          view: viewLabel,
          side: sideLabel,
          imageRemarks: image.remarks || '',
          annotations: imageAnnotations.map(annotation => ({
            id: annotation.id,
            type: annotation.type,
            label: annotation.label,
            biRads: annotation.biRads || '',
            remarks: annotation.remarks || '',
            coordinates: annotation.coordinates,
            tumorCenter: annotation.tumorCenter,
            tumorArea: annotation.tumorArea,
            strokeColor: annotation.strokeColor || '',
            strokeWidth: annotation.strokeWidth || 0,
            opacity: annotation.opacity || 0,
            timestamp: annotation.timestamp,
          })),
        });
      }

      if (annotationsFolder) {
        annotationsFolder.file('annotations.json', JSON.stringify(annotationRecords, null, 2));
      }

      const csvHeader = [
        'Patient ID',
        'Image ID',
        'View',
        'Side',
        'Label',
        'BI-RADS Level',
        'Remarks',
        'Bounding Box Coordinates',
        'Freeform Annotation Coordinates',
      ];
      const csvContent = [csvHeader.join(','), ...csvRows.map(row => row.map(escapeCsvValue).join(','))].join('\n');
      zip.file('metadata.csv', csvContent);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mammogram_dataset_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export dataset');
    }
  };

  const getImageExtension = (fileData: Blob, originalFilename?: string) => {
    const candidate = originalFilename?.split('.').pop()?.toLowerCase();
    if (candidate) return `.${candidate}`;
    if (fileData.type.includes('png')) return '.png';
    if (fileData.type.includes('jpeg') || fileData.type.includes('jpg')) return '.jpg';
    if (fileData.type.includes('webp')) return '.webp';
    return '.bin';
  };

  const sanitizeForFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'image';

  const escapeCsvValue = (value: string) => {
    const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
    return /[",]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800 shrink-0">
      <div className="flex items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Workspace</h2>
          <p className="text-xs text-slate-500">{authUser?.fullName ?? 'Demo User'} • {authRole?.toUpperCase() ?? 'UNKNOWN'} • {organizationId ?? 'No tenant'}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button 
          onClick={exportData}
          className="flex items-center space-x-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Dataset</span>
        </button>

        <button
          onClick={async () => {
            setSwitching(true);
            const demo = await getActiveUser('admin@example.com', 'Password123!');
            if (demo) {
              persistSession(demo);
              setAuthUser(demo);
            }
            setSwitching(false);
          }}
          className="flex items-center space-x-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
        >
          <UserCog className="w-4 h-4" />
          <span>{switching ? 'Switching…' : 'Switch User'}</span>
        </button>

        {authUser ? (
          <button
            onClick={() => {
              clearSession();
              clearAuthUser();
            }}
            className="flex items-center space-x-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
