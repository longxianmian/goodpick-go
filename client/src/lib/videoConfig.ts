/**
 * 视频播放器配置
 * 
 * Feature Flags 控制视频播放策略
 */

export interface VideoMetrics {
  videoId: number;
  firstFrameMs: number;      // 首帧时间
  canplayMs: number;         // canplay 事件时间
  waitingCount: number;      // waiting 事件次数（卡顿）
  droppedFrames: number;     // 丢帧数
  source: 'hls' | 'mp4' | 'native-hls';
  preloaded: boolean;
  timestamp: number;
}

interface VideoConfig {
  /**
   * 视频播放策略
   * - 'preloader': 使用 videoPreloader（默认，稳定）
   * - 'pool': 使用 useVideoPool（实验性，DOM复用）
   */
  strategy: 'preloader' | 'pool';
  
  /**
   * 是否启用详细日志
   */
  debugMode: boolean;
  
  /**
   * 是否收集性能指标
   */
  collectMetrics: boolean;
}

// 从 URL 参数或 localStorage 读取配置
function getConfig(): VideoConfig {
  const urlParams = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search) 
    : null;
  
  // URL 参数优先级最高
  const strategyParam = urlParams?.get('videoStrategy');
  const debugParam = urlParams?.get('debugVideo');
  
  // localStorage 作为持久化配置
  const storedStrategy = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('videoStrategy') 
    : null;
  
  return {
    strategy: (strategyParam || storedStrategy || 'preloader') as 'preloader' | 'pool',
    debugMode: debugParam === '1',
    collectMetrics: true, // 始终收集指标
  };
}

// 单例配置
let _config: VideoConfig | null = null;

export function getVideoConfig(): VideoConfig {
  if (!_config) {
    _config = getConfig();
  }
  return _config;
}

/**
 * 设置视频播放策略
 * @param strategy 'preloader' | 'pool'
 * 
 * 启用方式：
 * 1. URL 参数: ?videoStrategy=pool
 * 2. 控制台: setVideoStrategy('pool')
 * 3. localStorage: localStorage.setItem('videoStrategy', 'pool')
 */
export function setVideoStrategy(strategy: 'preloader' | 'pool'): void {
  localStorage.setItem('videoStrategy', strategy);
  _config = null; // 重置配置
  console.log(`[VideoConfig] Strategy set to: ${strategy}. Refresh page to apply.`);
}

// 指标存储
const metricsStore: VideoMetrics[] = [];
const MAX_METRICS = 100;

export function recordVideoMetrics(metrics: VideoMetrics): void {
  metricsStore.push(metrics);
  
  // 限制存储数量
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }
  
  const config = getVideoConfig();
  if (config.debugMode) {
    console.log('[VideoMetrics]', {
      videoId: metrics.videoId,
      firstFrame: `${metrics.firstFrameMs.toFixed(0)}ms`,
      canplay: `${metrics.canplayMs.toFixed(0)}ms`,
      waiting: metrics.waitingCount,
      dropped: metrics.droppedFrames,
      source: metrics.source,
      preloaded: metrics.preloaded,
    });
  }
}

export function getVideoMetrics(): VideoMetrics[] {
  return [...metricsStore];
}

export function getMetricsSummary(): {
  count: number;
  avgFirstFrame: number;
  avgCanplay: number;
  totalWaiting: number;
  totalDropped: number;
} {
  if (metricsStore.length === 0) {
    return { count: 0, avgFirstFrame: 0, avgCanplay: 0, totalWaiting: 0, totalDropped: 0 };
  }
  
  const sum = metricsStore.reduce((acc, m) => ({
    firstFrame: acc.firstFrame + m.firstFrameMs,
    canplay: acc.canplay + m.canplayMs,
    waiting: acc.waiting + m.waitingCount,
    dropped: acc.dropped + m.droppedFrames,
  }), { firstFrame: 0, canplay: 0, waiting: 0, dropped: 0 });
  
  return {
    count: metricsStore.length,
    avgFirstFrame: sum.firstFrame / metricsStore.length,
    avgCanplay: sum.canplay / metricsStore.length,
    totalWaiting: sum.waiting,
    totalDropped: sum.dropped,
  };
}

// 暴露到全局方便调试
if (typeof window !== 'undefined') {
  (window as any).setVideoStrategy = setVideoStrategy;
  (window as any).getVideoMetrics = getVideoMetrics;
  (window as any).getMetricsSummary = getMetricsSummary;
}
