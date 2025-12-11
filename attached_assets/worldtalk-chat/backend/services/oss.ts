import OSS from 'ali-oss';
import { nanoid } from 'nanoid';

// OSS配置 - 所有配置从环境变量读取
const OSS_CONFIG = {
  region: process.env.ALIYUN_OSS_REGION || '',
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.ALIYUN_OSS_BUCKET || '',
  // endpoint 从环境变量读取，自动添加 https:// 协议
  endpoint: process.env.ALIYUN_OSS_ENDPOINT 
    ? (process.env.ALIYUN_OSS_ENDPOINT.startsWith('https://') 
        ? process.env.ALIYUN_OSS_ENDPOINT 
        : `https://${process.env.ALIYUN_OSS_ENDPOINT}`)
    : '',
  secure: true, // 使用HTTPS
  timeout: 60000, // 60秒超时
};

/**
 * 创建OSS客户端
 */
export function createOSSClient(): OSS {
  // 验证所有必需的环境变量
  const missingVars: string[] = [];
  if (!OSS_CONFIG.accessKeyId) missingVars.push('ALIYUN_OSS_ACCESS_KEY_ID');
  if (!OSS_CONFIG.accessKeySecret) missingVars.push('ALIYUN_OSS_ACCESS_KEY_SECRET');
  if (!OSS_CONFIG.bucket) missingVars.push('ALIYUN_OSS_BUCKET');
  if (!OSS_CONFIG.region) missingVars.push('ALIYUN_OSS_REGION');
  if (!OSS_CONFIG.endpoint) missingVars.push('ALIYUN_OSS_ENDPOINT');
  
  if (missingVars.length > 0) {
    throw new Error(`OSS配置缺失：请检查环境变量 ${missingVars.join(', ')}`);
  }

  console.log('OSS客户端配置:', {
    region: OSS_CONFIG.region,
    bucket: OSS_CONFIG.bucket,
    endpoint: OSS_CONFIG.endpoint
  });

  return new OSS(OSS_CONFIG);
}

/**
 * 根据文件扩展名获取MIME类型
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'csv': 'text/csv',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'mp4': 'video/mp4',
    'txt': 'text/plain',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 上传文件到OSS
 * @param fileBuffer 文件Buffer
 * @param category 文件分类（按业务功能划分）
 * @param filename 文件名（可选，自动生成）
 * @returns OSS文件URL和路径
 * 
 * 路径规范：
 * - chat/voices/: 聊天语音消息
 * - chat/images/: 聊天图片消息
 * - chat/files/: 聊天文件消息
 * - merchant/: 商户Logo、门店图片
 * - content/: 刷刷图文/视频封面（未来扩展）
 * - video-hls/: HLS视频切片（未来扩展）
 */
