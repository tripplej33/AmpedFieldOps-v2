# Contributing Guidelines

Thank you for your interest in contributing to AmpedFieldOps V2!

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
4. Start development server: `npm run dev`

## Development Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates

### Commit Messages
- Use clear, descriptive messages
- Format: `type(scope): description`
- Examples:
  - `feat(dashboard): add real-time stats`
  - `fix(auth): resolve session timeout issue`
  - `docs(readme): update setup instructions`

### Testing
- Run tests before submitting PR: `npm run test`
- Ensure TypeScript compilation passes: `npm run build`
- Check for linting errors: `npm run lint`

## Pull Request Process

1. Create a branch from `main`
2. Make your changes
3. Test thoroughly (UI, functionality, responsiveness)
4. Update documentation if needed
5. Submit PR with clear description of changes
6. Wait for review and address feedback

## Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Tailwind CSS for styling
- Keep components small and focused
- Add comments for complex logic

## Reporting Issues

- Use GitHub Issues for bug reports
- Include steps to reproduce
- Attach screenshots if UI-related
- Specify your environment (OS, browser, Node version)

## Questions?

Check the project documentation in `.project/` folder or start a discussion on GitHub.
