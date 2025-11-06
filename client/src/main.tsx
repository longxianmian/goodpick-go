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
