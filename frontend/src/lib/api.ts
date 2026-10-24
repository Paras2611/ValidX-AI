const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('validx_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set application/json if not sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // response might be raw text
    }
    throw new ApiError(
      response.status,
      errorData.message || errorData.error || `HTTP error ${response.status}`,
      errorData
    );
  }

  return response.json();
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: any; message: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: { email: string; password: string; full_name: string }) =>
      request<{ token: string; user: any; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<{ user: any }>('/auth/me'),
  },

  applications: {
    getTypes: () => request<{ types: any[] }>('/applications/types'),
    create: (data: { application_type_id: string; title?: string; declared_data?: any }) =>
      request<{ application: any; message: string }>('/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params: { status?: string; priority?: string; search?: string; page?: number; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.append('status', params.status);
      if (params.priority) query.append('priority', params.priority);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      return request<{ total: number; page: number; totalPages: number; applications: any[] }>(
        `/applications?${query.toString()}`
      );
    },
    getById: (id: string) =>
      request<{
        application: any;
        documents: any[];
        extracted_fields: any[];
        verification_checks: any[];
        discrepancies: any[];
        rule_evaluations: any[];
        decisions: any[];
        comments: any[];
        reports: any[];
      }>(`/applications/${id}`),
    updateDraft: (id: string, data: { declared_data: any; title?: string }) =>
      request<{ application: any; message: string }>(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    submit: (id: string) =>
      request<{ message: string; status: string }>(`/applications/${id}/submit`, {
        method: 'POST',
      }),
    withdraw: (id: string) =>
      request<{ message: string }>(`/applications/${id}/withdraw`, {
        method: 'POST',
      }),
  },

  documents: {
    upload: (applicationId: string, documentType: string, file: File) => {
      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('file', file);
      return request<{ message: string; document: any; extracted_fields: any[] }>(
        `/documents/applications/${applicationId}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      );
    },
    getDetails: (id: string) =>
      request<{ document: any; extracted_fields: any[] }>(`/documents/${id}`),
    getContentUrl: (id: string) => {
      const token = localStorage.getItem('validx_token');
      return `${API_BASE}/documents/${id}/content${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
  },

  reviews: {
    getQueue: (params: { priority?: string; status?: string; assigned_to_me?: boolean } = {}) => {
      const query = new URLSearchParams();
      if (params.priority) query.append('priority', params.priority);
      if (params.status) query.append('status', params.status);
      if (params.assigned_to_me) query.append('assigned_to_me', 'true');
      return request<{ metrics: any; queue: any[] }>(`/reviews/queue?${query.toString()}`);
    },
    assign: (applicationId: string, officerId?: string) =>
      request<{ message: string; application: any }>(`/reviews/applications/${applicationId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ officer_id: officerId }),
      }),
    addComment: (applicationId: string, comment: string, is_internal: boolean = false) =>
      request<{ message: string; comment: any }>(`/reviews/applications/${applicationId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment, is_internal }),
      }),
    resolveDiscrepancy: (id: string, status: string, resolution_reason: string) =>
      request<{ message: string; discrepancy: any }>(`/reviews/discrepancies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, resolution_reason }),
      }),
    confirmField: (id: string, corrected_value?: string) =>
      request<{ message: string; field: any }>(`/reviews/extracted-fields/${id}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({ corrected_value }),
      }),
    requestCorrections: (applicationId: string, reason: string, instructions?: string) =>
      request<{ message: string; decision: any }>(`/reviews/applications/${applicationId}/request-corrections`, {
        method: 'POST',
        body: JSON.stringify({ reason, instructions }),
      }),
    approve: (
      applicationId: string,
      reason: string,
      internal_notes?: string,
      options?: {
        requires_physical_inspection?: boolean;
        inspection_committee_type?: string;
        infrastructure_observations?: string;
      }
    ) =>
      request<{ message: string; decision: any; report: any }>(`/reviews/applications/${applicationId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reason, internal_notes, ...options }),
      }),
    reject: (
      applicationId: string,
      reason: string,
      internal_notes?: string,
      options?: {
        requires_physical_inspection?: boolean;
        inspection_committee_type?: string;
        infrastructure_observations?: string;
      }
    ) =>
      request<{ message: string; decision: any }>(`/reviews/applications/${applicationId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, internal_notes, ...options }),
      }),
  },

  compliance: {
    listRules: () => request<{ rules: any[] }>('/compliance/rules'),
    createRule: (ruleData: any) =>
      request<{ message: string; rule: any }>('/compliance/rules', {
        method: 'POST',
        body: JSON.stringify(ruleData),
      }),
    approveVersion: (versionId: string) =>
      request<{ message: string; version: any }>(`/compliance/rules/versions/${versionId}/approve`, {
        method: 'POST',
      }),
    evaluate: (applicationId: string) =>
      request<{ message: string; evaluations: any[] }>(`/compliance/applications/${applicationId}/evaluate`, {
        method: 'POST',
      }),
  },

  reports: {
    generate: (applicationId: string) =>
      request<{ message: string; report: any }>(`/reports/applications/${applicationId}/generate`, {
        method: 'POST',
      }),
    list: (applicationId: string) =>
      request<{ reports: any[] }>(`/reports/applications/${applicationId}`),
    getDownloadUrl: (id: string) => {
      const token = localStorage.getItem('validx_token');
      return `${API_BASE}/reports/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
  },

  notifications: {
    list: () => request<{ unreadCount: number; notifications: any[] }>('/notifications'),
    markRead: (id: string) =>
      request<{ message: string }>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    markAllRead: () =>
      request<{ message: string }>('/notifications/read-all', {
        method: 'POST',
      }),
  },

  admin: {
    getUsers: () => request<{ users: any[] }>('/admin/users'),
    getAuditEvents: (params: { page?: number; limit?: number; resource_type?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.resource_type) query.append('resource_type', params.resource_type);
      return request<{ total: number; page: number; totalPages: number; events: any[] }>(
        `/admin/audit-events?${query.toString()}`
      );
    },
    getSystemHealth: () => request<any>('/admin/system-health'),
  },

  system: {
    getNetworkInfo: () =>
      request<{
        status: string;
        serverIp: string;
        backendPort: number;
        frontendPort: number;
        networkFrontendUrl: string;
        networkBackendUrl: string;
        apiEndpoint: string;
      }>('/network-info'),
  },
};
