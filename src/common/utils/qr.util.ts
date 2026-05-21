import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

/**
 * Generate a QR code as a data URL (base64 encoded PNG)
 */
export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#1A1A1A',
      light: '#FFFFFF',
    },
  });
}

/**
 * Generate a secure QR token with HMAC for anti-fraud
 */
export function generateQrPayload(
  qrToken: string,
  hmacSecret: string,
): string {
  const timestamp = Date.now().toString();
  const data = `${qrToken}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', hmacSecret).update(data).digest('hex');

  return JSON.stringify({
    token: qrToken,
    ts: timestamp,
    sig: hmac,
  });
}

/**
 * Verify a QR payload HMAC signature
 */
export function verifyQrPayload(
  payload: string,
  hmacSecret: string,
  expiryMinutes: number,
): { valid: boolean; token: string | null; error?: string } {
  try {
    const parsed = JSON.parse(payload);
    const { token, ts, sig } = parsed;

    if (!token || !ts || !sig) {
      return { valid: false, token: null, error: 'Invalid QR payload format' };
    }

    // Verify HMAC
    const data = `${token}:${ts}`;
    const expectedHmac = crypto.createHmac('sha256', hmacSecret).update(data).digest('hex');

    if (sig !== expectedHmac) {
      return { valid: false, token: null, error: 'Invalid QR signature' };
    }

    // Check expiry
    const tokenTimestamp = parseInt(ts, 10);
    const expiryMs = expiryMinutes * 60 * 1000;
    if (Date.now() - tokenTimestamp > expiryMs) {
      return { valid: false, token: null, error: 'QR code expired' };
    }

    return { valid: true, token };
  } catch {
    return { valid: false, token: null, error: 'Failed to parse QR payload' };
  }
}
