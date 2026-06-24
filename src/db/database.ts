import Dexie, { type EntityTable } from 'dexie';

export interface Patient {
  id?: number; // Auto-increment primary key
  patientId: string; // User-defined unique ID
  name?: string; // Optional
  age?: number; // Required at upload
  studyDate: string;
  remarks?: string;
}

export interface MammogramImage {
  id: string; // e.g., PAT001_0_0_timestamp
  patientId: string; // Foreign key
  originalFilename: string;
  fileData: Blob; // The actual image data
  ageAtUpload?: number;
  viewCode: 0 | 1; // 0=CC, 1=MLO
  sideCode: 0 | 1; // 0=L, 1=R
  remarks?: string;
  status: 'Not Reviewed' | 'In Progress' | 'Annotated' | 'Reviewed' | 'Approved';
  uploadTimestamp: number;
}

export interface Annotation {
  id: string; // UUID
  imageId: string; // Foreign key
  type: 'bbox' | 'polygon' | 'point';
  coordinates: number[]; // Flat array of [x, y, x, y...]
  tumorCenter: { x: number; y: number };
  tumorArea: number; // in pixels squared
  label: string; // 'Benign', 'Malignant', etc.
  remarks: string;
  timestamp: number;
}

const db = new Dexie('MammogramAnnotationDB') as Dexie & {
  patients: EntityTable<Patient, 'id'>;
  images: EntityTable<MammogramImage, 'id'>;
  annotations: EntityTable<Annotation, 'id'>;
};

// Version 1 - initial schema (legacy, must be kept for migration path)
db.version(1).stores({
  patients: '++id, &patientId, name',
  images: 'id, patientId, status, viewCode, sideCode',
  annotations: 'id, imageId, label',
});

// Version 2 — added uploadTimestamp index
db.version(2).stores({
  patients: '++id, &patientId, name',
  images: 'id, patientId, status, viewCode, sideCode, uploadTimestamp',
  annotations: 'id, imageId, label',
});

// Version 3 — name made optional on patient, remarks made optional on images
db.version(3).stores({
  patients: '++id, &patientId, name',
  images: 'id, patientId, status, viewCode, sideCode, uploadTimestamp',
  annotations: 'id, imageId, label',
}).upgrade(tx => {
  // No structural changes, just interface relaxation
  return tx.table('patients').toCollection().modify(patient => {
    if (!patient.name) patient.name = '';
    if (!patient.remarks) patient.remarks = '';
  });
});

export { db };
