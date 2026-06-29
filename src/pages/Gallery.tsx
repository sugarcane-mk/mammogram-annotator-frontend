import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { MammogramImage } from '../db/database';
import { Upload, Search, Filter, ArrowRight, X, Edit2, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/store';
import { canManageDataset, createAuditLog } from '../rbac/auth';

// ─── Filename decode ───────────────────────────────────────────────────────────
// Convention: <PatientID>_<Code>.png
// Code: 00=CC-Left, 01=CC-Right, 10=MLO-Left, 11=MLO-Right
function decodeFilename(filename: string): { patientId: string; viewCode: 0 | 1; sideCode: 0 | 1 } | null {
  const match = filename.match(/^(.+?)_(\d{2})(?:\.\w+)?$/i);
  if (!match) return null;
  const code = match[2];
  const viewCode: 0 | 1 = code[0] === '0' ? 0 : 1;
  const sideCode: 0 | 1 = code[1] === '0' ? 0 : 1;
  return { patientId: match[1].toUpperCase(), viewCode, sideCode };
}

// ─── Status badge colours ──────────────────────────────────────────────────────
const statusColors: Record<MammogramImage['status'], string> = {
  'Not Reviewed': 'bg-slate-700 text-slate-300',
  'In Progress': 'bg-amber-900/60 text-amber-300',
  'Annotated': 'bg-blue-900/60 text-blue-300',
  'Reviewed': 'bg-purple-900/60 text-purple-300',
  'Approved': 'bg-green-900/60 text-green-300',
};

// ─── Upload Summary ────────────────────────────────────────────────────────────
interface UploadResult {
  filename: string;
  patientId: string;
  view: string;
  side: string;
  success: boolean;
  error?: string;
}

interface UploadSummaryProps {
  results: UploadResult[];
  onClose: () => void;
}

const UploadSummary: React.FC<UploadSummaryProps> = ({ results, onClose }) => {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Upload Complete</h2>
            <p className="text-xs text-slate-500 mt-0.5">{successful.length} succeeded · {failed.length} failed</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto flex-1 p-4 space-y-2">
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${r.success ? 'bg-green-950/30 border border-green-900/40' : 'bg-red-950/30 border border-red-900/40'}`}>
              {r.success
                ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              }
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{r.filename}</div>
                {r.success
                  ? <div className="text-xs text-slate-400 mt-0.5">{r.patientId} · {r.view}-{r.side}</div>
                  : <div className="text-xs text-red-400 mt-0.5">{r.error}</div>
                }
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button onClick={onClose} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Image Modal ──────────────────────────────────────────────────────────
interface EditImageModalProps {
  image: MammogramImage;
  onClose: () => void;
}

const EditImageModal: React.FC<EditImageModalProps> = ({ image, onClose }) => {
  const [viewCode, setViewCode] = useState<0 | 1>(image.viewCode);
  const [sideCode, setSideCode] = useState<0 | 1>(image.sideCode);
  const [status, setStatus] = useState<MammogramImage['status']>(image.status);
  const [remarks, setRemarks] = useState(image.remarks || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await db.images.update(image.id, { viewCode, sideCode, status, remarks });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Edit Image Details</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">{image.originalFilename}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">View</label>
              <select
                value={viewCode}
                onChange={e => setViewCode(Number(e.target.value) as 0|1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              >
                <option value={0}>CC (Cranio-Caudal)</option>
                <option value={1}>MLO (Medio-Lateral Oblique)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Side</label>
              <select
                value={sideCode}
                onChange={e => setSideCode(Number(e.target.value) as 0|1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              >
                <option value={0}>Left</option>
                <option value={1}>Right</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MammogramImage['status'])}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
            >
              <option value="Not Reviewed">Not Reviewed</option>
              <option value="In Progress">In Progress</option>
              <option value="Annotated">Annotated</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all min-h-[72px] resize-none"
              placeholder="Clinical notes for this image..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
              {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Gallery Page ─────────────────────────────────────────────────────────
const Gallery: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [uploadResults, setUploadResults] = useState<UploadResult[] | null>(null);
  const [editingImage, setEditingImage] = useState<MammogramImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const authRole = useAppStore((state) => state.authRole);
  const organizationId = useAppStore((state) => state.organizationId);
  const authUser = useAppStore((state) => state.authUser);

  const images = useLiveQuery(async () => {
    const result = authRole === 'admin'
      ? await db.images.toArray()
      : authRole === 'general'
        ? await db.images.where('visibility').equals('sample').toArray()
        : await db.images.where('organizationId').equals(organizationId ?? '').toArray();
    return result.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);
  }, [authRole, organizationId]);
  const patients = useLiveQuery(async () => {
    const result = authRole === 'general'
      ? await db.patients.where('visibility').equals('sample').toArray()
      : authRole === 'admin'
        ? await db.patients.toArray()
        : await db.patients.where('organizationId').equals(organizationId ?? '').toArray();
    return result;
  }, [authRole, organizationId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!canManageDataset(authRole) || authRole === 'general') {
      alert('General users cannot upload protected datasets.');
      return;
    }
    setIsUploading(true);
    const results: UploadResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = file.name;
        const decoded = decodeFilename(filename);

        if (!decoded) {
          results.push({ filename, patientId: 'UNKNOWN', view: '?', side: '?', success: false, error: 'Filename does not match PatientID_XX.png convention' });
          continue;
        }

        const { patientId, viewCode, sideCode } = decoded;
        const viewLabel = viewCode === 0 ? 'CC' : 'MLO';
        const sideLabel = sideCode === 0 ? 'L' : 'R';

        try {
          // Auto-create patient if needed
          const existingPatient = await db.patients.where('patientId').equals(patientId).first();
          if (!existingPatient) {
            await db.patients.add({
              patientId,
              name: undefined,
              studyDate: new Date().toISOString().split('T')[0],
              remarks: 'Auto-created from bulk upload',
              organizationId: organizationId || 'sample-hospital',
              uploadedByUserId: authUser?.id || 'unknown',
              visibility: 'protected',
            });
          }

          const newImageId = `${patientId}_${viewCode}_${sideCode}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
          await db.images.add({
            id: newImageId,
            patientId,
            originalFilename: filename,
            fileData: file,
            viewCode,
            sideCode,
            remarks: '',
            status: 'Not Reviewed',
            uploadTimestamp: Date.now(),
            organizationId: organizationId || 'sample-hospital',
            uploadedByUserId: authUser?.id || 'unknown',
            visibility: 'protected',
          });

          await createAuditLog({
            actorUserId: authUser?.id || 'unknown',
            actorRole: authRole || 'general',
            organizationId: organizationId || 'sample-hospital',
            timestamp: Date.now(),
            action: 'upload',
            targetType: 'image',
            targetId: newImageId,
            details: `Uploaded ${filename}`,
          });

          results.push({ filename, patientId, view: viewLabel, side: sideLabel, success: true });
        } catch (err: any) {
          results.push({ filename, patientId, view: viewLabel, side: sideLabel, success: false, error: err.message || 'Unknown error' });
        }
      }
    } finally {
      setIsUploading(false);
      setUploadResults(results);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredImages = (images ?? []).filter(img => {
    const matchesSearch =
      img.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.originalFilename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || img.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusOptions: MammogramImage['status'][] = ['Not Reviewed', 'In Progress', 'Annotated', 'Reviewed', 'Approved'];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Image Gallery</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {images?.length ?? 0} image{images?.length !== 1 ? 's' : ''} across {patients?.length ?? 0} patient{patients?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex space-x-3">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !canManageDataset(authRole) || authRole === 'general'}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/30"
          >
            <Upload className="w-5 h-5" />
            <span>{isUploading ? 'Uploading…' : 'Bulk Upload'}</span>
          </button>
        </div>
      </div>

      {/* Gallery Container */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-lg">
        {/* Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Patient ID or filename..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <span className="text-xs text-slate-500 ml-auto">{filteredImages?.length ?? 0} results</span>
        </div>

        {/* Grid */}
        <div className="flex-1 p-6 overflow-auto">
          {filteredImages.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Upload className="w-12 h-12 opacity-20" />
              <p className="text-sm">No images found.</p>
              <p className="text-xs text-slate-600">
                Bulk upload uses <code className="text-slate-500">PatientID_XX.png</code> convention.<br />
                00=CC-Left · 01=CC-Right · 10=MLO-Left · 11=MLO-Right
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredImages.map(image => {
                const objectUrl = URL.createObjectURL(image.fileData);
                return (
                  <div key={image.id} className="group bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/60 transition-all flex flex-col shadow-md">
                    <div className="aspect-square bg-black relative overflow-hidden">
                      <img
                        src={objectUrl}
                        alt={image.originalFilename}
                        className="object-contain w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                        onLoad={() => URL.revokeObjectURL(objectUrl)}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/annotate/${image.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full transform scale-75 group-hover:scale-100 transition-all shadow-lg"
                          title="Annotate"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingImage(image)}
                          className="bg-slate-700 hover:bg-slate-600 text-white p-2.5 rounded-full transform scale-75 group-hover:scale-100 transition-all shadow-lg"
                          title="Edit metadata"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2.5 text-xs">
                      <div className="font-medium text-slate-200 truncate" title={image.originalFilename}>{image.originalFilename}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-slate-500 font-mono">{image.patientId}</span>
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-medium">
                          {image.viewCode === 0 ? 'CC' : 'MLO'}-{image.sideCode === 0 ? 'L' : 'R'}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[image.status]}`}>
                          {image.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Summary Modal */}
      {uploadResults && (
        <UploadSummary results={uploadResults} onClose={() => setUploadResults(null)} />
      )}

      {/* Edit Image Modal */}
      {editingImage && (
        <EditImageModal image={editingImage} onClose={() => setEditingImage(null)} />
      )}
    </div>
  );
};

export default Gallery;
