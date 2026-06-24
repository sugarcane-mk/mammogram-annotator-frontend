import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Patient, MammogramImage } from '../db/database';
import { Plus, Search, UserPlus, Upload, X, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';

// ─── View/Side decode from filename ───────────────────────────────────────────
// Naming convention: <PatientID>_<Code>.png
// Code: 00=CCL, 01=CCR, 10=MLOL, 11=MLOR
function decodeFilename(filename: string, fallbackPatientId: string): { patientId: string; viewCode: 0 | 1; sideCode: 0 | 1 } {
  const match = filename.match(/^(.+?)_(\d{2})(?:\.\w+)?$/i);
  if (match) {
    const code = match[2];
    const viewCode: 0 | 1 = code[0] === '0' ? 0 : 1;
    const sideCode: 0 | 1 = code[1] === '0' ? 0 : 1;
    return { patientId: match[1].toUpperCase(), viewCode, sideCode };
  }
  return { patientId: fallbackPatientId, viewCode: 0, sideCode: 0 };
}

// ─── Image row in the upload list ─────────────────────────────────────────────
interface UploadImageRow {
  file: File;
  preview: string;
  patientId: string;
  viewCode: 0 | 1;
  sideCode: 0 | 1;
}

// ─── Edit Patient Modal ────────────────────────────────────────────────────────
interface EditPatientModalProps {
  patient: Patient;
  onClose: () => void;
}

const EditPatientModal: React.FC<EditPatientModalProps> = ({ patient, onClose }) => {
  const [formData, setFormData] = useState({
    name: patient.name || '',
    age: patient.age ?? '',
    studyDate: patient.studyDate,
    remarks: patient.remarks || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await db.patients.update(patient.id!, {
        name: formData.name || undefined,
        age: formData.age !== '' ? Number(formData.age) : undefined,
        studyDate: formData.studyDate,
        remarks: formData.remarks,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Edit Patient — {patient.patientId}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name <span className="text-slate-500 font-normal">(optional)</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Age *</label>
              <input
                type="number"
                required
                min="1"
                max="120"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Study Date *</label>
              <input
                type="date"
                required
                value={formData.studyDate}
                onChange={e => setFormData({ ...formData, studyDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Clinical Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all min-h-[80px] resize-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
              {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Patients Page ────────────────────────────────────────────────────────
const Patients: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [studyDate, setStudyDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [uploadRows, setUploadRows] = useState<UploadImageRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patients = useLiveQuery(
    () => db.patients
      .filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .toArray(),
    [searchTerm]
  );

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newRows: UploadImageRow[] = files.map(file => {
      const decoded = decodeFilename(file.name, patientId || 'UNKNOWN');
      return {
        file,
        preview: URL.createObjectURL(file),
        patientId: decoded.patientId,
        viewCode: decoded.viewCode,
        sideCode: decoded.sideCode,
      };
    });
    setUploadRows(prev => [...prev, ...newRows]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeRow = (index: number) => {
    setUploadRows(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateRow = (index: number, field: 'viewCode' | 'sideCode', value: 0 | 1) => {
    setUploadRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const resetForm = () => {
    setPatientId('');
    setPatientName('');
    setPatientAge('');
    setStudyDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    uploadRows.forEach(r => URL.revokeObjectURL(r.preview));
    setUploadRows([]);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !patientAge) return;
    setIsSubmitting(true);

    try {
      // Create or update patient
      const existing = await db.patients.where('patientId').equals(patientId.toUpperCase()).first();
      if (!existing) {
        await db.patients.add({
          patientId: patientId.toUpperCase(),
          name: patientName || undefined,
          age: Number(patientAge),
          studyDate,
          remarks,
        });
      }

      // Add images
      for (const row of uploadRows) {
        const imageId = `${row.patientId}_${row.viewCode}_${row.sideCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const img: MammogramImage = {
          id: imageId,
          patientId: patientId.toUpperCase(),
          originalFilename: row.file.name,
          fileData: row.file,
          ageAtUpload: Number(patientAge),
          viewCode: row.viewCode,
          sideCode: row.sideCode,
          remarks: '',
          status: 'Not Reviewed',
          uploadTimestamp: Date.now(),
        };
        await db.images.add(img);
      }

      resetForm();
    } catch (error: any) {
      console.error('Failed to add patient', error);
      alert(error?.message?.includes('already exist') ? 'Patient ID already exists.' : 'Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Patients</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage patient records and mammogram uploads.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/30 font-medium"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Patient</span>
        </button>
      </div>

      {/* Search & Table */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 font-medium">Patient ID</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Age</th>
                <th className="px-6 py-3 font-medium">Study Date</th>
                <th className="px-6 py-3 font-medium">Images</th>
                <th className="px-6 py-3 font-medium">Remarks</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
              {patients?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No patients found. Add one to get started.
                  </td>
                </tr>
              ) : (
                patients?.map(patient => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    expanded={expandedPatient === patient.patientId}
                    onToggleExpand={() => setExpandedPatient(prev => prev === patient.patientId ? null : patient.patientId)}
                    onEdit={() => setEditingPatient(patient)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Add New Patient</h2>
                <p className="text-xs text-slate-500 mt-0.5">Fill in the required fields and optionally upload images.</p>
              </div>
              <button onClick={resetForm} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-auto flex-1 p-5 space-y-5">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Patient ID <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={patientId}
                    onChange={e => setPatientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                    placeholder="e.g. WIA0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Age <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                    placeholder="e.g. 45"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name <span className="text-slate-500 font-normal text-xs">(optional)</span></label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Study Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    required
                    value={studyDate}
                    onChange={e => setStudyDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Clinical Notes</label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm min-h-[72px] resize-none"
                  placeholder="Any relevant clinical history..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Images <span className="text-red-400">*</span></label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Images
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFilePick}
                />

                {uploadRows.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-700 hover:border-blue-600 rounded-xl p-8 text-slate-500 hover:text-blue-400 transition-all flex flex-col items-center gap-2 group"
                  >
                    <Upload className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Click to upload mammogram images</span>
                    <span className="text-xs text-slate-600">PNG, JPG, DICOM • Files named as PatientID_XX.png are auto-decoded</span>
                  </button>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {uploadRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-lg p-2">
                        <img src={row.preview} alt="" className="w-12 h-12 rounded object-cover shrink-0 bg-black" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-300 truncate font-medium">{row.file.name}</div>
                          <div className="flex gap-2 mt-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">View:</span>
                              <select
                                value={row.viewCode}
                                onChange={e => updateRow(idx, 'viewCode', Number(e.target.value) as 0|1)}
                                className="text-xs bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 focus:outline-none focus:border-blue-500"
                              >
                                <option value={0}>CC</option>
                                <option value={1}>MLO</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Side:</span>
                              <select
                                value={row.sideCode}
                                onChange={e => updateRow(idx, 'sideCode', Number(e.target.value) as 0|1)}
                                className="text-xs bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 focus:outline-none focus:border-blue-500"
                              >
                                <option value={0}>Left</option>
                                <option value={1}>Right</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeRow(idx)} className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-1">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">Cancel</button>
                <button
                  type="submit"
                  disabled={isSubmitting || !patientId || !patientAge || uploadRows.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
                >
                  {isSubmitting ? 'Saving…' : `Save Patient & Upload ${uploadRows.length} Image${uploadRows.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <EditPatientModal patient={editingPatient} onClose={() => setEditingPatient(null)} />
      )}
    </div>
  );
};

// ─── Patient Row with Image Count ─────────────────────────────────────────────
interface PatientRowProps {
  patient: Patient;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
}

const PatientRow: React.FC<PatientRowProps> = ({ patient, expanded, onToggleExpand, onEdit }) => {
  const images = useLiveQuery(() => db.images.where('patientId').equals(patient.patientId).toArray(), [patient.patientId]);

  return (
    <>
      <tr className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={onToggleExpand}>
        <td className="px-6 py-4 font-mono text-sm font-medium text-blue-400">{patient.patientId}</td>
        <td className="px-6 py-4 text-slate-200">{patient.name || <span className="text-slate-600 italic">—</span>}</td>
        <td className="px-6 py-4">{patient.age || <span className="text-slate-600">—</span>}</td>
        <td className="px-6 py-4 text-slate-400">{patient.studyDate}</td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
            {images?.length ?? 0} image{images?.length !== 1 ? 's' : ''}
          </span>
        </td>
        <td className="px-6 py-4 truncate max-w-[180px] text-slate-400 text-sm" title={patient.remarks}>{patient.remarks || <span className="text-slate-600 italic">—</span>}</td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
              title="Edit patient"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && images && images.length > 0 && (
        <tr className="bg-slate-950/50">
          <td colSpan={7} className="px-6 py-3">
            <div className="flex flex-wrap gap-3">
              {images.map(img => {
                const url = URL.createObjectURL(img.fileData);
                return (
                  <div key={img.id} className="flex flex-col items-center gap-1">
                    <img
                      src={url}
                      alt={img.id}
                      className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                      onLoad={() => URL.revokeObjectURL(url)}
                    />
                    <span className="text-xs text-slate-500">{img.viewCode === 0 ? 'CC' : 'MLO'}-{img.sideCode === 0 ? 'L' : 'R'}</span>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default Patients;
