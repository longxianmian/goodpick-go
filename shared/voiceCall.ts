// shared/voiceCall.ts
// P2P 通话类型定义

export type CallType = 'voice' | 'video';

export type CallPhase = 
  | 'idle'
  | 'requesting-permission'
  | 'dialing'
  | 'ringing'
  | 'connecting'
  | 'in-call'
  | 'reconnecting';

export interface CallState {
  phase: CallPhase;
  callId: string | null;
  callType: CallType;
  peerUserId: string | null;
  peerUserName?: string;
  peerAvatar?: string;
  isCaller: boolean;
  muted: boolean;
  videoEnabled: boolean;
  speakerOn: boolean;
  beautyEnabled: boolean;
  startedAt?: number;
  error?: string;
}

export interface CallOfferPayload {
  callId: string;
  callType: CallType;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
  sdp: string;
}

export interface CallAnswerPayload {
  callId: string;
  callType: CallType;
  fromUserId: string;
  toUserId: string;
  sdp: string;
}

export interface CallIceCandidatePayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface CallEndPayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  reason: string;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallStats {
  bitrate: number;
  packetsLost: number;
  roundTripTime: number;
  audioLevel: number;
}
