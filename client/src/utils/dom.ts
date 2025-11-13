/**
 * DOM 安全操作工具函数
 * 用于防止生产环境中的 DOM 操作错误
 */

/**
 * 安全地从 DOM 树中移除节点
 * 在调用 removeChild 前检查父子关系，避免 "node to be removed is not a child" 错误
 * 
 * @param node - 要移除的 DOM 节点
 * 
 * @example
 * ```typescript
 * // 不安全的做法（可能在生产环境报错）
 * document.body.removeChild(portalEl);
 * 
 * // 安全的做法
 * import { safeRemove } from '@/utils/dom';
 * safeRemove(portalEl);
 * ```
 */
export function safeRemove(node: Node | null | undefined): void {
  try {
    if (!node) return;
    
    const parent = node.parentNode;
    
    // 检查父节点存在且确实包含该子节点
    if (parent && parent.contains(node)) {
      parent.removeChild(node);
    }
  } catch (error) {
    // 忽略重复删除或跨根节点分离的错误
    // 在生产环境中静默失败，避免白屏
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DOM] safeRemove 捕获到错误:', error);
    }
  }
}

/**
 * 安全地添加子节点到父节点
 * 在添加前检查节点是否已经是子节点，避免重复添加
 * 
 * @param parent - 父节点
 * @param child - 要添加的子节点
 * 
 * @example
 * ```typescript
 * import { safeAppend } from '@/utils/dom';
 * safeAppend(document.body, scriptElement);
 * ```
 */
export function safeAppend(
  parent: Node | null | undefined,
  child: Node | null | undefined
): void {
  try {
    if (!parent || !child) return;
    
    // 如果子节点已经在父节点中，先移除再添加（避免重复）
    if (parent.contains(child)) {
      parent.removeChild(child);
    }
    
    parent.appendChild(child);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DOM] safeAppend 捕获到错误:', error);
    }
  }
}
