// client/src/hooks/use-call.ts
// P2P 通话管理 Hook

import { useState, useCallback, useRef, useEffect } from 'react';
import { CallWebRTC } from '@/lib/callWebRTC';
import type { 
  CallType, 
  CallPhase, 
  CallState, 
  CallOfferPayload, 
  CallAnswerPayload, 
  CallIceCandidatePayload,
  CallEndPayload,
  IceServerConfig 
} from '@shared/voiceCall';

export type CallRecordData = {
  callType: 'voice' | 'video';
  status: 'missed' | 'answered' | 'rejected' | 'cancelled' | 'failed';
  duration: number; // 通话时长（秒）
  timestamp: string;
};

type UseCallOptions = {
  currentUserId: string;
  sendMessage: (message: any) => boolean;
  onCallEnded?: (reason: string) => void;
  onSaveCallRecord?: (peerId: string, callData: CallRecordData) => void;
};

const generateCallId = () => `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function useCall({ currentUserId, sendMessage, onCallEnded, onSaveCallRecord }: UseCallOptions) {
  const [callState, setCallState] = useState<CallState>({
    phase: 'idle',
    callId: null,
    callType: 'voice',
    peerUserId: null,
    isCaller: false,
    muted: false,
    videoEnabled: true,
    speakerOn: true,
    beautyEnabled: true, // 默认开启美颜
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [iceServers, setIceServers] = useState<IceServerConfig[]>([]);

  const webrtcRef = useRef<CallWebRTC | null>(null);
  const pendingOfferRef = useRef<CallOfferPayload | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 使用 ref 存储关键状态，避免闭包问题
  const callIdRef = useRef<string | null>(null);
  const peerUserIdRef = useRef<string | null>(null);
  const phaseRef = useRef<CallPhase>('idle');
  const callTypeRef = useRef<CallType>('voice');
  const startedAtRef = useRef<number | null>(null);
  const isCallerRef = useRef<boolean>(false);
  
  // 同步状态到 ref
  callIdRef.current = callState.callId;
  peerUserIdRef.current = callState.peerUserId;
  phaseRef.current = callState.phase;
  callTypeRef.current = callState.callType;
  startedAtRef.current = callState.startedAt || null;
  isCallerRef.current = callState.isCaller;

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.autoplay = true;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (remoteStream && audioRef.current) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const cleanup = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    pendingOfferRef.current = null;
    
    setCallState({
      phase: 'idle',
      callId: null,
      callType: 'voice',
      peerUserId: null,
      isCaller: false,
      muted: false,
      videoEnabled: true,
      speakerOn: true,
      beautyEnabled: true,
    });
  }, []);

  const startCall = useCallback(async (
    peerId: string, 
    peerName: string, 
    peerAvatar: string | undefined,
    callType: CallType
  ) => {
    if (callState.phase !== 'idle') {
      console.warn('[useCall] Already in a call');
      return;
    }

    const callId = generateCallId();
    
    setCallState({
      phase: 'requesting-permission',
      callId,
      callType,
      peerUserId: peerId,
      peerUserName: peerName,
      peerAvatar,
      isCaller: true,
      muted: false,
      videoEnabled: callType === 'video',
      speakerOn: true,
      beautyEnabled: callType === 'video', // 视频通话默认开启美颜
    });

    try {
      webrtcRef.current = new CallWebRTC(
        {
          onLocalStream: setLocalStream,
          onRemoteStream: setRemoteStream,
          onIceCandidate: (candidate) => {
            sendMessage({
              type: 'call-ice-candidate',
              payload: {
                callId,
                fromUserId: currentUserId,
                toUserId: peerId,
                candidate,
              } as CallIceCandidatePayload,
            });
          },
          onConnectionStateChange: (state) => {
            console.log('[useCall] Connection state:', state);
            if (state === 'connected') {
              setCallState(prev => ({ 
                ...prev, 
                phase: 'in-call',
                startedAt: prev.startedAt || Date.now(),
              }));
            } else if (state === 'disconnected') {
              // 临时断开，显示重连状态但不终止通话
              setCallState(prev => ({ ...prev, phase: 'reconnecting' }));
            } else if (state === 'failed') {
              // 彻底失败才终止
              endCall('failed');
            }
          },
          onError: (error) => {
            console.error('[useCall] WebRTC error:', error);
            setCallState(prev => ({ ...prev, error: String(error) }));
          },
        },
        { callType, iceServers }
      );

      setCallState(prev => ({ ...prev, phase: 'dialing' }));

      const offer = await webrtcRef.current.init(true);
      
      if (offer) {
        sendMessage({
          type: 'call-offer',
          payload: {
            callId,
            callType,
            fromUserId: currentUserId,
            toUserId: peerId,
            createdAt: new Date().toISOString(),
            sdp: offer.sdp!,
          } as CallOfferPayload,
        });

        callTimeoutRef.current = setTimeout(() => {
          // 使用 ref 获取最新状态，避免闭包问题
          const currentPhase = phaseRef.current;
          if (currentPhase === 'dialing' || currentPhase === 'ringing') {
            endCall('timeout');
          }
        }, 60000);
      }
    } catch (error) {
      console.error('[useCall] Failed to start call:', error);
      setCallState(prev => ({ 
        ...prev, 
        phase: 'idle',
        error: error instanceof Error ? error.message : 'Failed to start call',
      }));
      cleanup();
    }
  }, [callState.phase, currentUserId, iceServers, sendMessage, cleanup]);

  const handleIncomingCall = useCallback((payload: CallOfferPayload, peerName?: string, peerAvatar?: string) => {
    if (callState.phase !== 'idle') {
      sendMessage({
        type: 'call-busy',
        payload: {
          callId: payload.callId,
          fromUserId: currentUserId,
          toUserId: payload.fromUserId,
          reason: 'busy',
        } as CallEndPayload,
      });
      return;
    }

    pendingOfferRef.current = payload;
    
    setCallState({
      phase: 'ringing',
      callId: payload.callId,
      callType: payload.callType || 'voice',
      peerUserId: payload.fromUserId,
      peerUserName: peerName,
      peerAvatar,
      isCaller: false,
      muted: false,
      videoEnabled: payload.callType === 'video',
      speakerOn: true,
      beautyEnabled: payload.callType === 'video', // 视频通话默认开启美颜
    });

    callTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === 'ringing') {
        rejectCall();
      }
    }, 30000);
    
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [callState.phase, currentUserId, sendMessage]);

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer || callState.phase !== 'ringing') return;

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    setCallState(prev => ({ ...prev, phase: 'connecting' }));

    try {
      webrtcRef.current = new CallWebRTC(
        {
          onLocalStream: setLocalStream,
          onRemoteStream: setRemoteStream,
          onIceCandidate: (candidate) => {
            sendMessage({
              type: 'call-ice-candidate',
              payload: {
                callId: offer.callId,
                fromUserId: currentUserId,
                toUserId: offer.fromUserId,
                candidate,
              } as CallIceCandidatePayload,
            });
          },
          onConnectionStateChange: (state) => {
            console.log('[useCall] Connection state:', state);
            if (state === 'connected') {
              setCallState(prev => ({ 
                ...prev, 
                phase: 'in-call',
                startedAt: prev.startedAt || Date.now(),
              }));
            } else if (state === 'disconnected') {
              // 临时断开，显示重连状态但不终止通话
              setCallState(prev => ({ ...prev, phase: 'reconnecting' }));
            } else if (state === 'failed') {
              // 彻底失败才终止
              endCall('failed');
            }
          },
          onError: (error) => {
            console.error('[useCall] WebRTC error:', error);
            setCallState(prev => ({ ...prev, error: String(error) }));
          },
        },
        { callType: offer.callType || 'voice', iceServers }
      );

      await webrtcRef.current.init(false);
      
      const answer = await webrtcRef.current.handleRemoteOffer({
        type: 'offer',
        sdp: offer.sdp,
      });

      sendMessage({
        type: 'call-answer',
        payload: {
          callId: offer.callId,
          callType: offer.callType || 'voice',
          fromUserId: currentUserId,
          toUserId: offer.fromUserId,
          sdp: answer.sdp!,
        } as CallAnswerPayload,
      });

    } catch (error) {
      console.error('[useCall] Failed to accept call:', error);
      setCallState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to accept call',
      }));
      cleanup();
    }
  }, [callState.phase, currentUserId, iceServers, sendMessage, cleanup]);

  const rejectCall = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    if (callState.peerUserId && callState.callId) {
      sendMessage({
        type: 'call-reject',
        payload: {
          callId: callState.callId,
          fromUserId: currentUserId,
          toUserId: callState.peerUserId,
          reason: 'rejected',
        } as CallEndPayload,
      });

      // 保存拒绝通话记录
      if (onSaveCallRecord) {
        console.log('[useCall] Saving rejected call record');
        onSaveCallRecord(callState.peerUserId, {
          callType: callState.callType,
          status: 'rejected',
          duration: 0,
          timestamp: new Date().toISOString(),
        });
      }
    }

    cleanup();
  }, [callState.callId, callState.peerUserId, callState.callType, currentUserId, sendMessage, cleanup, onSaveCallRecord]);

  const endCall = useCallback((reason: string = 'hungup') => {
    // 使用 ref 获取最新状态，避免闭包问题
    const currentCallId = callIdRef.current;
    const currentPeerId = peerUserIdRef.current;
    const currentPhase = phaseRef.current;
    const currentCallType = callTypeRef.current;
    const currentStartedAt = startedAtRef.current;
    const isCaller = isCallerRef.current;
    
    // 防止重复调用
    if (currentPhase === 'idle') {
      console.log('[useCall] Already idle, skip endCall');
      return;
    }

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    // 发送结束信令（只发一次）
    if (currentPeerId && currentCallId) {
      sendMessage({
        type: 'call-end',
        payload: {
          callId: currentCallId,
          fromUserId: currentUserId,
          toUserId: currentPeerId,
          reason,
        } as CallEndPayload,
      });
    }

    // 保存通话记录
    if (currentPeerId && onSaveCallRecord) {
      // 计算通话时长
      const duration = currentStartedAt 
        ? Math.floor((Date.now() - currentStartedAt) / 1000)
        : 0;
      
      // 确定通话状态
      let status: CallRecordData['status'];
      if (duration > 0 && currentPhase === 'in-call') {
        status = 'answered';
      } else if (reason === 'rejected') {
        status = 'rejected';
      } else if (reason === 'timeout' && !isCaller) {
        status = 'missed';
      } else if (reason === 'failed') {
        status = 'failed';
      } else if (isCaller && (reason === 'hungup' || reason === 'timeout')) {
        status = 'cancelled';
      } else {
        status = 'missed';
      }

      console.log('[useCall] Saving call record:', { 
        peerId: currentPeerId, 
        callType: currentCallType, 
        status, 
        duration,
        reason,
        phase: currentPhase 
      });

      onSaveCallRecord(currentPeerId, {
        callType: currentCallType,
        status,
        duration,
        timestamp: new Date().toISOString(),
      });
    }

    // 立即清理，不延迟
    cleanup();
    onCallEnded?.(reason);
  }, [currentUserId, sendMessage, cleanup, onCallEnded, onSaveCallRecord]);

  const handleCallAnswer = useCallback(async (payload: CallAnswerPayload) => {
    if (!webrtcRef.current) return;

    try {
      await webrtcRef.current.handleRemoteAnswer({
        type: 'answer',
        sdp: payload.sdp,
      });
      
      setCallState(prev => ({ ...prev, phase: 'connecting' }));
    } catch (error) {
      console.error('[useCall] Failed to handle answer:', error);
      endCall('failed');
    }
  }, [endCall]);

  const handleIceCandidate = useCallback(async (payload: CallIceCandidatePayload) => {
    if (!webrtcRef.current) return;

    try {
      await webrtcRef.current.addIceCandidate(payload.candidate);
    } catch (error) {
      console.warn('[useCall] Failed to add ICE candidate:', error);
    }
  }, []);

  const handleCallEnd = useCallback((payload: CallEndPayload) => {
    if (payload.callId !== callState.callId) return;
    
    // 保存通话记录 - 对方结束通话
    if (callState.peerUserId && onSaveCallRecord) {
      const duration = callState.startedAt 
        ? Math.floor((Date.now() - callState.startedAt) / 1000)
        : 0;
      
      // 确定通话状态
      let status: CallRecordData['status'];
      if (duration > 0 && callState.phase === 'in-call') {
        status = 'answered';
      } else if (payload.reason === 'rejected') {
        status = 'rejected';
      } else if (payload.reason === 'busy') {
        status = 'missed';
      } else if (!callState.isCaller && callState.phase === 'ringing') {
        status = 'missed';
      } else {
        status = 'cancelled';
      }

      console.log('[useCall] Saving call record (remote end):', { 
        peerId: callState.peerUserId, 
        callType: callState.callType, 
        status, 
        duration,
        reason: payload.reason
      });

      onSaveCallRecord(callState.peerUserId, {
        callType: callState.callType,
        status,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
    
    cleanup();
    onCallEnded?.(payload.reason);
  }, [callState.callId, callState.peerUserId, callState.startedAt, callState.phase, callState.isCaller, callState.callType, cleanup, onCallEnded, onSaveCallRecord]);

  const toggleMute = useCallback(() => {
    const newMuted = !callState.muted;
    setCallState(prev => ({ ...prev, muted: newMuted }));
    webrtcRef.current?.toggleMute(newMuted);
  }, [callState.muted]);

  const toggleVideo = useCallback(() => {
    const newEnabled = !callState.videoEnabled;
    setCallState(prev => ({ ...prev, videoEnabled: newEnabled }));
    webrtcRef.current?.toggleVideo(newEnabled);
  }, [callState.videoEnabled]);

  const switchCamera = useCallback(async () => {
    await webrtcRef.current?.switchCamera();
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    startCall,
    handleIncomingCall,
    acceptCall,
    rejectCall,
    endCall,
    handleCallAnswer,
    handleIceCandidate,
    handleCallEnd,
    toggleMute,
    toggleVideo,
    switchCamera,
    setIceServers,
  };
}
