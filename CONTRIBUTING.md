# Contributing to HedgeHog

Thank you for your interest in contributing to HedgeHog! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Code Style](#code-style)
- [Pull Request Guidelines](#pull-request-guidelines)

## Development Setup

### Prerequisites

- Node.js 18+ (Node 22 recommended)
- npm
- A Firebase project (free tier works)

### Getting Started

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/mahendrasinghbora/hedgehog.git
   cd hedgehog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Enable **Authentication** with Google provider
   - Enable **Firestore Database**
   - Copy your Firebase config values

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase credentials in `.env`:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

5. **Set up Firestore security rules**

   In Firebase Console > Firestore > Rules, add the rules from [README.md](README.md#firebase-security-rules).

6. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── assets/          # Static assets (images, etc.)
├── components/      # Reusable components
│   └── ui/          # Shadcn UI components
├── contexts/        # React contexts (Auth, Toast)
├── hooks/           # Custom React hooks
├── lib/             # Utilities and Firebase config
├── pages/           # Page components
├── types/           # TypeScript type definitions
├── App.tsx          # Main app with routing
└── main.tsx         # Entry point
```

### Key Files

- `src/lib/firebase.ts` - Firebase initialization and configuration
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/types/index.ts` - Core data models (User, Market, Bet, Outcome)

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/mahendrasinghbora/hedgehog/issues) to avoid duplicates
2. Create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/environment info

### Suggesting Features

Open an issue with the `enhancement` label describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Submitting Code

1. **Find or create an issue** for the work you want to do
2. **Fork the repository** and create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
3. **Make your changes** following the [code style](#code-style) guidelines
4. **Test your changes** locally
5. **Run linting** before committing:
   ```bash
   npm run lint
   ```
6. **Commit with a clear message**:
   ```bash
   git commit -m "feat: add new feature description"
   # or
   git commit -m "fix: resolve bug description"
   ```
7. **Push and open a pull request**

## Code Style

### General Guidelines

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Keep components small and focused
- Use meaningful variable and function names

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### TypeScript

- Define types in `src/types/` for shared data structures
- Avoid `any` - use proper types or `unknown`
- Use interfaces for object shapes

### React

- Use functional components with hooks
- Keep state as local as possible
- Use contexts sparingly for truly global state

### Styling

- Use Tailwind CSS utility classes
- Use Shadcn UI components from `src/components/ui/` when available
- Keep responsive design in mind (mobile-first)

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] `npm run lint` passes without errors
- [ ] `npm run build` completes successfully
- [ ] Changes have been tested locally
- [ ] Commit messages follow conventional commits format

### PR Description

Include:
- Summary of changes
- Related issue number (e.g., "Fixes #123")
- Screenshots for UI changes
- Any breaking changes or migration notes

### Review Process

1. A maintainer will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Questions?

Feel free to open an issue for any questions about contributing. We're happy to help!
