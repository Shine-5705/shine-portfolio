# Contributing to Shine Gupta Portfolio

Thank you for considering contributing to this project! This document outlines the process and guidelines for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Security Guidelines](#security-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a code of conduct to ensure a welcoming environment for everyone:

### Our Standards

- **Be respectful** and inclusive in all interactions
- **Be collaborative** and supportive of other contributors
- **Be constructive** when providing feedback
- **Be patient** with newcomers and questions
- **Focus on the project** and avoid personal attacks

### Unacceptable Behavior

- Harassment, discrimination, or offensive language
- Personal attacks or trolling
- Sharing private information without permission
- Any behavior that would be inappropriate in a professional setting

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- Basic knowledge of TypeScript, Astro, and web development

### Development Environment

1. Fork the repository
2. Clone your fork locally
3. Install dependencies
4. Set up environment variables
5. Start development server

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Shine-5705/shine-portfolio.git
cd shine-portfolio

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your environment variables
# Edit .env with your API keys and configuration

# Start development server
npm run dev
```

### Environment Variables

Required environment variables:

```env
RESEND_API_KEY=your_resend_api_key
CSRF_SECRET=your_random_32_character_secret
SITE_URL=http://localhost:4321
```

## Contributing Process

### 1. Choose an Issue

- Check existing issues for bugs or feature requests
- Create a new issue if needed
- Comment on the issue to claim it
- Wait for maintainer approval before starting work

### 2. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 3. Make Changes

- Write clean, maintainable code
- Follow coding standards
- Add tests for new functionality
- Update documentation as needed
- Ensure security best practices

### 4. Test Your Changes

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (if available)
npm run test

# Build project
npm run build

# Preview production build
npm run preview
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow ESLint configuration
- Use descriptive variable and function names
- Add JSDoc comments for complex functions
- Prefer functional programming patterns

```typescript
// Good
const calculateProjectsCount = (projects: Project[]): number => {
  return projects.filter(project => project.isActive).length;
};

// Bad
const calc = (p: any) => {
  return p.filter(x => x.isActive).length;
};
```

### CSS/SCSS

- Use SCSS modules for component styling
- Follow BEM naming convention
- Use CSS custom properties for theming
- Ensure responsive design principles
- Follow accessibility guidelines

```scss
// Good
.projectCard {
  &__title {
    @include font.heading-small;
    color: colour.$text-primary;
  }
  
  &--featured {
    border: 2px solid colour.$primary;
  }
}
```

### Astro Components

- Use TypeScript for props interface
- Extract reusable logic to utilities
- Follow component composition patterns
- Add proper accessibility attributes

```astro
---
interface Props {
  title: string;
  description?: string;
  featured?: boolean;
}

const { title, description, featured = false } = Astro.props;
---

<article class:list={['project-card', { 'project-card--featured': featured }]}>
  <h3>{title}</h3>
  {description && <p>{description}</p>}
</article>
```

## Testing Guidelines

### Types of Tests

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows
4. **Performance Tests**: Validate performance metrics

### Writing Tests

- Test happy path and edge cases
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

```typescript
describe('calculateProjectsCount', () => {
  it('should return count of active projects', () => {
    // Arrange
    const projects = [
      { id: 1, isActive: true },
      { id: 2, isActive: false },
      { id: 3, isActive: true }
    ];
    
    // Act
    const result = calculateProjectsCount(projects);
    
    // Assert
    expect(result).toBe(2);
  });
});
```

## Security Guidelines

### Secure Coding Practices

- **Input Validation**: Sanitize all user inputs
- **Output Encoding**: Encode data for different contexts
- **Authentication**: Use secure authentication methods
- **Authorization**: Implement proper access controls
- **Error Handling**: Don't expose sensitive information

### Security Checklist

- [ ] No hardcoded secrets or API keys
- [ ] Proper input validation and sanitization
- [ ] Secure error handling
- [ ] HTTPS enforcement
- [ ] Security headers implemented
- [ ] Dependencies regularly updated
- [ ] Rate limiting in place

### Common Security Pitfalls

```typescript
// Bad - XSS vulnerability
element.innerHTML = userInput;

// Good - Safe rendering
element.textContent = userInput;

// Bad - Exposed API key
const API_KEY = 'sk-1234567890abcdef';

// Good - Environment variable
const API_KEY = process.env.API_KEY;
```

## Pull Request Process

### Before Submitting

1. Ensure your branch is up to date with main
2. Run all tests and linting
3. Update documentation if needed
4. Add entry to changelog if significant

### PR Requirements

- **Clear Title**: Descriptive title explaining the change
- **Description**: Explain what and why changes were made
- **Testing**: Describe how changes were tested
- **Screenshots**: Include screenshots for UI changes
- **Breaking Changes**: Highlight any breaking changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass
- [ ] Linting passes
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: Maintainer reviews code quality and security
3. **Testing**: Manual testing of changes
4. **Approval**: Maintainer approves changes
5. **Merge**: Changes merged to main branch

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- **Environment**: OS, browser, Node version
- **Steps to Reproduce**: Clear reproduction steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Additional Context**: Any other relevant information

### Feature Requests

Use the feature request template and include:

- **Problem Statement**: What problem does this solve
- **Proposed Solution**: How would you like it implemented
- **Alternatives**: Any alternative solutions considered
- **Additional Context**: Any other relevant information

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to documentation
- `security` - Security-related issues
- `performance` - Performance improvements
- `accessibility` - Accessibility improvements
- `good first issue` - Good for newcomers

## Development Workflow

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

Examples:
```
feat(contact): add honeypot spam protection
fix(middleware): resolve rate limiting memory leak
docs(readme): update installation instructions
```

### Release Process

1. Version bump following semantic versioning
2. Update changelog
3. Create release notes
4. Tag release
5. Deploy to production

## Resources

### Documentation

- [Astro Documentation](https://docs.astro.build)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SCSS Documentation](https://sass-lang.com/documentation)
- [Three.js Documentation](https://threejs.org/docs/)

### Tools

- [ESLint](https://eslint.org/) - Linting
- [Prettier](https://prettier.io/) - Code formatting
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance auditing

## Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Create a new issue with the question label
3. Reach out to maintainers

Thank you for contributing to make this project better!
