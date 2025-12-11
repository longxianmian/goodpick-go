import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function convertWebMToM4A(inputBuffer: Buffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const inputFile = path.join(tempDir, `input_${timestamp}.webm`);
  const outputFile = path.join(tempDir, `output_${timestamp}.m4a`);

  try {
    fs.writeFileSync(inputFile, inputBuffer);
    console.log(`🎵 [AudioConverter] Input file saved: ${inputFile} (${inputBuffer.length} bytes)`);

    const ffmpegCmd = `ffmpeg -y -i "${inputFile}" -c:a aac -b:a 128k "${outputFile}" 2>&1`;
    console.log(`🔄 [AudioConverter] Converting WebM to M4A...`);
    
    try {
      await execAsync(ffmpegCmd, { timeout: 30000 });
    } catch (ffmpegError: any) {
      console.error(`❌ [AudioConverter] ffmpeg conversion failed:`, ffmpegError.stderr || ffmpegError.message);
      throw new Error(`Audio conversion failed: ${ffmpegError.message}`);
    }

    if (!fs.existsSync(outputFile)) {
      throw new Error('ffmpeg conversion output file does not exist');
    }

    const m4aBuffer = fs.readFileSync(outputFile);
    console.log(`✅ [AudioConverter] Conversion complete: ${m4aBuffer.length} bytes`);

    return m4aBuffer;
  } finally {
    try {
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch (e) {
      console.warn('[AudioConverter] Cleanup warning:', e);
    }
  }
}
