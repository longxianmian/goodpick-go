import OSS from 'ali-oss';
import { Readable } from 'stream';

export class AliOssService {
  private client: OSS;

  constructor() {
    const region = process.env.OSS_REGION || 'oss-cn-hangzhou';
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.OSS_BUCKET;

    if (!accessKeyId || !accessKeySecret || !bucket) {
      throw new Error(
        'OSS credentials not configured. Please set OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, and OSS_BUCKET environment variables.'
      );
    }

    this.client = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
    });
  }

  /**
   * 上传文件到OSS
   * @param objectName - OSS中的对象名称/路径
   * @param buffer - 文件内容（Buffer）
   * @param contentType - 文件MIME类型
   * @returns 文件的公网访问URL
   */
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
          'x-oss-object-acl': 'public-read', // 设置为公共读
        },
      });

      // 返回文件URL
      // 阿里云OSS URL格式: https://{bucket}.{region}.aliyuncs.com/{objectName}
      return result.url;
    } catch (error) {
      console.error('OSS upload error:', error);
      throw new Error(`Failed to upload file to OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 删除OSS中的文件
   * @param objectName - OSS中的对象名称/路径
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.delete(objectName);
    } catch (error) {
      console.error('OSS delete error:', error);
      throw new Error(`Failed to delete file from OSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取文件的签名URL（用于临时访问私有文件）
   * @param objectName - OSS中的对象名称/路径
   * @param expiresInSeconds - 过期时间（秒），默认3600秒（1小时）
   * @returns 签名后的临时访问URL
   */
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

  /**
   * 检查文件是否存在
   * @param objectName - OSS中的对象名称/路径
   * @returns 文件是否存在
   */
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

  /**
   * 列出指定前缀的文件
   * @param prefix - 对象名称前缀
   * @param maxKeys - 最大返回数量
   * @returns 文件列表
   */
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
