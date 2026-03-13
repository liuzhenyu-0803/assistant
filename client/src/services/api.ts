export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const BASE_URL = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `HTTP error ${response.status}`;

    try {
      const errorBody = await response.json();
      const error = errorBody.error ?? errorBody;
      if (error.code) code = error.code;
      if (error.message) message = error.message;
    } catch {
      // ignore JSON parse errors on error responses
    }

    throw new ApiError(message, code, response.status);
  }

  const json = await response.json();
  return (json as { data: T }).data;
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiDelete(url: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `HTTP error ${response.status}`;

    try {
      const errorBody = await response.json();
      const error = errorBody.error ?? errorBody;
      if (error.code) code = error.code;
      if (error.message) message = error.message;
    } catch {
      // ignore JSON parse errors on error responses
    }

    throw new ApiError(message, code, response.status);
  }
}
