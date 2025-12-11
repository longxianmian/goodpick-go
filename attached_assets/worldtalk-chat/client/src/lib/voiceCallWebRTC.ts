// client/src/lib/voiceCallWebRTC.ts
type VoiceCallCallbacks = {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (err: unknown) => void;
};

export class VoiceCallWebRTC {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: VoiceCallCallbacks;

  constructor(callbacks: VoiceCallCallbacks) {
    this.callbacks = callbacks;
  }

  async init(isCaller: boolean) {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.callbacks.onIceCandidate) {
        this.callbacks.onIceCandidate(event.candidate.toJSON());
      }
    };

    this.pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream && this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(stream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(this.pc.connectionState);
      }
    };

    // 获取本地音频
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });

    if (this.callbacks.onLocalStream) {
      this.callbacks.onLocalStream(this.localStream);
    }

    if (isCaller) {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      return offer;
    }

    return null;
  }

  async handleRemoteOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleRemoteAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    await this.pc.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  toggleMute(muted: boolean) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  destroy() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
