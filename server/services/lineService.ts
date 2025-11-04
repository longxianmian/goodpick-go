import axios from 'axios';

interface LineVerifyResponse {
  sub: string; // LINE user ID
  name?: string;
  picture?: string;
  email?: string;
  phone?: string;
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
