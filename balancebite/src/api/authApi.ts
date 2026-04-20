const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type AuthPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Сервер недоступен. Проверьте подключение и попробуйте снова.');
    }
    throw new Error('Не удалось выполнить запрос. Попробуйте снова.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Произошла ошибка на сервере. Попробуйте снова.');
  }

  return data;
}

export function login(payload: AuthPayload) {
  return request<{ user: { id: string; email: string } }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: AuthPayload) {
  return request<{ message: string; user: { id: string; email: string } }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
