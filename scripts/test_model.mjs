import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    console.log('Calling model...');
    const res = await model.generateContent('Hi');
    console.log('Success:', res.response.text());
  } catch (err) {
    console.error('Catch error:', err.message);
  }
}

test();