export async function uploadToOSS(
  fileBuffer: Buffer,
  category: 'voices' | 'avatars' | 'languages' | 'misc' | 'images' | 'files' | 'videos',
  filename?: string
): Promise<{ url: string; ossPath: string }> {
  try {
    const client = createOSSClient();
    
    // 生成唯一文件名
    const ext = filename ? filename.split('.').pop() : 'bin';
    const uniqueFilename = filename || `${Date.now()}-${nanoid(8)}.${ext}`;
    
    // 构建OSS路径：按业务功能划分目录结构
    // chat/ 前缀用于所有聊天相关的媒体文件
    const categoryMap: Record<string, string> = {
      'voices': 'chat/voices',
      'images': 'chat/images', 
      'files': 'chat/files',
      'videos': 'dh/videos',  // 数字人生成的视频
      'avatars': 'user/avatars',
      'languages': 'system/languages',
      'misc': 'misc'
    };
    
    const pathPrefix = categoryMap[category] || 'misc';
    const ossPath = `${pathPrefix}/${uniqueFilename}`;
    
    // 获取正确的MIME类型
    const contentType = getMimeType(uniqueFilename);
    
    console.log('开始上传到OSS:', { 
      bucket: OSS_CONFIG.bucket,
      ossPath, 
      size: fileBuffer.length, 
      contentType 
    });
    
    // 上传到OSS（私有bucket，通过签名URL访问）
    const result = await client.put(ossPath, fileBuffer, {
      headers: {
        'Content-Type': contentType
      }
    });
    
    console.log('OSS上传成功:', { url: result.url, ossPath });
    
    return {
      url: result.url,
      ossPath: ossPath
    };
  } catch (error) {
    console.error('❌ OSS上传失败:', error);
    throw new Error(`OSS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 上传本地文件到OSS
 * @param localPath 本地文件路径
 * @param category 文件分类
 * @param filename 目标文件名（可选）
 */
export async function uploadFileToOSS(
  localPath: string,
  category: 'voices' | 'avatars' | 'languages' | 'misc' | 'images' | 'files',
  filename?: string
): Promise<{ url: string; ossPath: string }> {
  try {
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(localPath);
    
    return await uploadToOSS(fileBuffer, category, filename);
  } catch (error) {
    console.error('❌ 本地文件上传到OSS失败:', error);
    throw error;
  }
}

/**
 * 生成签名URL（用于临时访问私有文件）
 * @param ossPath OSS文件路径
 * @param expiresInSeconds 过期时间（秒），默认30天
 */
export async function generateSignedUrl(
  ossPath: string,
  expiresInSeconds: number = 2592000
): Promise<string> {
  try {
    const client = createOSSClient();
    
    // 生成基本签名URL
    const url = client.signatureUrl(ossPath, {
      expires: expiresInSeconds
    });
    
    // 阿里云OSS SDK返回的URL中包含HTML实体编码的&amp;，需要解码为&
    const decodedUrl = url.replace(/&amp;/g, '&');
    
    return decodedUrl;
  } catch (error) {
    console.error('❌ 生成签名URL失败:', error);
    throw error;
  }
}

/**
 * 从完整OSS URL中提取路径
 * @param url 完整的OSS URL
 * @returns OSS路径，如 "dh/videos/xxx.mp4"
 */
export function extractOssPath(url: string): string | null {
  if (!url) return null;
  
  try {
    // 匹配 OSS URL 格式: https://bucket.oss-region.aliyuncs.com/path/to/file
    const ossUrlPattern = /https?:\/\/[^\/]+\.oss[^\/]*\.aliyuncs\.com\/(.+?)(?:\?|$)/;
    const match = url.match(ossUrlPattern);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    
    // 如果已经是纯路径（不含域名），直接返回
    if (!url.startsWith('http')) {
      return url;
    }
    
    return null;
  } catch (error) {
    console.error('提取OSS路径失败:', error);
    return null;
  }
}

/**
 * 为媒体URL生成签名URL（如果需要）
 * @param url 原始URL（可能已签名或未签名）
 * @returns 签名后的URL
 */
export async function ensureSignedUrl(url: string): Promise<string> {
  if (!url) return url;
  
  // 如果已经有签名参数，返回原URL
  if (url.includes('OSSAccessKeyId=') || url.includes('Signature=')) {
    return url;
  }
  
  // 提取OSS路径
  const ossPath = extractOssPath(url);
  if (!ossPath) {
    return url; // 非OSS URL，返回原值
  }
  
  // 生成签名URL
  return await generateSignedUrl(ossPath);
}

/**
 * 删除OSS文件
 * @param ossPath OSS文件路径
 */
export async function deleteFromOSS(ossPath: string): Promise<void> {
  try {
    const client = createOSSClient();
    await client.delete(ossPath);
    console.log('OSS文件已删除:', ossPath);
  } catch (error) {
    console.error('❌ OSS文件删除失败:', error);
    throw error;
  }
}

/**
 * 批量删除OSS文件
 * @param ossPaths OSS文件路径数组
 */
export async function batchDeleteFromOSS(ossPaths: string[]): Promise<void> {
  try {
    const client = createOSSClient();
    await client.deleteMulti(ossPaths);
    console.log('OSS批量删除成功:', { count: ossPaths.length });
  } catch (error) {
    console.error('❌ OSS批量删除失败:', error);
    throw error;
  }
}

/**
 * 从OSS下载文件到本地临时文件
 * @param ossPath OSS文件路径（例如：yulink/voices/xxx.webm）
 * @returns 本地临时文件路径
 */
export async function downloadFromOSS(ossPath: string): Promise<string> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const client = createOSSClient();
    
    // 创建临时文件路径
    const tmpDir = os.tmpdir();
    const filename = path.basename(ossPath);
    const tmpPath = path.join(tmpDir, filename);
    
    console.log('从OSS下载文件:', { ossPath, tmpPath });
    
    // 从OSS获取文件
    const result = await client.get(ossPath);
    
    // 写入本地临时文件
    fs.writeFileSync(tmpPath, result.content);
    
    console.log('OSS文件已下载到本地:', tmpPath);
    
    return tmpPath;
  } catch (error) {
    console.error('❌ OSS文件下载失败:', error);
    throw new Error(`Failed to download from OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 检查文件是否存在
 * @param ossPath OSS文件路径
 */
export async function fileExistsInOSS(ossPath: string): Promise<boolean> {
  try {
    const client = createOSSClient();
    await client.head(ossPath);
    return true;
  } catch (error: any) {
    if (error.code === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

/**
 * 从OSS获取文件流（用于代理传输）
 * @param ossPath OSS文件路径
 * @returns 文件内容Buffer和MIME类型
 */
export async function streamFromOSS(ossPath: string): Promise<{ content: Buffer; contentType: string; contentLength: number }> {
  try {
    const client = createOSSClient();
    const result = await client.get(ossPath);
    
    const ext = ossPath.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    
    return {
      content: result.content as Buffer,
      contentType: mimeTypes[ext] || 'application/octet-stream',
      contentLength: (result.content as Buffer).length
    };
  } catch (error) {
    console.error('❌ OSS流式读取失败:', error);
    throw new Error(`Failed to stream from OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
