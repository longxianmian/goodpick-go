import OSS from 'ali-oss';
import { Readable } from 'stream';

export class AliOssService {
  private client: OSS;
  private publicBaseUrl: string;

  constructor() {
    const region = process.env.OSS_REGION || process.env.ALI_OSS_REGION || 'oss-ap-southeast-1';
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
