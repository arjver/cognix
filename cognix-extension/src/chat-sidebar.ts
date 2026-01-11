import * as vscode from 'vscode';
import { TelemetryTracker } from './tracker';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'keyllamaChatSidebar';
    constructor(private readonly tracker: TelemetryTracker) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml();
    }

    private getHtml(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Keyllama AI Chat</title>
        </head>
        <body>
            <h2>Keyllama AI Chat</h2>
            <textarea id="userMessage" placeholder="Type here..." style="width:100%; height:60px;"></textarea>
            <button onclick="sendMessage()">Send</button>
            <pre id="response" style="white-space: pre-wrap;"></pre>
            <script>
                const vscode = acquireVsCodeApi();
                function sendMessage() {
                    const msg = document.getElementById('userMessage').value;
                    vscode.postMessage({ type: 'askAI', message: msg });
                }
            </script>
        </body>
        </html>
        `;
    }
}

// Helper to register
export function registerChatSidebar(context: vscode.ExtensionContext, tracker: TelemetryTracker) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-sidebar.ts:44',message:'registerChatSidebar called',data:{viewType:ChatSidebarProvider.viewType,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const provider = new ChatSidebarProvider(tracker);
    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-sidebar.ts:48',message:'calling registerWebviewViewProvider',data:{viewType:ChatSidebarProvider.viewType,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        const registration = vscode.window.registerWebviewViewProvider(ChatSidebarProvider.viewType, provider);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-sidebar.ts:51',message:'registerWebviewViewProvider completed',data:{hasRegistration:!!registration,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        context.subscriptions.push(registration);
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26181097-d69d-4c61-b74d-01536fab53f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-sidebar.ts:55',message:'registerWebviewViewProvider error',data:{error:String(error),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        throw error;
    }
}
