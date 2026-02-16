import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from './logger';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

// In development, use the Vite proxy to avoid CORS issues.
// The proxy rewrites /api/* to the Strapi server.
const API_BASE_URL = import.meta.env.DEV ? '/api' : `${STRAPI_URL}/api`;

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiError {
  error: {
    status: number;
    name: string;
    message: string;
    details?: unknown;
  };
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor per aggiungere token
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        const apiToken = import.meta.env.VITE_API_TOKEN;
        if (apiToken) {
          config.headers.Authorization = `Bearer ${apiToken}`;
        }
      }

      return config;
    });

    // Response interceptor per gestire errori
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<StrapiError>) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    localStorage.removeItem('auth_token');
  }

  // Generic CRUD methods
  async find<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<StrapiResponse<T[]>> {
    const response = await this.client.get<StrapiResponse<T[]>>(
      `/${endpoint}`,
      { params, signal }
    );
    return response.data;
  }

  async findOne<T>(
    endpoint: string,
    id: string | number,
    params?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<StrapiResponse<T>> {
    const url = `/${endpoint}/${id}`;
    logger.debug(`API call: GET ${url}`, params);
    try {
      const response = await this.client.get<StrapiResponse<T>>(url, {
        params,
        signal,
      });
      logger.debug(`API response for ${url}:`, response.status);
      return response.data;
    } catch (error) {
      if (!axios.isCancel(error)) {
        logger.error(`API error for ${url}:`, error);
      }
      throw error;
    }
  }

  async create<T>(
    endpoint: string,
    data: unknown
  ): Promise<StrapiResponse<T>> {
    const response = await this.client.post<StrapiResponse<T>>(
      `/${endpoint}`,
      { data }
    );
    return response.data;
  }

  async update<T>(
    endpoint: string,
    id: string | number,
    data: unknown
  ): Promise<StrapiResponse<T>> {
    const url = `/${endpoint}/${id}`;
    logger.debug(`API call: PUT ${url}`, { id, idType: typeof id, data });
    try {
      const response = await this.client.put<StrapiResponse<T>>(url, {
        data,
      });
      logger.debug(`API update response for ${url}:`, response.status);
      return response.data;
    } catch (error) {
      if (!axios.isCancel(error)) {
        logger.error(`API update error for ${url}:`, error);
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as {
            response?: {
              status?: number;
              data?: unknown;
              config?: { url?: string };
            };
          };
          logger.error('Update error details:', {
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            url: axiosError.response?.config?.url || url,
            attemptedId: id,
          });
        }
      }
      throw error;
    }
  }

  async delete(endpoint: string, id: string | number): Promise<void> {
    await this.client.delete(`/${endpoint}/${id}`);
  }

  // Upload file
  async upload(file: File): Promise<{ id: number; url: string }> {
    const formData = new FormData();
    formData.append('files', file);

    const response = await this.client.post<
      Array<{
        id: number;
        url: string;
        formats?: unknown;
        attributes?: { url: string };
      }>
    >('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const uploaded = response.data[0];
    const url = uploaded.attributes?.url || uploaded.url || '';
    const fullUrl = url.startsWith('http') ? url : `${STRAPI_URL}${url}`;

    return {
      id: uploaded.id,
      url: fullUrl,
    };
  }

  // Auth methods
  async login(identifier: string, password: string) {
    const response = await this.client.post<{
      jwt: string;
      user: unknown;
    }>('/auth/local', {
      identifier,
      password,
    });

    this.setToken(response.data.jwt);
    return response.data;
  }

  async me() {
    const response = await this.client.get('/users/me');
    return response.data;
  }
}

export const apiClient = new ApiClient();
