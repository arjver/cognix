import * as vscode from 'vscode';
import { connectToOpenRouter, HumanLikelihoodAnalysis } from './llm';

// ────────────────────────────────────────────────────────────
// Logging & constants
// ────────────────────────────────────────────────────────────
const DEBUG = true;
export function log(tag: string, data?: any) {
    if (!DEBUG) { return; }
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
            const event = { timestamp: Date.now(), focused: e.focused };
            this.session.focusEvents.push(event);
            if (e.focused) {
                log('FOCUS', 'gained');
            } else {
                log('FOCUS', 'lost');
            }
        });
    }

    async recordChange(change: vscode.TextDocumentContentChangeEvent) {
        const now = Date.now();
        const delta = now - this.lastTimestamp;

        if (delta > INACTIVITY_THRESHOLD_MS) {
            if (this.state === 'active') {
                log('STATE', { transition: 'active → inactive', gapMs: delta });
            }
            this.state = 'inactive';
        } else {
            this.state = 'active';
        }

        if (delta > INACTIVITY_THRESHOLD_MS) {
            this.session.activeTimeMs += INACTIVITY_THRESHOLD_MS;
            this.session.inactiveTimeMs += (delta - INACTIVITY_THRESHOLD_MS);
        } else {
            this.session.activeTimeMs += delta;
        }

        this.lastTimestamp = now;
        this.session.lastEventTime = now;

        // Insert event
        if (change.text.length > 0) {
            const insertEvent: EditEvent = {
                timestamp: now,
                type: 'insert',
                length: change.text.length,
                deltaMs: delta
            };
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

        // Delete event
        if (change.rangeLength > 0) {
            const deleteEvent: EditEvent = {
                timestamp: now,
                type: 'delete',
                length: change.rangeLength,
                deltaMs: delta
            };
            this.session.editEvents.push(deleteEvent);
            this.session.charsDeleted += change.rangeLength;
            log('DELETE', { length: deleteEvent.length, deltaMs: deleteEvent.deltaMs });
        }

        this.session.totalEditEvents++;
    }

    wasRecentFocusLoss(now: number): boolean {
        for (let i = this.session.focusEvents.length - 1; i >= 0; i--) {
            const e = this.session.focusEvents[i];
            if (now - e.timestamp > 2000) { break; }
            if (!e.focused) { return true; }
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
            externalPasteEvents: stats.pasteEvents.filter((p) => p.external).length,
            focusEvents: stats.focusEvents.length,
            activeMinutes: Math.round(stats.activeTimeMs / 60000),
            inactiveMinutes: Math.round(stats.inactiveTimeMs / 60000)
        };

        const prompt = `
You are an expert at analyzing coding behavior to determine if the work was typed naturally by a human or copy-pasted from another source.

Given the following features of a VS Code session, return a JSON object with:
- score: 0-100 (human-likelihood, 100 = definitely human)
- reasons: up to 5 bullet points explaining why

Features:
${JSON.stringify(summary, null, 2)}
`;

        try {
            const llmResponse = await connectToOpenRouter(prompt);
            const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) { throw new Error('No JSON found in LLM response'); }

            const analysis: HumanLikelihoodAnalysis = JSON.parse(jsonMatch[0]);
            this.cachedAnalysis = analysis;
            return analysis;
        } catch (err) {
            console.error('LLM analysis failed:', err);
            return { score: 50, reasons: ['LLM analysis failed'] };
        }
    }
}
