import * as vscode from 'vscode';
import { TelemetryTracker } from './tracker';

let tracker: TelemetryTracker;

export function activate(context: vscode.ExtensionContext) {
    tracker = new TelemetryTracker();

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            for (const change of e.contentChanges) {
                tracker.recordChange(change);
            }
        })
    );

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
}

export async function deactivate() {
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
        } catch (err) {
            console.error('Failed to get final LLM analysis:', err);
        }
    }
}
