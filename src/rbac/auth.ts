import { db } from '../db/database';
import type { AppUser, AuditLog, DownloadRequest, Hospital, MammogramImage, Patient, UserRole } from '../db/database';

export interface AuthContext {
  user: AppUser | null;
  role: UserRole | null;
  organizationId: string | null;
  setUser: (user: AppUser | null) => void;
  logout: () => void;
}

export const DEFAULT_ORGANIZATION_ID = 'sample-hospital';
export const DEFAULT_ADMIN_USER_ID = 'admin-root';
export const DEFAULT_HOSPITAL_ID = 'sample-hospital';

const DEFAULT_PASSWORD = 'Password123!';

export const seedDefaultData = async () => {
  const hospitalCount = await db.hospitals.count();
  const userCount = await db.users.count();

  if (hospitalCount === 0) {
    await db.hospitals.add({
      id: DEFAULT_HOSPITAL_ID,
      name: 'Sample Hospital',
      code: 'SAMPLE',
      createdAt: Date.now(),
      createdByUserId: DEFAULT_ADMIN_USER_ID,
    });
  }

  if (userCount === 0) {
    const sampleHospital = await db.hospitals.get(DEFAULT_HOSPITAL_ID);
    const adminUser: AppUser = {
      id: DEFAULT_ADMIN_USER_ID,
      fullName: 'System Administrator',
      email: 'admin@example.com',
      password: DEFAULT_PASSWORD,
      role: 'admin',
      organizationId: sampleHospital?.id,
      isActive: true,
      createdAt: Date.now(),
    };
    const hospitalUser: AppUser = {
      id: 'hospital-user-1',
      fullName: 'Hospital Reviewer',
      email: 'hospital@example.com',
      password: DEFAULT_PASSWORD,
      role: 'hospital',
      organizationId: sampleHospital?.id,
      isActive: true,
      createdAt: Date.now(),
    };
    const generalUser: AppUser = {
      id: 'general-user-1',
      fullName: 'General User',
      email: 'general@example.com',
      password: DEFAULT_PASSWORD,
      role: 'general',
      organizationId: sampleHospital?.id,
      isActive: true,
      createdAt: Date.now(),
    };

    await db.users.bulkAdd([adminUser, hospitalUser, generalUser]);
  }

  const patientCount = await db.patients.count();
  if (patientCount === 0) {
    const samplePatient: Patient = {
      patientId: 'SAMPLE001',
      name: 'Sample Patient',
      age: 58,
      studyDate: new Date().toISOString().split('T')[0],
      remarks: 'Seeded demo dataset',
      organizationId: DEFAULT_HOSPITAL_ID,
      uploadedByUserId: DEFAULT_ADMIN_USER_ID,
      visibility: 'sample',
    };
    await db.patients.add(samplePatient);
    const sampleImage: MammogramImage = {
      id: `SAMPLE001_0_0_${Date.now()}`,
      patientId: 'SAMPLE001',
      originalFilename: 'SAMPLE001_00.png',
      fileData: new Blob(['demo'], { type: 'image/png' }),
      ageAtUpload: 58,
      viewCode: 0,
      sideCode: 0,
      remarks: 'Demo sample image',
      status: 'Reviewed',
      uploadTimestamp: Date.now(),
      organizationId: DEFAULT_HOSPITAL_ID,
      uploadedByUserId: DEFAULT_ADMIN_USER_ID,
      visibility: 'sample',
    };
    await db.images.add(sampleImage);
    await db.annotations.add({
      id: crypto.randomUUID(),
      imageId: sampleImage.id,
      type: 'bbox',
      coordinates: [80, 90, 220, 260],
      tumorCenter: { x: 150, y: 175 },
      tumorArea: 18000,
      label: 'Benign',
      remarks: 'Seeded demo annotation',
      timestamp: Date.now(),
      organizationId: DEFAULT_HOSPITAL_ID,
      createdByUserId: DEFAULT_ADMIN_USER_ID,
    });
    await db.auditLogs.add({
      id: crypto.randomUUID(),
      actorUserId: DEFAULT_ADMIN_USER_ID,
      actorRole: 'admin',
      organizationId: DEFAULT_HOSPITAL_ID,
      timestamp: Date.now(),
      action: 'upload',
      targetType: 'sample-dataset',
      targetId: sampleImage.id,
      details: 'Seeded demo dataset for RBAC demonstration',
    });
  }
};

export const getActiveUser = async (email: string, password: string) => {
  return db.users.where({ email, password }).first();
};

export const hasAccess = (role: UserRole | null | undefined, organizationId: string | null | undefined, recordOrgId?: string | null) => {
  if (!role) return false;
  if (role === 'admin') return true;
  return Boolean(organizationId && recordOrgId && organizationId === recordOrgId);
};

export const canManageDataset = (role: UserRole | null | undefined) => {
  return Boolean(role === 'admin' || role === 'hospital');
};

export const canAnnotateDataset = (role: UserRole | null | undefined) => {
  return Boolean(role === 'admin' || role === 'hospital' || role === 'general');
};

export const canDownloadProtected = (role: UserRole | null | undefined) => {
  return role === 'admin' || role === 'hospital';
};

export const getCurrentSession = () => {
  const raw = localStorage.getItem('rbac-session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { userId: string; role: UserRole; organizationId: string | null };
  } catch {
    return null;
  }
};

export const persistSession = (user: AppUser) => {
  localStorage.setItem('rbac-session', JSON.stringify({ userId: user.id, role: user.role, organizationId: user.organizationId || null }));
};

export const clearSession = () => {
  localStorage.removeItem('rbac-session');
};

export const getCurrentUserDetails = async () => {
  const session = getCurrentSession();
  if (!session) return null;
  return db.users.get(session.userId);
};

export const createHospital = async (hospital: Hospital) => {
  await db.hospitals.add(hospital);
};

export const createAuditLog = async (entry: Omit<AuditLog, 'id'>) => {
  await db.auditLogs.add({ id: crypto.randomUUID(), ...entry });
};

export const createDownloadRequest = async (request: Omit<DownloadRequest, 'id'>) => {
  await db.downloadRequests.add({ id: crypto.randomUUID(), ...request });
};
