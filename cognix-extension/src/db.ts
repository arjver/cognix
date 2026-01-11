import { MongoClient } from 'mongodb';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

let client: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
    if (client) {
        return client;
    }

    // Load environment variables
    if (!process.env.MONGODB_URI) {
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
        }
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI not found in environment');
    }

    client = new MongoClient(uri);
    await client.connect();
    return client;
}

export async function getClassSystemPrompt(className: string): Promise<string | null> {
    try {
        const client = await getMongoClient();
        const dbName = process.env.MONGODB_DB_NAME || 'cognix';
        const db = client.db(dbName);
        const classesCollection = db.collection('classes');

        const classDoc = await classesCollection.findOne({ name: className });
        
        if (classDoc && classDoc.system_prompt) {
            return classDoc.system_prompt as string;
        }

        return null;
    } catch (error) {
        console.error('Error fetching class system prompt:', error);
        return null;
    }
}

export async function closeMongoClient() {
    if (client) {
        await client.close();
        client = null;
    }
}
