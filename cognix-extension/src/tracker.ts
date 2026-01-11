import * as vscode from 'vscode';
import { connectToOpenRouter, HumanLikelihoodAnalysis } from './llm';

// ────────────────────────────────────────────────────────────
// Logging & constants
// ────────────────────────────────────────────────────────────
const DEBUG = true;
export function log(tag: string, data?: any) {
    if (!DEBUG) return;
    if (data !== undefined) {
        console.log(`[Keyllama][${tag}]`, data);
    } else {
        console.log(`[Keyllama][${tag}]`);
    }
}

export const INACTIVITY_THRESHOLD_MS = 3000;
export const COPY_PASTE_THRESHOLD_CHARS = 50;

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
export interface EditEvent {
    timestamp: number;
    type: 'insert' | 'delete';
    length: number;
    deltaMs: number;
}

export interface PasteEvent {
    timestamp: number;
    length: number;
    external: boolean;
    afterFocusLoss: boolean;
}

export interface FocusEvent {
    timestamp: number;
    focused: boolean;
}

export interface SessionStats {
    startTime: number;
    lastEventTime: number;
    activeTimeMs: number;
    inactiveTimeMs: number;

    totalEditEvents: number;
    charsInserted: number;
    charsDeleted: number;

    editEvents: EditEvent[];
    pasteEvents: PasteEvent[];
    focusEvents: FocusEvent[];
}

// ────────────────────────────────────────────────────────────
// Telemetry Tracker
// ────────────────────────────────────────────────────────────
export class TelemetryTracker {
    public session: SessionStats;
    private lastTimestamp: number;
    private state: 'active' | 'inactive' = 'active';
    private cachedAnalysis: HumanLikelihoodAnalysis | null = null;

    constructor() {
        const now = Date.now();
        this.lastTimestamp = now;

        this.session = {
            startTime: now,
            lastEventTime: now,
            activeTimeMs: 0,
            inactiveTimeMs: 0,
            totalEditEvents: 0,
            charsInserted: 0,
            charsDeleted: 0,
            editEvents: [],
            pasteEvents: [],
            focusEvents: [{ timestamp: now, focused: vscode.window.state.focused }]
        };

        vscode.window.onDidChangeWindowState((e) => {
            const event: FocusEvent = { timestamp: Date.now(), focused: e.focused };
            this.session.focusEvents.push(event);
            log('FOCUS', e.focused ? 'gained' : 'lost');
        });
    }

    async recordChange(change: vscode.TextDocumentContentChangeEvent) {
        const now = Date.now();
        const delta = now - this.lastTimestamp;

        // State tracking
        if (delta > INACTIVITY_THRESHOLD_MS) {
            if (this.state === 'active') log('STATE', { transition: 'active → inactive', gapMs: delta });
            this.state = 'inactive';
        } else {
            this.state = 'active';
        }

        if (delta > INACTIVITY_THRESHOLD_MS) {
            this.session.activeTimeMs += INACTIVITY_THRESHOLD_MS;
            this.session.inactiveTimeMs += delta - INACTIVITY_THRESHOLD_MS;
        } else {
            this.session.activeTimeMs += delta;
        }

        this.lastTimestamp = now;
        this.session.lastEventTime = now;

        // Insert events
        if (change.text.length > 0) {
            const insertEvent: EditEvent = { timestamp: now, type: 'insert', length: change.text.length, deltaMs: delta };
            this.session.editEvents.push(insertEvent);
            this.session.charsInserted += change.text.length;
            log('INSERT', { length: insertEvent.length, deltaMs: insertEvent.deltaMs });

            // Paste detection
            if (change.text.length >= COPY_PASTE_THRESHOLD_CHARS) {
                const pasteEvent: PasteEvent = {
                    timestamp: now,
                    length: change.text.length,
                    external: true,
                    afterFocusLoss: this.wasRecentFocusLoss(now)
                };
                this.session.pasteEvents.push(pasteEvent);
                log('PASTE', pasteEvent);
            }
        }

        // Delete events
        if (change.rangeLength > 0) {
            const deleteEvent: EditEvent = { timestamp: now, type: 'delete', length: change.rangeLength, deltaMs: delta };
            this.session.editEvents.push(deleteEvent);
            this.session.charsDeleted += change.rangeLength;
            log('DELETE', { length: deleteEvent.length, deltaMs: deleteEvent.deltaMs });
        }

        this.session.totalEditEvents++;
    }

