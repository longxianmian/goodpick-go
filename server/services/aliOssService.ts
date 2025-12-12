import OSS from 'ali-oss';
import { Readable } from 'stream';

export class AliOssService {
  private client: OSS;
  private publicBaseUrl: string;

  constructor() {
    let region = process.env.OSS_REGION || process.env.ALI_OSS_REGION || 'oss-ap-southeast-1';
    
    // 确保region格式正确（需要oss-前缀）
    // 如果region不包含'oss-'前缀，自动添加
    if (!region.startsWith('oss-')) {
      region = `oss-${region}`;
    }
    
    const endpoint = process.env.OSS_ENDPOINT || process.env.ALI_OSS_ENDPOINT;
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID || process.env.ALI_OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || process.env.ALI_OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.OSS_BUCKET || process.env.ALI_OSS_BUCKET;
    this.publicBaseUrl = process.env.OSS_PUBLIC_BASE_URL || process.env.ALI_OSS_PUBLIC_BASE_URL || '';

    if (!accessKeyId || !accessKeySecret || !bucket) {
      throw new Error(
        'OSS credentials not configured. Please set OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, and OSS_BUCKET environment variables.'
      );
    }

    console.log(`[OSS Config] Region: ${region}, Bucket: ${bucket}, Endpoint: ${endpoint || 'auto'}`);

    this.client = new OSS({
      region,
      endpoint,
      accessKeyId,
      accessKeySecret,
      bucket,
    });
  }

  async uploadFile(
    objectName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      const stream = Readable.from(buffer);
      
      const result = await this.client.putStream(objectName, stream, {
        headers: {
          'Content-Type': contentType,
          'x-oss-object-acl': 'public-read',
        },
      });

      if (this.publicBaseUrl) {
        return `${this.publicBaseUrl}/${objectName}`;
      }
      return result.url;
    } catch (error) {
      console.error('OSS upload error:', error);
      throw new Error(`Failed to upload file to OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.delete(objectName);
    } catch (error) {
      console.error('OSS delete error:', error);
      throw new Error(`Failed to delete file from OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedUrl(objectName: string, expiresInSeconds: number = 3600): Promise<string> {
    try {
      const url = this.client.signatureUrl(objectName, {
        expires: expiresInSeconds,
      });
      return url;
    } catch (error) {
      console.error('OSS signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStreamableVideoUrl(objectName: string, expiresInSeconds: number = 3600): Promise<string> {
    try {
      const url = this.client.signatureUrl(objectName, {
        expires: expiresInSeconds,
        response: {
          'content-disposition': 'inline',
          'content-type': 'video/mp4'
        }
      });
      return url;
    } catch (error) {
      console.error('OSS streamable video URL error:', error);
      throw new Error(`Failed to generate streamable video URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 生成 HLS 流式转码播放 URL（边转边播）
   * 阿里云 OSS 配合 IMM 实现实时转码，无需预先转码整个视频
   * 
   * @param objectName 视频对象名称（原始 MP4 文件）
   * @param expiresInSeconds URL 有效期（秒）
   * @returns HLS m3u8 播放 URL
   */
  async getHlsStreamUrl(objectName: string, expiresInSeconds: number = 7200): Promise<string> {
    try {
      // 使用 OSS 的边转边播功能
      // x-oss-process=hls/sign,live_1 表示启用 HLS 实时转码并签名
      const url = this.client.signatureUrl(objectName, {
        expires: expiresInSeconds,
        process: 'hls/sign,live_1',
      });
      return url;
    } catch (error) {
      console.error('OSS HLS stream URL error:', error);
      throw new Error(`Failed to generate HLS stream URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 构建静态 HLS URL（用于存储到数据库）
   * 此 URL 需要在播放时动态签名
   * 
   * @param objectName 视频对象名称
   * @returns 基础 HLS URL（不含签名）
   */
  buildHlsBaseUrl(objectName: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${objectName}?x-oss-process=hls/sign,live_1`;
    }
    const bucket = process.env.OSS_BUCKET || process.env.ALI_OSS_BUCKET;
    let region = process.env.OSS_REGION || process.env.ALI_OSS_REGION || 'oss-ap-southeast-1';
    if (!region.startsWith('oss-')) {
      region = `oss-${region}`;
    }
    return `https://${bucket}.${region}.aliyuncs.com/${objectName}?x-oss-process=hls/sign,live_1`;
  }

  async getObject(objectName: string): Promise<OSS.GetObjectResult> {
    try {
      return await this.client.get(objectName);
    } catch (error) {
      console.error('OSS get object error:', error);
      throw new Error(`Failed to get object from OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.client.head(objectName);
      return true;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  async listFiles(prefix: string = '', maxKeys: number = 100): Promise<OSS.ObjectMeta[]> {
    try {
      const result = await this.client.list({
        prefix,
        'max-keys': maxKeys,
      });
      return result.objects || [];
    } catch (error) {
      console.error('OSS list error:', error);
      throw new Error(`Failed to list files from OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
