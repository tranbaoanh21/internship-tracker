export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not connect to the server. Check that the API is running.');
  }

  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(body?.error?.message || 'The server could not complete the request.', {
      status: response.status,
      code: body?.error?.code,
      fields: body?.error?.fields,
    });
  }

  return body;
}

export function getApplications({ q, status, page, limit = 20, signal }) {
  const parameters = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) parameters.set('q', q);
  if (status) parameters.set('status', status);
  return request(`/api/applications?${parameters}`, { signal });
}

export function getStats({ signal } = {}) {
  return request('/api/applications/stats', { signal });
}

export function createApplication(input) {
  return request('/api/applications', { method: 'POST', body: JSON.stringify(input) });
}

export function updateApplication(id, input) {
  return request(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteApplication(id) {
  return request(`/api/applications/${id}`, { method: 'DELETE' });
}
