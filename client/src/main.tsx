// === Global DOM safety patch: avoid "removeChild" errors from third-party libs ===
if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;

  // 给 TypeScript 一个 any 强制转换，避免类型报错
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Node.prototype as any).removeChild = function safeRemoveChild(child: Node) {
    try {
      // 如果 child 不是当前节点的子节点，说明：
      // - 要么已经被别的逻辑删掉；
      // - 要么本来就不是这个父节点的 child；
      // 这类调用没有必要抛异常，直接跳过即可。
      if (!child || child.parentNode !== this) {
        return child;
      }
      return originalRemoveChild.call(this, child);
    } catch (err) {
      // 这里统一吞掉异常，防止整个 React 应用白屏；
      // 只在控制台打印一条调试信息，方便将来排查。
      console.warn('[DOM patch] safeRemoveChild suppressed error:', err);
      return child;
    }
  };
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 给当前 H5 页面会话生成一个全局唯一 ID
if (!(window as any).__GPGO_SESSION_ID__) {
  (window as any).__GPGO_SESSION_ID__ =
    'sess-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}
console.log('[Session] current sessionId =', (window as any).__GPGO_SESSION_ID__);

createRoot(document.getElementById("root")!).render(<App />);
