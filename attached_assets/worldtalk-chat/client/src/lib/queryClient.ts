import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // 🔧 改进错误处理：尝试解析JSON错误响应
    try {
      const errorData = JSON.parse(text);
      // 优先使用message字段，然后是error字段
      if (errorData.message) {
        const error = new Error(errorData.message);
        (error as any).statusCode = res.status;
        throw error;
      } else if (errorData.error) {
        const error = new Error(errorData.error);
        (error as any).statusCode = res.status;
        throw error;
      }
    } catch (parseError) {
      // 如果parseError是我们抛出的错误，重新抛出它
      if (parseError instanceof Error && (parseError.message === 'Cannot add yourself as friend' || parseError.message === 'Already friends' || parseError.message === 'Friend request already sent')) {
        throw parseError;
      }
      // 如果不是JSON，使用原有逻辑
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

// 🔧 更新apiRequest函数以支持现代调用方式
export async function apiRequest(
  urlOrConfig: string | { method?: string; url?: string; body?: any },
  options?: { method?: string; body?: any }
): Promise<any> {
  let url: string;
  let method: string;
  let body: any;

  // 支持新的单参数对象调用方式: apiRequest(url, { method, body })
  if (typeof urlOrConfig === 'string') {
    url = urlOrConfig;
    method = options?.method || 'GET';
    body = options?.body;
  } else {
    // 支持新的对象调用方式: apiRequest({ url, method, body })
    url = urlOrConfig.url || '';
    method = urlOrConfig.method || 'GET';
    body = urlOrConfig.body;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // 🔧 返回解析后的JSON而不是Response对象
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // 🔧 修复URL构造问题：过滤掉undefined值并正确构造URL
    const filteredQueryKey = queryKey.filter(key => key !== undefined && key !== null);
    const url = filteredQueryKey.join("/") as string;
    
    const res = await fetch(url, {
      credentials: "include",
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
      staleTime: 30000, // 30 seconds - allows cache invalidation to trigger re-renders
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
