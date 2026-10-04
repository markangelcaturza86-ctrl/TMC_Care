const BASE_URL = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = data?.message
      || (data?.errors ? Object.values(data.errors).flat().join(' ') : null)
      || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

// ---- Files that sit behind the login token ---------------------------------
// A plain <a href> or window.open() cannot send the "Authorization: Bearer ..."
// header, so we download the file with fetch() and open the result as a blob.
async function fetchBlob(path) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // the error body was not JSON - keep the generic message
    }
    throw new Error(message);
  }
  return res.blob();
}

// PDFs and images open in a new tab; other files (e.g. .docx) are downloaded.
export async function openProtectedFile(path, filename = 'file') {
  // Open the tab immediately (still inside the click) so popup blockers allow it.
  const tab = window.open('', '_blank');
  try {
    const blob = await fetchBlob(path);
    const url = URL.createObjectURL(blob);
    const viewable = blob.type === 'application/pdf' || blob.type.startsWith('image/');

    if (viewable && tab) {
      tab.location.href = url;
    } else {
      tab?.close();
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}