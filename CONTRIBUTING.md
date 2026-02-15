# Contributing to My SaaS App

Thank you for your interest in contributing! This document provides guidelines and workflows for contributing to this project.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/my-saas-app.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env.local` and configure
5. Run database migrations: `npx supabase db push`
6. Start dev server: `npm run dev`

## Workflow with Everything Claude Code (ECC)

This project uses ECC for development. All contributors should use the provided agents, skills, and commands.

### Step 1: Planning

Before writing code, create an implementation plan:

```bash
/plan "Your feature description"
```

The planner agent will:
- Break down the feature into tasks
- Identify files to modify
- Suggest architecture decisions
- Create a step-by-step plan

### Step 2: Test-Driven Development

Use the TDD workflow for all features:

```bash
/tdd
```

This enforces:
1. Write failing tests first (RED)
2. Write minimal code to pass (GREEN)
3. Refactor for quality (REFACTOR)
4. Verify 80%+ test coverage

### Step 3: Implementation

Follow the plan and TDD workflow:
- Write tests first
- Implement features
- Keep commits atomic and focused
- Use descriptive commit messages

### Step 4: Code Review

Before creating a PR, run code review:

```bash
/code-review
```

This checks:
- Code quality (SOLID principles)
- Security vulnerabilities
- TypeScript strict compliance
- Test coverage
- Documentation

### Step 5: Security Scan

Run security audit:

```bash
/security-scan
```

This scans for:
- OWASP Top 10 vulnerabilities
- Secrets in code
- SQL injection risks
- XSS vulnerabilities
- Insecure dependencies

### Step 6: E2E Tests

Generate E2E tests for critical flows:

```bash
/e2e
```

### Step 7: Documentation

Update documentation:

```bash
/update-docs
```

## Commit Message Format

Use conventional commits:

```
feat: add team invitation system
fix: resolve Stripe webhook timeout issue
refactor: extract auth logic to hooks
docs: update API documentation
test: add E2E tests for billing flow
chore: update dependencies
```

### Types:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation changes
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes
- `perf:` Performance improvements
- `style:` Code style changes (formatting)

## Code Style Guidelines

### TypeScript

- Use strict mode (enabled by default)
- No `any` types - use proper types or `unknown`
- Explicit return types for functions
- Use `readonly` for immutable data
- Prefer `const` over `let`

### React

- Server Components by default
- Use `'use client'` only when necessary
- Extract logic to custom hooks
- Keep components under 400 lines
- One component per file

### Naming Conventions

- Components: PascalCase (`UserProfile.tsx`)
- Functions: camelCase (`getUserProfile()`)
- Constants: UPPER_SNAKE_CASE (`MAX_ITEMS`)
- Files: kebab-case (`user-profile.tsx`)

### Imports

Order imports:
1. React/Next.js
2. External libraries
3. Internal utilities
4. Components
5. Types
6. Styles

```typescript
import { useState } from 'react'
import { createServerClient } from '@supabase/ssr'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { User } from '@/types'
import './styles.css'
```

## Testing Guidelines

### Unit Tests

- Test public APIs, not implementation details
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for 80%+ coverage

```typescript
describe('createProject', () => {
  it('should create project with valid data', async () => {
    // Arrange
    const projectData = { name: 'Test Project' }

    // Act
    const result = await createProject(projectData)

    // Assert
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Test Project')
  })
})
```

### E2E Tests

- Test critical user flows
- Use Page Object Model pattern
- Make tests independent
- Clean up test data

```typescript
test('user can create project', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="new-project"]')
  await page.fill('[name="name"]', 'Test Project')
  await page.click('[type="submit"]')
  await expect(page.locator('text=Test Project')).toBeVisible()
})
```

## Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following guidelines above
3. Run full test suite: `npm run test && npm run test:e2e`
4. Run code review: `/code-review`
5. Run security scan: `/security-scan`
6. Commit with conventional format
7. Push to your fork
8. Create PR with description:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] TypeScript strict compliance
- [ ] 80%+ test coverage
```

## Code Review Checklist

Reviewers should verify:

### Functionality
- [ ] Feature works as intended
- [ ] Edge cases handled
- [ ] Error handling implemented

### Code Quality
- [ ] SOLID principles followed
- [ ] No code duplication
- [ ] Clear naming conventions
- [ ] Appropriate comments

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection prevented
- [ ] XSS prevention implemented

### Testing
- [ ] Unit tests present
- [ ] E2E tests for critical flows
- [ ] 80%+ coverage maintained

### Documentation
- [ ] README updated if needed
- [ ] API docs updated
- [ ] Complex logic commented

## Architecture Decisions

When making significant architectural changes:

1. Use the architect agent: `/plan` then select architect
2. Document decision in `docs/adr/` (Architecture Decision Records)
3. Discuss in PR before implementation
4. Update CLAUDE.md if it affects project guidelines

## Database Changes

For schema changes:

1. Create new migration in `supabase/migrations/`
2. Name format: `XXX_description.sql`
3. Include rollback plan
4. Test locally first
5. Document in PR

## Performance Considerations

- Optimize for First Contentful Paint < 1.5s
- Use Next.js Image component for images
- Implement pagination for lists
- Use React Server Components where possible
- Minimize client JavaScript

## Security Considerations

- Never commit secrets or API keys
- Validate all user input
- Use parameterized queries
- Implement rate limiting
- Enable RLS on all tables
- Regular dependency updates

## Questions?

- Check CLAUDE.md for project-specific guidelines
- Use `/help` in Claude Code
- Review ECC documentation in `.claude/`
- Ask in PR discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
