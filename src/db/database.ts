import Dexie, { type EntityTable } from 'dexie';

export type UserRole = 'admin' | 'hospital' | 'general';
export type DownloadRequestStatus = 'pending' | 'approved' | 'rejected';
export type AuditAction = 'upload' | 'edit' | 'annotation' | 'download' | 'approval';

export interface Hospital {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  createdByUserId: string;
}

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Patient {
  id?: number; // Auto-increment primary key
  patientId: string; // User-defined unique ID
  name?: string; // Optional
  age?: number; // Required at upload
  studyDate: string;
  remarks?: string;
  organizationId: string;
  uploadedByUserId: string;
  visibility: 'sample' | 'protected';
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
  organizationId: string;
  uploadedByUserId: string;
  visibility: 'sample' | 'protected';
}

export interface Annotation {
  id: string; // UUID
  imageId: string; // Foreign key
  type: 'bbox' | 'polygon' | 'point' | 'freehand';
  coordinates: number[]; // Flat array of [x, y, x, y...] or freehand points
  tumorCenter: { x: number; y: number };
  tumorArea: number; // in pixels squared
  label: string; // 'Benign', 'Malignant', etc.
  remarks: string;
  biRads?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  timestamp: number;
  organizationId: string;
  createdByUserId: string;
}

export interface DownloadRequest {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  organizationId: string;
  requestedAt: number;
  status: DownloadRequestStatus;
  requestedDatasetSummary: string;
  reviewedByUserId?: string;
  reviewedAt?: number;
  reviewerNotes?: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorRole: UserRole;
  organizationId: string;
  timestamp: number;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  details: string;
}

const db = new Dexie('MammogramAnnotationDB') as Dexie & {
  hospitals: EntityTable<Hospital, 'id'>;
  users: EntityTable<AppUser, 'id'>;
  patients: EntityTable<Patient, 'id'>;
  images: EntityTable<MammogramImage, 'id'>;
  annotations: EntityTable<Annotation, 'id'>;
  downloadRequests: EntityTable<DownloadRequest, 'id'>;
  auditLogs: EntityTable<AuditLog, 'id'>;
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
  return tx.table('patients').toCollection().modify(patient => {
    if (!patient.name) patient.name = '';
    if (!patient.remarks) patient.remarks = '';
  });
});

// Version 4 — RBAC, multi-tenant and audit support
db.version(4).stores({
  hospitals: 'id, name, code, createdAt',
  users: 'id, email, role, organizationId, isActive, createdAt',
  patients: '++id, &patientId, name, organizationId, uploadedByUserId',
  images: 'id, patientId, status, viewCode, sideCode, uploadTimestamp, organizationId, uploadedByUserId',
  annotations: 'id, imageId, label, organizationId, createdByUserId',
  downloadRequests: 'id, requesterUserId, status, organizationId, requestedAt',
  auditLogs: 'id, actorUserId, action, organizationId, timestamp',
}).upgrade(tx => {
  return Promise.all([
    tx.table('patients').toCollection().modify(patient => {
      if (!patient.organizationId) patient.organizationId = 'sample-hospital';
      if (!patient.uploadedByUserId) patient.uploadedByUserId = 'sample-uploader';
      if (!patient.visibility) patient.visibility = 'protected';
    }),
    tx.table('images').toCollection().modify(image => {
      if (!image.organizationId) image.organizationId = 'sample-hospital';
      if (!image.uploadedByUserId) image.uploadedByUserId = 'sample-uploader';
      if (!image.visibility) image.visibility = 'protected';
    }),
    tx.table('annotations').toCollection().modify(annotation => {
      if (!annotation.organizationId) annotation.organizationId = 'sample-hospital';
      if (!annotation.createdByUserId) annotation.createdByUserId = 'sample-uploader';
    }),
  ]);
});

// Version 5 — add visibility indexes required by gallery/dashboard queries
db.version(5).stores({
  hospitals: 'id, name, code, createdAt',
  users: 'id, email, role, organizationId, isActive, createdAt',
  patients: '++id, &patientId, name, organizationId, uploadedByUserId, visibility',
  images: 'id, patientId, status, viewCode, sideCode, uploadTimestamp, organizationId, uploadedByUserId, visibility',
  annotations: 'id, imageId, label, organizationId, createdByUserId',
  downloadRequests: 'id, requesterUserId, status, organizationId, requestedAt',
  auditLogs: 'id, actorUserId, action, organizationId, timestamp',
}).upgrade(tx => {
  return Promise.all([
    tx.table('patients').toCollection().modify(patient => {
      if (!patient.visibility) patient.visibility = 'protected';
    }),
    tx.table('images').toCollection().modify(image => {
      if (!image.visibility) image.visibility = 'protected';
    }),
  ]);
});

export { db };
