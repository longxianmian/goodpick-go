import axios from 'axios';

interface LineVerifyResponse {
  sub: string; // LINE user ID
  name?: string;
  picture?: string;
  email?: string;
  phone?: string;
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
