# Contributing to AI-Markdown

Thank you for your interest in contributing to AI-Markdown! We welcome contributions from the community and are pleased to have you join us.

## Getting Started

1. **Fork the Repository**
   - Fork the repository on GitHub
   - Clone your fork locally: `git clone https://github.com/snoai/ai-markdown.git`

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Set Up Development Environment**
   - Copy `.env.local.example` to `.env.local` (if applicable)
   - Configure any necessary environment variables

## Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-fix-name
   ```

2. **Make Your Changes**
   - Write clear, concise commit messages
   - Follow our coding standards and practices
   - Add tests if applicable
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   pnpm run test        # Run tests
   pnpm run type-check  # Check types
   ```

4. **Document Your Changes**
   - For documentation changes, test with:
     ```bash
     pnpm exec mintlify dev  # Preview documentation locally
     ```
   - Ensure both `.md` and `.aimd` files follow our guidelines

## Submitting Changes

1. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - Go to the AI-Markdown repository on GitHub
   - Click "New Pull Request"
   - Choose your fork and branch
   - Fill in the PR template with all relevant information

## Contribution Guidelines

### Code Style
- Follow the existing code style
- Use TypeScript for type safety
- Run Prettier before committing: `pnpm prettier --write .`

### Commit Messages
- Use clear, descriptive commit messages
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Example: `feat(parser): add support for nested lists`

### Documentation
- Update documentation for any new features
- Include code examples where appropriate
- Support both `.md` and `.aimd` formats
- Test documentation changes locally

### Testing
- Add tests for new features
- Ensure all tests pass before submitting
- Include both unit and integration tests where appropriate

## Getting Help

- Open an issue for questions
- Join our community discussions (if applicable)
- Check existing issues and PRs before creating new ones

## License

By contributing to AI-Markdown, you agree that your contributions will be licensed under its MIT license. 