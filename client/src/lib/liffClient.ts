declare global {
  interface Window {
    liff: any;
  }
}

let liffInitialized = false;
let liffInitPromise: Promise<void> | null = null;

export async function initLiffOnce(config: { liffId: string }): Promise<void> {
  if (liffInitialized) {
    console.log('[liffClient] LIFF已初始化，跳过');
    return;
  }
  
  if (!liffInitPromise) {
    liffInitPromise = (async () => {
      if (!window.liff) {
        console.log('[liffClient] window.liff不存在，跳过初始化');
        return;
      }
      
      console.log('[liffClient] 开始初始化LIFF');
      await window.liff.init({ liffId: config.liffId });
      liffInitialized = true;
      console.log('[liffClient] LIFF初始化成功');
    })();
  }
  
  return liffInitPromise;
}

export function isLiffEnvironment(): boolean {
  return window.liff && window.liff.isInClient();
}

export function getLiff() {
  return window.liff;
}
