const BASE = '/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res;
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {
      message = (await res.text()) || message;
    }
    throw new Error(message);
  }
  return res.json();
}

export async function logout() {
  try {
    await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
  } catch {
    // stateless JWT — local cleanup is enough
  }
}

function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  }
  return q.toString();
}

export async function checkHealth() {
  try {
    await fetch(`${BASE}/categories?locale=en`);
    return true;
  } catch {
    return false;
  }
}

export function getCategories(locale = 'en') {
  return request(`/categories?${buildQuery({ locale })}`);
}

export function getProducts(filters = {}) {
  const params = {
    locale: filters.locale || 'en',
    page: filters.page || 1,
    perPage: filters.perPage || 48,
    sectionId: filters.sectionId || '',
    categoryId: filters.categoryId || '',
    groupId: filters.groupId || '',
    operation: filters.operation || '',
    toolMaterial: filters.toolMaterial || '',
    workpieceMaterial: filters.workpieceMaterial || '',
    machineType: filters.machineType || '',
    machineBrand: filters.machineBrand || '',
    cuttingType: filters.cuttingType || '',
    dMmMin: filters.dMmMin || '',
    dMmMax: filters.dMmMax || '',
    shankMm: filters.shankMm || '',
    hasBallBearing: filters.hasBallBearing || '',
    productType: filters.productType || '',
    inStock: filters.inStock || '',
  };
  return request(`/products?${buildQuery(params)}`);
}

export function getProduct(toolNo, locale = 'en') {
  return request(`/products/${encodeURIComponent(toolNo)}?locale=${locale}`);
}

export function getSpareParts(productId, locale = 'en') {
  return request(`/products/${productId}/spare-parts?locale=${locale}`);
}

export function getCompatibleTools(productId, locale = 'en') {
  return request(`/products/${productId}/compatible-tools?locale=${locale}`);
}

export function search(q, locale = 'en', page = 1, perPage = 20) {
  return request(`/search?${buildQuery({ q, locale, page, perPage })}`);
}

export function getOperations() {
  return request('/operations');
}

export function getOperationProducts(code, locale = 'en', page = 1, perPage = 48) {
  return request(`/operations/${encodeURIComponent(code)}/products?${buildQuery({ locale, page, perPage })}`);
}

export function getExportPreview(locale = 'en', filters = {}, page = 1, perPage = 20) {
  const params = { locale, ...filters, page, perPage };
  return request(`/export/preview?${buildQuery(params)}`);
}

export async function exportProducts(format, locale = 'en', extraFilters = {}) {
  const params = { format, locale, ...extraFilters };
  const url = `${BASE}/export?${buildQuery(params)}`;
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  let filename = `catalog.${format}`;
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (match) filename = match[1].replace(/['"]/g, '');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function validateImport(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/admin/import/validate`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function executeImport(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/admin/import/execute`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.text();
}

export async function syncPhotos() {
  return request('/admin/photos/sync', {
    method: 'POST',
  });
}

export async function validatePhotos(files) {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }
  const res = await fetch(`${BASE}/admin/photos/validate`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function importPhotos(files) {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }
  const res = await fetch(`${BASE}/admin/photos/import`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Admin Catalog CRUD
export function createSection(data) {
  return request('/admin/catalog/sections', { method: 'POST', body: JSON.stringify(data) });
}
export function updateSection(id, data) {
  return request(`/admin/catalog/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteSection(id, cascade = false) {
  return request(`/admin/catalog/sections/${id}?cascade=${cascade}`, { method: 'DELETE' });
}
export function reorderSections(items) {
  return request('/admin/catalog/sections/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
}
export function createCategory(data) {
  return request('/admin/catalog/categories', { method: 'POST', body: JSON.stringify(data) });
}
export function updateCategory(id, data) {
  return request(`/admin/catalog/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteCategory(id, cascade = false) {
  return request(`/admin/catalog/categories/${id}?cascade=${cascade}`, { method: 'DELETE' });
}
export function reorderCategories(items) {
  return request('/admin/catalog/categories/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
}
export function createProductGroup(data) {
  return request('/admin/catalog/product-groups', { method: 'POST', body: JSON.stringify(data) });
}
export function updateProductGroup(id, data) {
  return request(`/admin/catalog/product-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteProductGroup(id) {
  return request(`/admin/catalog/product-groups/${id}`, { method: 'DELETE' });
}
export function reorderProductGroups(items) {
  return request('/admin/catalog/product-groups/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
}
export function getChildrenCount(type, id) {
  return request(`/admin/catalog/${type}/${id}/children-count`);
}

export function getPriceList(apiKey) {
  return request('/dealer/price-list', { headers: { 'X-Api-Key': apiKey } });
}

export function getSkuMapping(apiKey) {
  return request('/dealer/sku-mapping', { headers: { 'X-Api-Key': apiKey } });
}

export async function addSkuMapping(apiKey, toolNo, dealerSku, note = '') {
  return request('/dealer/sku-mapping', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolNo, dealerSku, note }),
  });
}
