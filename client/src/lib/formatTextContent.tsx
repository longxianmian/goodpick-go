/**
 * 格式化文本内容：智能识别段落、编号列表、符号列表
 * 
 * @param text 原始文本内容
 * @returns JSX元素数组，包含格式化后的段落和列表
 */
export function formatTextContent(text: string): JSX.Element[] {
  if (!text) return [];
  
  // 按双换行符分段
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((para, idx) => {
    // 检查是否是列表项
    const lines = para.split('\n').filter(line => line.trim());
    
    // 检查是否是编号列表（1）2）3. 等）
    const isNumberedList = lines.length > 1 && lines.every(line => 
      /^\s*\d+[.)）]/.test(line)
    );
    
    // 检查是否是符号列表（• - * 等）
    const isBulletList = !isNumberedList && lines.length > 1 && lines.every(line => 
      /^[•\-*]/.test(line)
    );
    
    if (isNumberedList) {
      // 编号列表使用 <ol>
      return (
        <ol key={idx} className="list-decimal list-inside space-y-1 ml-2">
          {lines.map((line, i) => (
            <li key={i} className="text-sm">
              {line.replace(/^\s*\d+[.)）]\s*/, '')}
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
              {line.replace(/^[•\-*]\s*/, '')}
            </li>
          ))}
        </ul>
      );
    }
    
    // 普通段落
    return (
      <p key={idx} className="text-sm leading-relaxed">
        {para}
      </p>
    );
  });
}
