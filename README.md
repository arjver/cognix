# CogNix

An AI-assisted learning platform that helps educators understand how students use AI in their coding workflow. CogNix provides instructors with tools to configure AI assistance boundaries and monitor student coding patterns to ensure meaningful learning experiences.

<img width="30%" height="982" alt="Screenshot 2026-01-13 at 3 23 30 PM" src="https://github.com/user-attachments/assets/ce3e5675-74a4-40a4-89cc-6c18180f9adb" />

<img width="30%" height="982" alt="Screenshot 2026-01-13 at 3 22 16 PM" src="https://github.com/user-attachments/assets/945499c4-0e3e-4c94-87be-40a0a52f8eb1" />

<img width="30%" height="865" alt="Screenshot 2026-01-13 at 3 49 22 PM" src="https://github.com/user-attachments/assets/11f067b3-0b80-406f-8730-7eb40d1e98c4" />

🏆 Winner of SB Hacks Education Track 2026!

## Overview

CogNix consists of two main components:

- **VS Code Extension** (`cognix-extension/`) - VSCode extension that tracks student coding activity (keystrokes timing, focus switches, paste events, etc.) in real-time and provides an AI chat assistant with instructor-defined restrictions
- **Web Dashboard** (`cognix-web/`) - Allows instructors to create classes, configure AI capabilities, and view student session analytics with "Human Factor" scores

## Key Features

- **Configurable AI Assistant**: Instructors define exactly what the AI can and cannot help students with
- **Activity Tracking**: Monitors keystrokes, paste events, edit patterns, and active time
- **Human Factor Analysis**: AI-powered detection of coding patterns to estimate student involvement
- **Session Management**: Stores and visualizes student sessions with detailed statistics

## Tech Stack

- **Extension**: TypeScript, VS Code API
- **Web**: Next.js, React, TypeScript, TailwindCSS
- **DB**: MongoDB
- **AI**: Google Gemini API

---

For setup instructions, see the individual README files in `cognix-extension/` and `cognix-web/`.
