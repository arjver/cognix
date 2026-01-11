import * as vscode from 'vscode';
import { TelemetryTracker } from './tracker';
import { askUserDetails } from './user-info';
import { registerChatSidebar } from './chat-sidebar';

let tracker: TelemetryTracker;

export async function activate(context: vscode.ExtensionContext) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extension.ts:8',message:'activate called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extension.ts:10',message:'calling askUserDetails',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        const userDetails = await askUserDetails();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extension.ts:14',message:'askUserDetails completed',data:{hasUserDetails:!!userDetails,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        if (userDetails) {
            console.log("User:", userDetails.fullName, "Course:", userDetails.className);
        }

        tracker = new TelemetryTracker();

        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(e => {
                e.contentChanges.forEach(change => tracker.recordChange(change));
            })
        );

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extension.ts:26',message:'calling registerChatSidebar',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        // Register AI sidebar
        registerChatSidebar(context, tracker);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extension.ts:29',message:'registerChatSidebar completed',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extension.ts:32',message:'activate error',data:{error:String(error),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        throw error;
    }
}

export async function deactivate() {
    if (tracker) {
        const stats = tracker.getSessionStats();
        const analysis = await tracker.analyzeWithLLM();
        tracker.printSummary(stats, analysis);
    }
}
