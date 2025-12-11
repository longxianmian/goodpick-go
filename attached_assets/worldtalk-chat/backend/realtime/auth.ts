// 📌 实时通信认证服务 - JWT鉴权与用户映射
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { storage } from '../storage';
import type { WebSocket } from 'ws';
import type { Socket } from 'socket.io';

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  connectedAt: Date;
}

export interface SocketConnection {
  socketId: string;
  userId: string;
  socketType: 'websocket' | 'socket.io';
  ws?: WebSocket;
  socket?: Socket;
  authenticatedAt: Date;
}

// 内存映射：userId ↔ socketId - 支持多连接
class ConnectionManager {
  private userToSockets = new Map<string, Map<string, SocketConnection>>();
  private socketToUser = new Map<string, string>();

  // 注册新连接 - 支持多连接
  registerConnection(connection: SocketConnection) {
    // 获取或创建用户的连接集合
    let userConnections = this.userToSockets.get(connection.userId);
    if (!userConnections) {
      userConnections = new Map<string, SocketConnection>();
      this.userToSockets.set(connection.userId, userConnections);
    }

    userConnections.set(connection.socketId, connection);
    this.socketToUser.set(connection.socketId, connection.userId);
    
    console.log(`✅ [ConnectionManager] 注册连接: userId=${connection.userId}, socketId=${connection.socketId}, type=${connection.socketType}, 总在线用户=${this.userToSockets.size}`);
  }

  // 获取用户的主要连接（兼容API - 返回第一个连接）
  getConnectionByUserId(userId: string): SocketConnection | undefined {
    const userConnections = this.userToSockets.get(userId);
    if (!userConnections || userConnections.size === 0) {
      return undefined;
    }
    
    // 返回第一个连接以保持向后兼容
    return userConnections.values().next().value;
  }

  // 获取用户的所有连接
  getConnectionsByUserId(userId: string): SocketConnection[] {
    const userConnections = this.userToSockets.get(userId);
    if (!userConnections) {
      return [];
    }
    return Array.from(userConnections.values());
  }

  // 根据socket获取用户ID
  getUserIdBySocketId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  removeConnection(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return;
    }

    const userConnections = this.userToSockets.get(userId);
    if (userConnections) {
      userConnections.delete(socketId);
      
      if (userConnections.size === 0) {
        this.userToSockets.delete(userId);
        storage.updateUserOnlineStatus(userId, false);
      }
    }

    this.socketToUser.delete(socketId);
  }

  // 获取所有在线用户
  getOnlineUsers(): string[] {
    return Array.from(this.userToSockets.keys()).filter(userId => {
      const connections = this.userToSockets.get(userId);
      return connections && connections.size > 0;
    });
  }

  broadcastToUser(userId: string, message: any, excludeSocketId?: string): number {
    const userConnections = this.userToSockets.get(userId);
    if (!userConnections) {
      console.log(`🔍 [ConnectionManager] broadcastToUser: userId=${userId} 无连接记录, 在线用户列表=[${Array.from(this.userToSockets.keys()).join(', ')}]`);
      return 0;
    }

    let latestWebSocketConnection: { socketId: string, connection: any } | null = null;
    let latestWebSocketTimestamp = 0;

    for (const [socketId, connection] of Array.from(userConnections.entries())) {
      if (excludeSocketId && socketId === excludeSocketId) {
        continue;
      }

      if (connection.socketType === 'websocket' && connection.ws?.readyState === 1) {
        const timestamp = parseInt(socketId.split('_')[1]) || 0;
        if (timestamp > latestWebSocketTimestamp) {
          latestWebSocketTimestamp = timestamp;
          latestWebSocketConnection = { socketId, connection };
        }
      }
    }

    if (latestWebSocketConnection) {
      try {
        const { connection } = latestWebSocketConnection;
        connection.ws.send(JSON.stringify(message));
        return 1;
      } catch (error) {
        console.error(`Error sending message to ${userId} via WebSocket:`, error);
      }
    }

    return 0;
  }
}

export const connectionManager = new ConnectionManager();

// JWT认证工具
class AuthService {
  private readonly JWT_SECRET = process.env.SESSION_SECRET!;
  private readonly JWT_EXPIRATION = '7d';

  constructor() {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'default-secret-key') {
      throw new Error('🚨 SECURITY: SESSION_SECRET environment variable must be set with a secure value');
    }
  }

  // 生成JWT token
  generateToken(userId: string, sessionId: string): string {
    return jwt.sign(
      { 
        userId, 
        sessionId,
        type: 'realtime_auth',
        iat: Math.floor(Date.now() / 1000)
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRATION }
    );
  }

  // 验证JWT token
  async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'realtime_auth') {
        throw new Error('Invalid token type');
      }

      // 验证用户是否存在且活跃
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        connectedAt: new Date()
      };
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  // 从HTTP请求中提取token
  extractTokenFromRequest(request: IncomingMessage): string | null {
    // 1. 从Authorization header提取（优先）
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 2. 从HttpOnly Cookie提取（安全方案）
    const cookies = request.headers.cookie;
    if (cookies) {
      const tokenMatch = cookies.match(/realtime_token=([^;]+)/);
      if (tokenMatch) {
        return tokenMatch[1];
      }
    }

    if (process.env.NODE_ENV === 'development') {
      const url = parse(request.url || '', true);
      const tokenFromQuery = url.query.token;
      if (typeof tokenFromQuery === 'string') {
        return tokenFromQuery;
      }
    }

    return null;
  }

  async verifyWebSocketConnection(info: { req: IncomingMessage }): Promise<AuthenticatedUser | null> {
    const token = this.extractTokenFromRequest(info.req);
    
    if (!token) {
      return null;
    }

    const authUser = await this.verifyToken(token);
    if (!authUser) {
      return null;
    }

    return authUser;
  }

  async verifySocketIoConnection(socket: Socket): Promise<AuthenticatedUser | null> {
    let token = socket.handshake.auth?.token || 
                socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token && process.env.NODE_ENV === 'development') {
      token = socket.handshake.query?.token;
    }

    if (!token || typeof token !== 'string') {
      return null;
    }

    const authUser = await this.verifyToken(token);
    if (!authUser) {
      return null;
    }

    return authUser;
  }
}

export const authService = new AuthService();

// 统一的连接认证中间件
export async function authenticateConnection(
  socketId: string,
  socketType: 'websocket' | 'socket.io',
  authUser: AuthenticatedUser,
  ws?: WebSocket,
  socket?: Socket
): Promise<boolean> {
  try {
    // 更新用户在线状态
    await storage.updateUserOnlineStatus(authUser.userId, true);

    // 注册连接映射
    connectionManager.registerConnection({
      socketId,
      userId: authUser.userId,
      socketType,
      ws,
      socket,
      authenticatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Connection authentication error:', error);
    return false;
  }
}