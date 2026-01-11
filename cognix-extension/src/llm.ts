import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export interface HumanLikelihoodAnalysis {
    score: number;
    reasons: string[];
}

export async function connectToGemini(message: string): Promise<string> {
    // Load environment variables
    if (!process.env.GEMINI_API_KEY) {
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
        }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: message
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as any;

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response format from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Keep the old name for backward compatibility
export async function connectToOpenRouter(message: string): Promise<string> {
    return connectToGemini(message);
}
