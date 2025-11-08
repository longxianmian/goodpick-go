/**
 * 格式化文本内容：智能识别段落、编号列表、符号列表
 * 支持多种编号格式（1. 1) 1） ①等，空格可选）和符号（• - * → 等）
 * 
 * @param text 原始文本内容
 * @returns JSX元素数组，包含格式化后的段落和列表
 */
export function formatTextContent(text: string): JSX.Element[] {
  if (!text || typeof text !== 'string') return [];
  
  // 安全处理：如果包含HTML标签，将其转义为纯文本显示（避免XSS）
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
  // 检测是否包含HTML - 如果有，转义后显示
  if (/<[^>]+>/.test(text)) {
    return [
      <p key="escaped-html" className="text-sm leading-relaxed whitespace-pre-wrap">
        {escapeHtml(text)}
      </p>
    ];
  }
  
  // 按双换行符分段
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  return paragraphs.map((para, idx) => {
    // 检查是否是列表项
    const lines = para.split('\n').filter(line => line.trim());
    
    // 增强的编号列表检测：支持空格可选的格式
    // 支持："1. " "1." "1) " "1)" "1）" "1）文字" "①" 等
    const numberedListPattern = /^\s*(\d+[.)）]|[①②③④⑤⑥⑦⑧⑨⑩])\s*/;
    const isNumberedList = lines.length > 1 && lines.every(line => 
      numberedListPattern.test(line)
    );
    
    // 增强的符号列表检测：支持空格可选
    // 支持："• " "•" "- " "-" "* " etc.
    const bulletListPattern = /^\s*[•\-*→▪▸]\s*/;
    const isBulletList = !isNumberedList && lines.length > 1 && lines.every(line => 
      bulletListPattern.test(line)
    );
    
    if (isNumberedList) {
      // 编号列表使用 <ol>
      return (
        <ol key={idx} className="list-decimal list-inside space-y-1 ml-2">
          {lines.map((line, i) => (
            <li key={i} className="text-sm">
              {line.replace(numberedListPattern, '').trim()}
            </li>
          ))}
        </ol>
      );
    }
    
    if (isBulletList) {
      // 符号列表使用 <ul>
      return (
        <ul key={idx} className="list-disc list-inside space-y-1 ml-2">
          {lines.map((line, i) => (
            <li key={i} className="text-sm">
              {line.replace(bulletListPattern, '').trim()}
            </li>
          ))}
        </ul>
      );
    }
    
    // 普通段落 - 保留换行
    return (
      <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap">
        {para.trim()}
      </p>
    );
  });
}