    wasRecentFocusLoss(now: number): boolean {
        for (let i = this.session.focusEvents.length - 1; i >= 0; i--) {
            const e = this.session.focusEvents[i];
            if (now - e.timestamp > 2000) break;
            if (!e.focused) return true;
        }
        return false;
    }

    getSessionStats(): SessionStats {
        return structuredClone(this.session);
    }

    async analyzeWithLLM(): Promise<HumanLikelihoodAnalysis> {
        const stats = this.getSessionStats();

        const summary = {
            totalEdits: stats.totalEditEvents,
            charsInserted: stats.charsInserted,
            charsDeleted: stats.charsDeleted,
            pasteEvents: stats.pasteEvents.length,
            externalPasteEvents: stats.pasteEvents.filter(p => p.external).length,
            focusEvents: stats.focusEvents.length,
            activeMinutes: Math.round(stats.activeTimeMs / 60000),
            inactiveMinutes: Math.round(stats.inactiveTimeMs / 60000)
        };

        const prompt = `
You are an expert at detecting use of AI or external sources in a coding session. 
Do NOT assess whether it is human; instead, focus on fair play and originality.

Given the following VS Code session features, return a JSON object:
- score: 0-100 (100 = completely fair, no external sources or AI used, 0 = highly suspicious)
- reasons: up to 5 bullet points explaining why, strictly flagging any copy-paste or external content

Scoring guidelines:
- External pasting or large paste events should decrease the score.
- Focus loss followed by large insertions is suspicious.
- Rapid or repetitive edits that suggest AI generation should lower the score.
- Normal typing and small edits without external pastes increase the score.

Features:
${JSON.stringify(summary, null, 2)}
`;


        try {
            const llmResponse = await connectToOpenRouter(prompt);
            const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in LLM response');

            const analysis: HumanLikelihoodAnalysis = JSON.parse(jsonMatch[0]);
            this.cachedAnalysis = analysis;
            return analysis;
        } catch (err) {
            console.error('LLM analysis failed:', err);
            return { score: 50, reasons: ['LLM analysis failed'] };
        }
    }

    printSummary(stats?: SessionStats, analysis?: HumanLikelihoodAnalysis) {
        stats ||= this.getSessionStats();
        analysis ||= this.cachedAnalysis || { score: 50, reasons: ['No analysis available'] };

        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 Keyllama Final Human Likelihood Summary (LLM)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Human Likelihood Score: ${analysis.score}/100`);
        console.log('Reasons:');
        analysis.reasons.forEach((reason, i) => console.log(`  ${i + 1}. ${reason}`));
        console.log('');
        console.log('Session Metrics:');
        console.log(`  Total Edits: ${stats.totalEditEvents}`);
        console.log(`  Characters Inserted: ${stats.charsInserted}`);
        console.log(`  Characters Deleted: ${stats.charsDeleted}`);
        console.log(`  Paste Events: ${stats.pasteEvents.length}`);
        console.log(`  External Paste Events: ${stats.pasteEvents.filter(p => p.external).length}`);
        console.log(`  Focus Events: ${stats.focusEvents.length}`);
        console.log(`  Active Time: ${Math.round(stats.activeTimeMs / 60000)} minutes`);
        console.log(`  Inactive Time: ${Math.round(stats.inactiveTimeMs / 60000)} minutes`);
        console.log('═══════════════════════════════════════════════════════════');
    }

    // ────────────────────────────────────────────────────────────
    // New method for chat sidebar AI responses
    // ────────────────────────────────────────────────────────────
    async askAI(message: string): Promise<string> {
        try {
            // Optional: include session context
            const context = `
You are Keyllama, an AI assistant helping a user with coding. 
Current session stats:
Total edits: ${this.session.totalEditEvents}, 
Chars inserted: ${this.session.charsInserted}, 
Chars deleted: ${this.session.charsDeleted},
External pastes: ${this.session.pasteEvents.filter(p => p.external).length}
`;

            const prompt = `${context}\nUser says: "${message}"`;
            const response = await connectToOpenRouter(prompt);
            return response;
        } catch (err) {
            console.error('askAI failed:', err);
            return 'Error: could not get AI response';
        }
    }
}
