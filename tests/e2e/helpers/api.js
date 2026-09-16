const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:3100/api/v1';

/**
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {string} method
 * @param {string} apiPath
 * @param {{ body?: object }} [options]
 */
export async function apiJson(request, token, method, apiPath, options = {}) {
  const url = apiPath.startsWith('http')
    ? apiPath
    : `${API_BASE}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  const headers = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';

  const response = await request.fetch(url, {
    method,
    headers,
    data: options.body,
    failOnStatusCode: false,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { response, json, status: response.status() };
}

export async function loginApi(request, username, password) {
  const { response, json, status } = await apiJson(request, '', 'POST', '/auth/login', {
    body: { username, password },
  });
  const token = json?.accessToken || json?.token;
  if (status < 200 || status >= 300 || !token) {
    throw new Error(`API login failed: ${status} ${JSON.stringify(json)}`);
  }
  return { token, user: json.user, status, response };
}

export async function getMe(request, token) {
  return apiJson(request, token, 'GET', '/auth/me');
}

export async function getCompany(request, token, companyId) {
  return apiJson(request, token, 'GET', `/companies/${companyId}`);
}

export async function patchCompany(request, token, companyId, body) {
  return apiJson(request, token, 'PATCH', `/companies/${companyId}`, { body });
}

export async function getOrdersForCompany(request, token, companyId) {
  return apiJson(
    request,
    token,
    'GET',
    `/orders?companyId=${encodeURIComponent(companyId)}`,
  );
}

export async function getActivitiesForCompany(request, token, companyId) {
  const qs = new URLSearchParams({
    subjectType: 'COMPANY',
    subjectId: String(companyId),
  });
  return apiJson(request, token, 'GET', `/activities?${qs.toString()}`);
}

export async function archiveEntity(request, token, kind, id, options = {}) {
  if (kind === 'lead') {
    return apiJson(request, token, 'POST', `/leads/${id}/archive`, {
      body: { reason: options.reason || 'E2E cleanup archive' },
    });
  }
  const apiPath = kind === 'company'
    ? `/companies/${id}`
    : kind === 'order'
      ? `/orders/${id}`
      : kind === 'task'
        ? `/tasks/${id}`
        : kind === 'correspondence'
          ? `/correspondence/${id}`
          : `/activities/${id}`;
  return apiJson(request, token, 'DELETE', apiPath);
}

export async function getLead(request, token, leadId) {
  return apiJson(request, token, 'GET', `/leads/${leadId}`);
}

export async function listLeads(request, token, query = {}) {
  const qs = new URLSearchParams();
  if (query.q) qs.set('q', query.q);
  if (query.status) qs.set('status', query.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiJson(request, token, 'GET', `/leads${suffix}`);
}

export async function createCompanyApi(request, token, body) {
  return apiJson(request, token, 'POST', '/companies', { body });
}

export async function createActivityApi(request, token, body) {
  return apiJson(request, token, 'POST', '/activities', { body });
}

export async function completeActivityApi(request, token, activityId) {
  return apiJson(request, token, 'PATCH', `/activities/${activityId}/complete`, { body: {} });
}

export async function createOrderApi(request, token, body) {
  return apiJson(request, token, 'POST', '/orders', { body });
}

export async function getOrderApi(request, token, orderId) {
  return apiJson(request, token, 'GET', `/orders/${encodeURIComponent(orderId)}`);
}

export async function patchOrderApi(request, token, orderId, body) {
  return apiJson(request, token, 'PATCH', `/orders/${encodeURIComponent(orderId)}`, { body });
}

export async function listOrdersApi(request, token, query = {}) {
  const qs = new URLSearchParams();
  if (query.companyId) qs.set('companyId', query.companyId);
  if (query.status) qs.set('status', query.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiJson(request, token, 'GET', `/orders${suffix}`);
}

export async function recomputeLifecycleApi(request, token, companyId, body = {}) {
  return apiJson(
    request,
    token,
    'POST',
    `/companies/${encodeURIComponent(companyId)}/lifecycle/recompute`,
    { body },
  );
}

export async function convertLeadApi(request, token, leadId, body) {
  return apiJson(request, token, 'POST', `/leads/${encodeURIComponent(leadId)}/convert`, { body });
}

export async function createTaskApi(request, token, body) {
  return apiJson(request, token, 'POST', '/tasks', { body });
}

export async function getTaskApi(request, token, taskId) {
  return apiJson(request, token, 'GET', `/tasks/${encodeURIComponent(taskId)}`);
}

export async function completeTaskApi(request, token, taskId) {
  return apiJson(request, token, 'PATCH', `/tasks/${taskId}/complete`, { body: {} });
}

export async function getTasksForSubject(request, token, subjectType, subjectId) {
  const qs = new URLSearchParams({ subjectType, subjectId: String(subjectId) });
  return apiJson(request, token, 'GET', `/tasks?${qs.toString()}`);
}

export async function getActivitiesForSubject(request, token, subjectType, subjectId) {
  const qs = new URLSearchParams({ subjectType, subjectId: String(subjectId) });
  return apiJson(request, token, 'GET', `/activities?${qs.toString()}`);
}

export async function listActivityTypesApi(request, token, query = {}) {
  const qs = new URLSearchParams();
  if (query.includeInactive != null) qs.set('includeInactive', String(query.includeInactive));
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiJson(request, token, 'GET', `/activity-types${suffix}`);
}

export async function createActivityTypeApi(request, token, body) {
  return apiJson(request, token, 'POST', '/activity-types', { body });
}

export async function deactivateActivityTypeApi(request, token, key) {
  return apiJson(request, token, 'PATCH', `/activity-types/${encodeURIComponent(key)}/deactivate`, { body: {} });
}

export async function activateActivityTypeApi(request, token, key) {
  return apiJson(request, token, 'PATCH', `/activity-types/${encodeURIComponent(key)}/activate`, { body: {} });
}

export async function updateTaskApi(request, token, taskId, body) {
  return apiJson(request, token, 'PATCH', `/tasks/${encodeURIComponent(taskId)}`, { body });
}

export async function updateActivityApi(request, token, activityId, body) {
  return apiJson(request, token, 'PATCH', `/activities/${encodeURIComponent(activityId)}`, { body });
}

export async function createCorrespondenceApi(request, token, body) {
  return apiJson(request, token, 'POST', '/correspondence', { body });
}

export async function getCorrespondenceApi(request, token, id) {
  return apiJson(request, token, 'GET', `/correspondence/${encodeURIComponent(id)}`);
}

export async function updateCorrespondenceApi(request, token, id, body) {
  return apiJson(request, token, 'PATCH', `/correspondence/${encodeURIComponent(id)}`, { body });
}

export async function finalizeCorrespondenceApi(request, token, id, body = {}) {
  return apiJson(request, token, 'POST', `/correspondence/${encodeURIComponent(id)}/finalize`, { body });
}

export async function addCorrespondenceAttachmentApi(request, token, id, body) {
  return apiJson(request, token, 'POST', `/correspondence/${encodeURIComponent(id)}/attachments`, { body });
}

export async function listCompaniesByNationalId(request, token, nationalId) {
  const list = await apiJson(request, token, 'GET', '/companies');
  const items = list.json?.items || [];
  const nid = String(nationalId || '').replace(/\D/g, '');
  return {
    ...list,
    matches: items.filter((c) => String(c.nationalId || '').replace(/\D/g, '') === nid),
  };
}
