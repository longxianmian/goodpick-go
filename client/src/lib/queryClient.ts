import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  const adminToken = localStorage.getItem('adminToken');
  const userToken = localStorage.getItem('userToken');
  
  // 根据URL路径选择正确的token
  // /api/creator/*, /api/user/*, /api/short-videos/*, /api/stores/*, /api/payments/* 需要userToken
  // /api/admin/* 需要adminToken
  const isUserRoute = url.includes('/api/creator') || url.includes('/api/user') || 
                      url.includes('/api/short-videos') || url.includes('/api/me') ||
                      url.includes('/api/stores') || url.includes('/api/payments');
  const isAdminRoute = url.includes('/api/admin');
  
  if (isAdminRoute && adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  } else if (isUserRoute && userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  } else if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  } else if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }

  // Add language header for campaign title translation
  const currentLanguage = localStorage.getItem('language') || 'th-th';
  headers['Accept-Language'] = currentLanguage;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    const adminToken = localStorage.getItem('adminToken');
    const userToken = localStorage.getItem('userToken');
    
    // 根据URL路径选择正确的token
    const url = queryKey[0] as string;
    const isUserRoute = url.includes('/api/creator') || url.includes('/api/user') || 
                        url.includes('/api/short-videos') || url.includes('/api/me') ||
                        url.includes('/api/stores') || url.includes('/api/payments');
    const isAdminRoute = url.includes('/api/admin');
    
    if (isAdminRoute && adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    } else if (isUserRoute && userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    } else if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    } else if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }

    // Add language header for campaign title translation
    const currentLanguage = localStorage.getItem('language') || 'th-th';
    headers['Accept-Language'] = currentLanguage;

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // 避免页面导航时重复请求（使用缓存数据）
      refetchOnMount: false,
    },
    mutations: {
      retry: false,
    },
  },
});
