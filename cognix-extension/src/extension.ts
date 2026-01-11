import * as vscode from 'vscode';
import { TelemetryTracker, SessionStats } from './tracker';
import { askUserDetails } from './user-info';
import { ChatSidebarProvider } from './chat-sidebar';
import { MongoClient, Db } from 'mongodb';
import { HumanLikelihoodAnalysis } from './llm';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

let tracker: TelemetryTracker;
let chatProvider: ChatSidebarProvider;
let storedUserDetails: { fullName: string; className: string } | undefined;

/**
 * Save session data to MongoDB
 */
async function saveSessionToMongoDB(
    userDetails: { fullName: string; className: string } | undefined,
    stats: SessionStats,
    analysis: HumanLikelihoodAnalysis
): Promise<void> {
    try {
        // Load environment variables
        if (!process.env.MONGODB_URI) {
            const envPath = path.join(__dirname, '..', '.env');
            if (fs.existsSync(envPath)) {
                dotenv.config({ path: envPath });
            }
        }

        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('MONGODB_URI not found in environment');
            return;
        }

        // Connect to MongoDB
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connected to MongoDB for session save!");

        // Get the database
        const dbName = process.env.MONGODB_DB_NAME || 'cognix';
        const db: Db = client.db(dbName);
        const collection = db.collection("sessions");

        // Prepare the data to save
        const sessionData = {
            userDetails: {
                fullName: userDetails?.fullName || 'Anonymous',
                className: userDetails?.className || 'Unknown',
            },
            stats: {
                startTime: stats.startTime,
                lastEventTime: stats.lastEventTime,
                activeTimeMs: stats.activeTimeMs,
                inactiveTimeMs: stats.inactiveTimeMs,
                totalEditEvents: stats.totalEditEvents,
                charsInserted: stats.charsInserted,
                charsDeleted: stats.charsDeleted,
                pasteEventsCount: stats.pasteEvents.length,
                focusEventsCount: stats.focusEvents.length,
            },
            analysis: {
                score: analysis.score,
                reasons: analysis.reasons,
            },
            timestamp: new Date(),
        };

        // Insert the document
        const result = await collection.insertOne(sessionData);
        console.log(`Session saved to MongoDB with ID: ${result.insertedId}`);

        await client.close();
    } catch (error) {
        console.error("Error saving session to MongoDB:", error);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // Register the chat sidebar provider FIRST
    chatProvider = new ChatSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatSidebarProvider.viewType,
            chatProvider
        )
    );

    // Initialize tracker
    tracker = new TelemetryTracker();

    // Register document change listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            e.contentChanges.forEach(change => tracker.recordChange(change));
        })
    );

    // Register showStats command
    context.subscriptions.push(
        vscode.commands.registerCommand('keyllama.showStats', async () => {
            if (!tracker) { return; }

            const stats = tracker.getSessionStats();
            const analysis = await tracker.analyzeWithLLM();

            vscode.window.showInformationMessage(
                `Human Likelihood: ${analysis.score}%\n` +
                `Reasons:\n• ${analysis.reasons.join('\n• ')}`
            );
        })
    );

    // Register manual session save command for testing
    context.subscriptions.push(
        vscode.commands.registerCommand('keyllama.saveSession', async () => {
            if (!tracker) { return; }

            const stats = tracker.getSessionStats();
            const analysis = await tracker.analyzeWithLLM();
            await saveSessionToMongoDB(storedUserDetails, stats, analysis);
            
            vscode.window.showInformationMessage('Session saved to database!');
        })
    );

    // Handle user details (non-blocking)
    askUserDetails().then(userDetails => {
        storedUserDetails = userDetails || undefined;
        if (userDetails) {
            console.log("User:", userDetails.fullName, "Course:", userDetails.className);
            // Set the class name in the chat provider
            chatProvider.setClassName(userDetails.className);
        }
    }).catch(err => {
        console.error("User details error:", err);
    });
}

export async function deactivate() {
    const { closeMongoClient } = await import('./db.js');
    
    if (tracker) {
        try {
            const stats = tracker.getSessionStats();
            const analysis = await tracker.analyzeWithLLM();

            console.log('═══════════════════════════════════════════════════════════');
            console.log('📊 Keyllama Final Human Likelihood Summary (LLM)');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`Human Likelihood Score: ${analysis.score}/100`);
            console.log('Reasons:');
            analysis.reasons.forEach((reason, i) => {
                console.log(`  ${i + 1}. ${reason}`);
            });
            console.log('');
            console.log('Session Metrics:');
            console.log(`  Total Edits: ${stats.totalEditEvents}`);
            console.log(`  Characters Inserted: ${stats.charsInserted}`);
            console.log(`  Characters Deleted: ${stats.charsDeleted}`);
            console.log(`  Paste Events: ${stats.pasteEvents.length}`);
            console.log(`  External Paste Events: ${stats.pasteEvents.filter((p) => p.external).length}`);
            console.log(`  Focus Events: ${stats.focusEvents.length}`);
            console.log(`  Active Time: ${Math.round(stats.activeTimeMs / 60000)} minutes`);
            console.log(`  Inactive Time: ${Math.round(stats.inactiveTimeMs / 60000)} minutes`);
            console.log('═══════════════════════════════════════════════════════════');

            // Save session data to MongoDB
            await saveSessionToMongoDB(storedUserDetails, stats, analysis);

        } catch (err) {
            console.error('Failed to get final LLM analysis:', err);
        }
    }
    
    // Close MongoDB connection
    await closeMongoClient();
}
