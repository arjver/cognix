import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export interface HumanLikelihoodAnalysis {
    score: number;
    reasons: string[];
}

interface OpenRouterResponse {
    choices?: Array<{ message?: { content?: string } }>;
}

export async function connectToOpenRouter(message: string): Promise<string> {
    const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const MODEL_NAME = 'gpt-oss-120b';

    if (!process.env.LLM_API_KEY) {
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
        }
    }

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
        throw new Error('LLM_API_KEY not found in environment');
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: [{ role: 'user', content: message }],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (!data.choices || !data.choices[0]?.message) {
        throw new Error('Invalid response format from OpenRouter');
    }

    return data.choices[0].message.content || '';
}
