// client/src/lib/callWebRTC.ts
// P2P 通话引擎 - 支持语音和视频通话

import type { CallType, IceServerConfig, CallStats } from '@shared/voiceCall';

type CallCallbacks = {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onStats?: (stats: CallStats) => void;
  onError?: (err: unknown) => void;
};

type CallOptions = {
  callType: CallType;
  iceServers?: IceServerConfig[];
};

const DEFAULT_ICE_SERVERS: IceServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class CallWebRTC {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callbacks: CallCallbacks;
  private options: CallOptions;
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private iceCandidateBuffer: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet = false;

  constructor(callbacks: CallCallbacks, options: CallOptions) {
    this.callbacks = callbacks;
    this.options = options;
  }

  async init(isCaller: boolean): Promise<RTCSessionDescriptionInit | null> {
    const iceServers = this.options.iceServers || DEFAULT_ICE_SERVERS;
    
    this.pc = new RTCPeerConnection({
      iceServers: iceServers.map(server => ({
        urls: server.urls,
        username: server.username,
        credential: server.credential,
      })),
      iceCandidatePoolSize: 10,
    });

    this.setupPeerConnectionHandlers();

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      const videoConstraints: MediaTrackConstraints | boolean = this.options.callType === 'video' ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30 },
        facingMode: 'user',
      } : false;

      const constraints: MediaStreamConstraints = {
        audio: audioConstraints,
        video: videoConstraints,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC] Got local stream:', {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
      });

      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      this.startStatsCollection();

      if (isCaller) {
        const offer = await this.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.options.callType === 'video',
        });
        await this.pc.setLocalDescription(offer);
        return offer;
      }

      return null;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private setupPeerConnectionHandlers() {
    if (!this.pc) return;

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.callbacks.onIceCandidate) {
        this.callbacks.onIceCandidate(event.candidate.toJSON());
      }
    };

    this.pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.remoteStream = stream;
        console.log('[WebRTC] Got remote stream:', {
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
        });
        if (this.callbacks.onRemoteStream) {
          this.callbacks.onRemoteStream(stream);
        }
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.callbacks.onConnectionStateChange) {
        const state = this.pc.connectionState;
        console.log('[WebRTC] Connection state:', state);
        this.callbacks.onConnectionStateChange(state);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc) {
        console.log('[WebRTC] ICE connection state:', this.pc.iceConnectionState);
        if (this.callbacks.onIceConnectionStateChange) {
          this.callbacks.onIceConnectionStateChange(this.pc.iceConnectionState);
        }
      }
    };

    this.pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering state:', this.pc?.iceGatheringState);
    };

    this.pc.onnegotiationneeded = () => {
      console.log('[WebRTC] Negotiation needed');
    };
  }

  async handleRemoteOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.isRemoteDescriptionSet = true;
    
    await this.flushIceCandidateBuffer();
    
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    this.isRemoteDescriptionSet = true;
    
    await this.flushIceCandidateBuffer();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      console.warn('[WebRTC] Cannot add ICE candidate: no PeerConnection');
      return;
    }
    
    if (!this.isRemoteDescriptionSet) {
      console.log('[WebRTC] Buffering ICE candidate (remote description not set yet)');
      this.iceCandidateBuffer.push(candidate);
      return;
    }
    
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn('[WebRTC] Failed to add ICE candidate:', error);
    }
  }

  private async flushIceCandidateBuffer(): Promise<void> {
    if (this.iceCandidateBuffer.length === 0) return;
    
    console.log(`[WebRTC] Flushing ${this.iceCandidateBuffer.length} buffered ICE candidates`);
    
    for (const candidate of this.iceCandidateBuffer) {
      try {
        await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('[WebRTC] Failed to add buffered ICE candidate:', error);
      }
    }
    
    this.iceCandidateBuffer = [];
  }

  toggleMute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  async switchCamera(): Promise<void> {
    if (this.options.callType !== 'video' || !this.localStream) return;

    const currentTrack = this.localStream.getVideoTracks()[0];
    if (!currentTrack) return;

    const settings = currentTrack.getSettings();
    const newFacingMode = settings.facingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
        },
      });

      const newTrack = newStream.getVideoTracks()[0];
      
      const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      currentTrack.stop();
      this.localStream.removeTrack(currentTrack);
      this.localStream.addTrack(newTrack);

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }
    } catch (error) {
      console.error('[WebRTC] Failed to switch camera:', error);
    }
  }

  private startStatsCollection(): void {
    if (this.statsInterval) return;

    this.statsInterval = setInterval(async () => {
      if (!this.pc || !this.callbacks.onStats) return;

      try {
        const stats = await this.pc.getStats();
        let bitrate = 0;
        let packetsLost = 0;
        let roundTripTime = 0;
        let audioLevel = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp') {
            packetsLost += report.packetsLost || 0;
            if (report.kind === 'audio') {
              audioLevel = report.audioLevel || 0;
            }
          } else if (report.type === 'outbound-rtp') {
            const bytes = report.bytesSent || 0;
            bitrate = bytes * 8 / 1000;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            roundTripTime = report.currentRoundTripTime || 0;
          }
        });

        this.callbacks.onStats({
          bitrate,
          packetsLost,
          roundTripTime,
          audioLevel,
        });
      } catch (error) {
        console.warn('[WebRTC] Failed to get stats:', error);
      }
    }, 1000);
  }

  private handleError(error: unknown): void {
    console.error('[WebRTC] Error:', error);
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  cleanup(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    this.iceCandidateBuffer = [];
    this.isRemoteDescriptionSet = false;
    
    console.log('[WebRTC] Cleaned up');
  }
}
