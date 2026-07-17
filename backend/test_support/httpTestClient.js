const BASE_URL = 'http://localhost:5050/api';

async function requestJson(path, body = {}, sessionId = null) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (sessionId) {
    headers.Authorization = `Bearer ${sessionId}`;
    headers['x-session-id'] = sessionId;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: response.status, body: json, text };
}

async function requestJsonWithQuery(path, params = {}, sessionId = null) {
  const headers = { Accept: 'application/json' };
  if (sessionId) {
    headers.Authorization = `Bearer ${sessionId}`;
    headers['x-session-id'] = sessionId;
  }

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: response.status, body: json, text };
}

module.exports = { requestJson, requestJsonWithQuery };
