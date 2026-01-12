# CogNix

An AI-assisted learning platform that helps educators understand how students use AI in their coding workflow. CogNix provides instructors with tools to configure AI assistance boundaries and monitor student coding patterns to ensure meaningful learning experiences.

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

## Award

🏆 Winner of SBHacks Education Track 2026!

---

For setup instructions, see the individual README files in `cognix-extension/` and `cognix-web/`.
