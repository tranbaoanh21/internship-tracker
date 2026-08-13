export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let csrfToken = '';

export function setCsrfToken(value) {
  csrfToken = value || '';
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method) && csrfToken
          ? { 'X-CSRF-Token': csrfToken }
          : {}),
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

export function getAuthSession() {
  return request('/api/auth/session');
}

export async function login(credentials) {
  const response = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  setCsrfToken(response.data.csrfToken);
  return response;
}

export async function logout() {
  await request('/api/auth/logout', { method: 'POST' });
  setCsrfToken('');
}

export function getApplications({
  q,
  status,
  attention,
  sort,
  direction,
  view,
  page,
  limit = 20,
  signal,
}) {
  const parameters = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) parameters.set('q', q);
  if (status) parameters.set('status', status);
  if (attention) parameters.set('attention', attention);
  if (sort && sort !== 'updatedAt') parameters.set('sort', sort);
  if (direction && direction !== 'desc') parameters.set('direction', direction);
  if (view && view !== 'active') parameters.set('view', view);
  return request(`/api/applications?${parameters}`, { signal });
}

export function getStats({ q, view, signal } = {}) {
  const parameters = new URLSearchParams();
  if (q) parameters.set('q', q);
  if (view && view !== 'active') parameters.set('view', view);
  const query = parameters.toString();
  return request(`/api/applications/stats${query ? `?${query}` : ''}`, { signal });
}

export function getApplication(id, { signal } = {}) {
  return request(`/api/applications/${id}`, { signal });
}

export function getApplicationHistory(id, { signal } = {}) {
  return request(`/api/applications/${id}/history`, { signal });
}

export function createApplication(input) {
  return request('/api/applications', { method: 'POST', body: JSON.stringify(input) });
}

function versionHeader(version) {
  return { 'If-Match': `"${version}"` };
}

export function updateApplication(id, input, version) {
  return request(`/api/applications/${id}`, {
    method: 'PATCH',
    headers: versionHeader(version),
    body: JSON.stringify(input),
  });
}

export function archiveApplication(id, version) {
  return request(`/api/applications/${id}/archive`, {
    method: 'POST',
    headers: versionHeader(version),
  });
}

export function restoreApplication(id, version) {
  return request(`/api/applications/${id}/restore`, {
    method: 'POST',
    headers: versionHeader(version),
  });
}

export function deleteApplication(id, version) {
  return request(`/api/applications/${id}`, {
    method: 'DELETE',
    headers: versionHeader(version),
  });
}

export function getNotifications() {
  return request('/api/notifications');
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'PATCH' });
}

export function subscribeToNotifications(onNotification) {
  if (typeof EventSource === 'undefined') return () => {};
  const source = new EventSource('/api/notifications/events');
  source.addEventListener('notification', onNotification);
  return () => source.close();
}
