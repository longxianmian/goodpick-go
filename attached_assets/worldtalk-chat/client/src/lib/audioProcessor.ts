// client/src/lib/audioProcessor.ts
// 音频处理管线 - 回声消除增强、降噪、噪声门

export type AudioProcessorOptions = {
  noiseGateThreshold?: number; // 噪声门阈值 (dB)，低于此值静音
  compressorThreshold?: number; // 压缩器阈值 (dB)
  compressorRatio?: number; // 压缩比
  highpassFrequency?: number; // 高通滤波器频率 (Hz)
  lowpassFrequency?: number; // 低通滤波器频率 (Hz)
};

const DEFAULT_OPTIONS: Required<AudioProcessorOptions> = {
  noiseGateThreshold: -50, // -50dB 以下视为噪声
  compressorThreshold: -24, // 压缩阈值
  compressorRatio: 4, // 4:1 压缩比
  highpassFrequency: 80, // 过滤 80Hz 以下低频噪声
  lowpassFrequency: 8000, // 过滤 8kHz 以上高频噪声（电话质量）
};

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private gainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private noiseGateInterval: ReturnType<typeof setInterval> | null = null;
  private options: Required<AudioProcessorOptions>;
  private isProcessing = false;

  constructor(options: AudioProcessorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async processStream(inputStream: MediaStream): Promise<MediaStream> {
    if (this.isProcessing) {
      console.warn('[AudioProcessor] Already processing a stream');
      return inputStream;
    }

    const audioTrack = inputStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('[AudioProcessor] No audio track in stream');
      return inputStream;
    }

    try {
      this.audioContext = new AudioContext({ 
        sampleRate: 48000,
        latencyHint: 'interactive' 
      });

      // 创建音频源节点
      this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);

      // 创建高通滤波器 - 过滤低频噪声（空调声、风噪等）
      this.highpassFilter = this.audioContext.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.value = this.options.highpassFrequency;
      this.highpassFilter.Q.value = 0.7;

      // 创建低通滤波器 - 过滤高频噪声
      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = this.options.lowpassFrequency;
      this.lowpassFilter.Q.value = 0.7;

      // 创建动态压缩器 - 控制音量范围，防止爆音
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      this.compressorNode.threshold.value = this.options.compressorThreshold;
      this.compressorNode.knee.value = 30;
      this.compressorNode.ratio.value = this.options.compressorRatio;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.25;

      // 创建增益节点 - 用于噪声门
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1;

      // 创建分析器节点 - 用于检测音量
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;

      // 创建输出节点
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      // 连接音频处理链
      // 源 -> 高通滤波 -> 低通滤波 -> 压缩器 -> 增益(噪声门) -> 分析器 -> 输出
      this.sourceNode.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.compressorNode);
      this.compressorNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.destinationNode);

      // 启动噪声门
      this.startNoiseGate();

      this.isProcessing = true;

      // 返回处理后的音频流，保留原始视频轨道
      const processedStream = this.destinationNode.stream;
      
      // 添加原始视频轨道
      inputStream.getVideoTracks().forEach(track => {
        processedStream.addTrack(track);
      });

      console.log('[AudioProcessor] Audio processing pipeline started');
      return processedStream;

    } catch (error) {
      console.error('[AudioProcessor] Failed to create audio pipeline:', error);
      return inputStream; // 失败时返回原始流
    }
  }

  private startNoiseGate(): void {
    if (!this.analyserNode || !this.gainNode) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const thresholdLinear = Math.pow(10, this.options.noiseGateThreshold / 20);

    this.noiseGateInterval = setInterval(() => {
      if (!this.analyserNode || !this.gainNode) return;

      this.analyserNode.getByteFrequencyData(dataArray);
      
      // 计算平均音量
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength / 255; // 归一化到 0-1

      // 噪声门逻辑：低于阈值时降低增益
      const targetGain = average > thresholdLinear ? 1 : 0.05;
      
      // 平滑过渡，避免咔嗒声
      const currentGain = this.gainNode.gain.value;
      const smoothingFactor = targetGain > currentGain ? 0.3 : 0.1; // 开门快，关门慢
      this.gainNode.gain.value = currentGain + (targetGain - currentGain) * smoothingFactor;

    }, 20); // 50Hz 更新率
  }

  stop(): void {
    if (this.noiseGateInterval) {
      clearInterval(this.noiseGateInterval);
      this.noiseGateInterval = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.compressorNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.destinationNode = null;
    this.isProcessing = false;

    console.log('[AudioProcessor] Audio processing stopped');
  }

  // 动态调整噪声门阈值
  setNoiseGateThreshold(threshold: number): void {
    this.options.noiseGateThreshold = threshold;
  }

  // 获取当前音量级别
  getAudioLevel(): number {
    if (!this.analyserNode) return 0;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    return sum / bufferLength / 255;
  }
}
