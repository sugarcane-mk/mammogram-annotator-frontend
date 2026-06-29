/**
 * API Abstraction Layer
 * 
 * This layer provides a flexible interface for API calls that can easily switch
 * between local backend, cloud services, or mock implementations.
 * 
 * Future Enhancement: Can be configured via environment variables to support:
 * - Local backend (Node.js/Express)
 * - AWS Lambda + API Gateway
 * - Google Cloud Functions
 * - Azure Functions
 */

import type { AppUser, Hospital, Patient, MammogramImage, Annotation, DownloadRequest, AuditLog } from '../db/database';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private config: ApiConfig;
  private readonly LOCAL_API_PREFIX = 'http://localhost:3000/api';

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      baseUrl: import.meta.env.VITE_API_URL || this.LOCAL_API_PREFIX,
      timeout: 30000,
      retries: 3,
      ...config,
    };
  }

  /**
   * Make an API request with retry logic and error handling
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on client errors (4xx), only on server errors (5xx) or network errors
        if (error instanceof TypeError || (lastError.message.includes('HTTP') && lastError.message.includes('5'))) {
          if (attempt === this.config.retries - 1) break;
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        } else {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed',
    };
  }

  // ============ AUTHENTICATION ============

  async login(email: string, password: string): Promise<ApiResponse<AppUser>> {
    return this.request<AppUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: Partial<AppUser>): Promise<ApiResponse<AppUser>> {
    return this.request<AppUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  // ============ USERS ============

  async getUser(userId: string): Promise<ApiResponse<AppUser>> {
    return this.request<AppUser>(`/users/${userId}`);
  }

  async listUsers(filters?: Record<string, unknown>): Promise<ApiResponse<AppUser[]>> {
    const query = new URLSearchParams(
      Object.entries(filters || {}).map(([k, v]) => [k, String(v)])
    );
    return this.request<AppUser[]>(`/users?${query}`);
  }

  async updateUser(userId: string, updates: Partial<AppUser>): Promise<ApiResponse<AppUser>> {
    return this.request<AppUser>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // ============ HOSPITALS ============

  async getHospital(hospitalId: string): Promise<ApiResponse<Hospital>> {
    return this.request<Hospital>(`/hospitals/${hospitalId}`);
  }

  async listHospitals(): Promise<ApiResponse<Hospital[]>> {
    return this.request<Hospital[]>('/hospitals');
  }

  async createHospital(hospital: Omit<Hospital, 'createdAt' | 'createdByUserId'>): Promise<ApiResponse<Hospital>> {
    return this.request<Hospital>('/hospitals', {
      method: 'POST',
      body: JSON.stringify(hospital),
    });
  }

  async updateHospital(hospitalId: string, updates: Partial<Hospital>): Promise<ApiResponse<Hospital>> {
    return this.request<Hospital>(`/hospitals/${hospitalId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // ============ PATIENTS ============

  async getPatient(patientId: string): Promise<ApiResponse<Patient>> {
    return this.request<Patient>(`/patients/${patientId}`);
  }

  async listPatients(organizationId?: string): Promise<ApiResponse<Patient[]>> {
    const query = organizationId ? `?organization=${organizationId}` : '';
    return this.request<Patient[]>(`/patients${query}`);
  }

  async createPatient(patient: Omit<Patient, 'id'>): Promise<ApiResponse<Patient>> {
    return this.request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<ApiResponse<Patient>> {
    return this.request<Patient>(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // ============ IMAGES ============

  async getImage(imageId: string): Promise<ApiResponse<MammogramImage>> {
    return this.request<MammogramImage>(`/images/${imageId}`);
  }

  async listImages(filters?: Record<string, unknown>): Promise<ApiResponse<MammogramImage[]>> {
    const query = new URLSearchParams(
      Object.entries(filters || {}).map(([k, v]) => [k, String(v)])
    );
    return this.request<MammogramImage[]>(`/images?${query}`);
  }

  async uploadImage(formData: FormData): Promise<ApiResponse<MammogramImage>> {
    return this.request<MammogramImage>('/images/upload', {
      method: 'POST',
      body: formData,
      headers: {} as Record<string, string>, // Let browser set Content-Type
    });
  }

  async updateImage(imageId: string, updates: Partial<MammogramImage>): Promise<ApiResponse<MammogramImage>> {
    return this.request<MammogramImage>(`/images/${imageId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // ============ ANNOTATIONS ============

  async getAnnotation(annotationId: string): Promise<ApiResponse<Annotation>> {
    return this.request<Annotation>(`/annotations/${annotationId}`);
  }

  async listAnnotations(imageId?: string): Promise<ApiResponse<Annotation[]>> {
    const query = imageId ? `?image=${imageId}` : '';
    return this.request<Annotation[]>(`/annotations${query}`);
  }

  async createAnnotation(annotation: Omit<Annotation, 'id' | 'timestamp'>): Promise<ApiResponse<Annotation>> {
    return this.request<Annotation>('/annotations', {
      method: 'POST',
      body: JSON.stringify({ ...annotation, timestamp: Date.now() }),
    });
  }

  async updateAnnotation(annotationId: string, updates: Partial<Annotation>): Promise<ApiResponse<Annotation>> {
    return this.request<Annotation>(`/annotations/${annotationId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, timestamp: Date.now() }),
    });
  }

  async deleteAnnotation(annotationId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/annotations/${annotationId}`, {
      method: 'DELETE',
    });
  }

  // ============ DOWNLOAD REQUESTS ============

  async createDownloadRequest(request: Omit<DownloadRequest, 'id' | 'requestedAt'>): Promise<ApiResponse<DownloadRequest>> {
    return this.request<DownloadRequest>('/download-requests', {
      method: 'POST',
      body: JSON.stringify({ ...request, requestedAt: Date.now() }),
    });
  }

  async listDownloadRequests(filters?: Record<string, unknown>): Promise<ApiResponse<DownloadRequest[]>> {
    const query = new URLSearchParams(
      Object.entries(filters || {}).map(([k, v]) => [k, String(v)])
    );
    return this.request<DownloadRequest[]>(`/download-requests?${query}`);
  }

  async approveDownloadRequest(requestId: string, notes?: string): Promise<ApiResponse<DownloadRequest>> {
    return this.request<DownloadRequest>(`/download-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes, reviewedAt: Date.now() }),
    });
  }

  async rejectDownloadRequest(requestId: string, notes?: string): Promise<ApiResponse<DownloadRequest>> {
    return this.request<DownloadRequest>(`/download-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes, reviewedAt: Date.now() }),
    });
  }

  // ============ AUDIT LOGS ============

  async logAction(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<ApiResponse<AuditLog>> {
    return this.request<AuditLog>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify({ ...log, timestamp: Date.now() }),
    });
  }

  async listAuditLogs(filters?: Record<string, unknown>): Promise<ApiResponse<AuditLog[]>> {
    const query = new URLSearchParams(
      Object.entries(filters || {}).map(([k, v]) => [k, String(v)])
    );
    return this.request<AuditLog[]>(`/audit-logs?${query}`);
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

export default ApiClient;
