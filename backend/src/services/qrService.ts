import QRCode from 'qrcode';

/**
 * Generate QR code for government login
 */
export async function generateQRCode(username: string, password: string): Promise<string> {
    try {
        // Create QR data with credentials
        const qrData = JSON.stringify({
            type: 'government_login',
            username,
            password,
            timestamp: new Date().toISOString(),
        });

        // Generate QR code as base64 data URL
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#1a1f2e',
                light: '#ffffff',
            },
        });

        return qrCodeDataURL;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Parse QR code data
 */
export function parseQRData(qrDataString: string): { username: string; password: string } | null {
    try {
        const data = JSON.parse(qrDataString);

        if (data.type !== 'government_login' || !data.username || !data.password) {
            return null;
        }

        return {
            username: data.username,
            password: data.password,
        };
    } catch (error) {
        return null;
    }
}
