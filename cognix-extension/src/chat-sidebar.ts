import * as vscode from 'vscode';
import { connectToOpenRouter } from './llm';
import { getClassSystemPrompt } from './db';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'keyllamaChatSidebar';

    private _view?: vscode.WebviewView;
    private _conversationHistory: Array<{ role: string; content: string }> = [];
    private _className?: string;
    private _systemPrompt?: string;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public async setClassName(className: string) {
        this._className = className;
        // Fetch the system prompt from the database
        const systemPrompt = await getClassSystemPrompt(className);
        if (systemPrompt) {
            this._systemPrompt = systemPrompt;
            console.log(`Loaded system prompt for class: ${className}`);
        } else {
            console.log(`No system prompt found for class: ${className}`);
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlContent();

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.type) {
                case 'send':
                    await this._handleUserMessage(message.text);
                    break;
            }
        });
    }

    private async _handleUserMessage(userText: string): Promise<void> {
        // Show loading state
        this._view?.webview.postMessage({ type: 'loading', text: 'Thinking...' });

        try {
            // Add user message to history
            this._conversationHistory.push({ role: 'user', content: userText });

            // Build the full prompt with system prompt and conversation context
            let fullPrompt = '';
            
            // Prepend system prompt if available
            if (this._systemPrompt) {
                fullPrompt = `${this._systemPrompt}\n\n---\n\n`;
            }
            
            // Add conversation history
            fullPrompt += this._conversationHistory
                .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                .join('\n\n');

            // Call the AI
            const aiResponse = await connectToOpenRouter(fullPrompt);

            // Add AI response to history
            this._conversationHistory.push({ role: 'assistant', content: aiResponse });

            // Keep conversation history manageable (last 10 exchanges)
            if (this._conversationHistory.length > 20) {
                this._conversationHistory = this._conversationHistory.slice(-20);
            }

            // Send response to webview
            this._view?.webview.postMessage({ type: 'reply', text: aiResponse });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this._view?.webview.postMessage({ 
                type: 'error', 
                text: `Error: ${errorMessage}` 
            });
        }
    }

    private _getHtmlContent(): string {
        return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            padding: 12px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
        }
        h3 {
            margin-bottom: 12px;
            font-weight: 600;
        }
        .chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 24px);
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 12px;
            min-height: 150px;
        }
        .message {
            padding: 8px 12px;
            margin-bottom: 8px;
            border-radius: 8px;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20px;
        }
        .message.ai {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            margin-right: 20px;
        }
        .message.loading {
            opacity: 0.7;
            font-style: italic;
        }
        .message.error {
            color: var(--vscode-errorForeground);
            border-color: var(--vscode-errorForeground);
        }
        .input-area {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        textarea {
            width: 100%;
            min-height: 60px;
            padding: 8px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-input-foreground);
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            resize: vertical;
        }
        textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        button {
            padding: 8px 16px;
            font-size: var(--vscode-font-size);
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <h3>🦙 Keyllama Chat</h3>
        <div class="messages" id="messages">
            <div class="message ai">Hello! How can I help you today?</div>
        </div>
        <div class="input-area">
            <textarea id="input" placeholder="Type a message..." rows="3"></textarea>
            <button id="send">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesEl = document.getElementById('messages');
        const inputEl = document.getElementById('input');
        const sendBtn = document.getElementById('send');

        function addMessage(text, isUser, isError = false) {
            const div = document.createElement('div');
            div.className = 'message ' + (isUser ? 'user' : 'ai') + (isError ? ' error' : '');
            div.textContent = text;
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function send() {
            const text = inputEl.value.trim();
            if (!text) return;
            
            addMessage(text, true);
            inputEl.value = '';
            vscode.postMessage({ type: 'send', text: text });
        }

        sendBtn.addEventListener('click', send);
        
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });

        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.type === 'reply') {
                removeLoading();
                addMessage(msg.text, false);
            } else if (msg.type === 'loading') {
                showLoading(msg.text);
            } else if (msg.type === 'error') {
                removeLoading();
                addMessage(msg.text, false, true);
            }
        });

        function showLoading(text) {
            removeLoading();
            const div = document.createElement('div');
            div.id = 'loading';
            div.className = 'message ai loading';
            div.textContent = text;
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function removeLoading() {
            const loading = document.getElementById('loading');
            if (loading) loading.remove();
        }
    </script>
</body>
</html>`;
    }
}
