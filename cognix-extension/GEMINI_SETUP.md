# Gemini API Setup

This extension now uses Google's Gemini API (via Google AI Studio) instead of OpenRouter.

## Setup Instructions

### 1. Add API Key to `.env` file

Create or update the `.env` file in the `cognix-extension` directory:

```bash
# Google Gemini API Key
GEMINI_API_KEY=AIzaSyCWb1OrBKZ-mEwvoebzQpuWWOPYXJlp3Ws

# MongoDB Configuration (same as before)
MONGODB_URI=mongodb+srv://patrickliu_db_user:your_password@cluster0.yycduow.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=cognix
```

### 2. Model Used

- **Model**: `gemini-2.0-flash-exp`
- **API Endpoint**: Google AI Studio REST API

### 3. What Changed

- Replaced OpenRouter API with Gemini API
- Updated `llm.ts` to use Gemini's REST API
- Chat sidebar now uses Gemini for responses
- Session analysis still uses Gemini for human likelihood detection

### 4. API Key Management

Your API key is: `AIzaSyCWb1OrBKZ-mEwvoebzQpuWWOPYXJlp3Ws`

**Note**: For production, you should:
- Rotate this key regularly
- Use environment-specific keys
- Never commit the `.env` file to git (it's already in `.gitignore`)

## Testing

1. Restart the VS Code extension (F5)
2. Open the chat sidebar
3. Send a message - it should respond using Gemini
4. Close the extension to save a session - the AI analysis will use Gemini
