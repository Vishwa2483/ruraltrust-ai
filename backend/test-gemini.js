
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Say hello world.');
        console.log('SUCCESS:', result.response.text());
    } catch(e) {
        console.error('ERROR:', e.message);
    }
}
run();

