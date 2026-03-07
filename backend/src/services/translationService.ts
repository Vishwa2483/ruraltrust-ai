/**
 * Translation Service using Google Translate API (free tier)
 * Detects language and translates to English for government portal
 */

const axios = require('axios');

// Language codes mapping
const LANGUAGE_CODES: { [key: string]: string } = {
    'English': 'en',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Kannada': 'kn',
    'Malayalam': 'ml',
    'Hindi': 'hi',
    'Marathi': 'mr',
    'Gujarati': 'gu',
    'Bengali': 'bn',
    'Punjabi': 'pa',
    'Urdu': 'ur',
};

const LANGUAGE_NAMES: { [key: string]: string } = {
    'en': 'English',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'hi': 'Hindi',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'bn': 'Bengali',
    'pa': 'Punjabi',
    'ur': 'Urdu',
};

/**
 * Translate text using Google Translate (via MyMemory API - free, no key required)
 */
export async function translateText(text: string, sourceLang: string, targetLang: string = 'en'): Promise<string> {
    try {
        if (sourceLang === targetLang) {
            return text;
        }

        // Use MyMemory Translation API (free, no authentication required)
        const response = await axios.get('https://api.mymemory.translated.net/get', {
            params: {
                q: text,
                langpair: `${sourceLang}|${targetLang}`
            },
            timeout: 5000
        });

        if (response.data && response.data.responseStatus === 200) {
            return response.data.responseData.translatedText;
        }

        // Fallback: return original text if translation fails
        console.log('Translation API failed, returning original text');
        return text;
    } catch (error) {
        console.error('Translation error:', error);
        // Return original text on error
        return text;
    }
}

/**
 * Detect language of given text
 */
export async function detectLanguage(text: string): Promise<string> {
    try {
        // Simple language detection using common words
        const tamilWords = ['அ', 'ஆ', 'இ', 'ஈ', 'உ'];
        const teluguWords = ['అ', 'ఆ', 'ఇ', 'ఈ', 'ఉ'];
        const kannadaWords = ['ಅ', 'ಆ', 'ಇ', 'ಈ', 'ಉ'];
        const hindiWords = ['अ', 'आ', 'इ', 'ई', 'उ'];

        if (tamilWords.some(word => text.includes(word))) return 'ta';
        if (teluguWords.some(word => text.includes(word))) return 'te';
        if (kannadaWords.some(word => text.includes(word))) return 'kn';
        if (hindiWords.some(word => text.includes(word))) return 'hi';

        return 'en'; // Default to English
    } catch (error) {
        console.error('Language detection error:', error);
        return 'en';
    }
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): { code: string; name: string }[] {
    return Object.entries(LANGUAGE_CODES).map(([name, code]) => ({
        code,
        name
    }));
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code] || 'English';
}

/**
 * Get language code from name
 */
export function getLanguageCode(name: string): string {
    return LANGUAGE_CODES[name] || 'en';
}
