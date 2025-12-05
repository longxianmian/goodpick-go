import axios from 'axios';

interface LineVerifyResponse {
  sub: string; // LINE user ID
  name?: string;
  picture?: string;
  email?: string;
  phone?: string;
  language?: string; // Language code from LINE Profile (e.g., "th", "en", "zh-TW")
}

interface LineProfileResponse {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export async function verifyLineIdToken(idToken: string): Promise<LineVerifyResponse | null> {
  try {
    const response = await axios.post(
      'https://api.line.me/oauth2/v2.1/verify',
      new URLSearchParams({
        id_token: idToken,
        client_id: process.env.LINE_CHANNEL_ID || '',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data && response.data.sub) {
      return {
        sub: response.data.sub,
        name: response.data.name,
        picture: response.data.picture,
        email: response.data.email,
        phone: response.data.phone,
        language: response.data.language, // Extract language from LINE ID token
      };
    }

    return null;
  } catch (error) {
    console.error('LINE ID token verification failed:', error);
    return null;
  }
}

export async function exchangeLineAuthCode(code: string, redirectUri: string): Promise<LineTokenResponse | null> {
  try {
    const response = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINE_CHANNEL_ID || '',
        client_secret: process.env.LINE_CHANNEL_SECRET || '',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data && response.data.access_token) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('LINE token exchange failed:', error);
    return null;
  }
}

// 🆕 获取用户的手机号（需要access_token和phone scope）
export async function getLineUserPhone(accessToken: string): Promise<string | null> {
  try {
    // LINE提供的获取手机号的端点
    const response = await axios.get(
      'https://api.line.me/oauth2/v2.1/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('📱 LINE userinfo响应:', response.data);

    // 返回phone_number字段
    return response.data.phone_number || null;
  } catch (error) {
    console.error('❌ 获取LINE手机号失败:', error);
    return null;
  }
}
