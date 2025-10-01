# Contributing to Open Agent Passport (OAP)

Thank you for your interest in contributing to the Open Agent Passport specification! This document provides guidelines for contributing to the OAP specification, tooling, and documentation.

## How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the issue templates** when available
3. **Provide clear reproduction steps** for bugs
4. **Include relevant logs** and error messages

### Suggesting Enhancements

For feature requests or specification changes:

1. **Check existing proposals** in the issues
2. **Describe the use case** and problem being solved
3. **Provide examples** of how the change would work
4. **Consider backward compatibility** implications

### Submitting Changes

1. **Fork the repository**
2. **Create a feature branch** from `main`
3. **Make your changes** following our guidelines
4. **Add tests** for new functionality
5. **Update documentation** as needed
6. **Submit a pull request**

## Development Guidelines

### Specification Changes

When modifying the OAP specification:

#### Schema Changes
- **Update JSON schemas** in `oap/` directory
- **Maintain backward compatibility** when possible
- **Add migration notes** for breaking changes
- **Update examples** to reflect changes

#### Documentation Updates
- **Update specification documents** in `oap/`
- **Revise examples** to match new schemas
- **Update changelog** with detailed change descriptions
- **Increment version** appropriately

### Code Contributions

#### Conformance Testing
- **Add test cases** for new functionality
- **Update existing tests** when schemas change
- **Ensure all tests pass** before submitting
- **Add performance benchmarks** for critical paths

#### VC Tools
- **Follow TypeScript best practices**
- **Add comprehensive error handling**
- **Include unit tests** for new functions
- **Update CLI help** and documentation

#### API Documentation
- **Update OpenAPI specifications** when endpoints change
- **Add JSDoc comments** for new functions
- **Include request/response examples**
- **Update error schemas** as needed

### Documentation Standards

#### Writing Style
- **Use clear, concise language**
- **Provide practical examples**
- **Include code snippets** where helpful
- **Link to related specifications**

#### Formatting
- **Use Markdown** for documentation
- **Follow consistent heading structure**
- **Include table of contents** for long documents
- **Use code blocks** with language specification

#### Examples
- **Provide realistic examples**
- **Include both success and error cases**
- **Use consistent naming conventions**
- **Add explanatory comments**

## Review Process

### Pull Request Requirements

1. **Clear description** of changes made
2. **Reference to related issues** if applicable
3. **Updated tests** and documentation
4. **Breaking change notice** if applicable
5. **Migration guide** for significant changes

### Review Criteria

Reviewers will check for:

- **Specification compliance** with OAP standards
- **Code quality** and best practices
- **Test coverage** and accuracy
- **Documentation completeness**
- **Backward compatibility** considerations
- **Performance implications**

### Review Timeline

- **Initial review**: Within 3 business days
- **Follow-up reviews**: Within 1 business day
- **Final approval**: Within 5 business days
- **Merge**: After approval and CI passes

## Development Setup

### Prerequisites

- **Node.js** 18+ and npm/pnpm
- **TypeScript** 5.0+
- **Git** for version control

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/aporthq/aport-spec.git
   cd aport-spec
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Run tests**:
   ```bash
   npm test
   # or
   pnpm test
   ```

4. **Run conformance tests**:
   ```bash
   cd conformance
   npm test
   ```

### Testing

#### Conformance Testing
```bash
# Run all conformance tests
npm run test:conformance

# Run specific test suite
npm run test:conformance -- --suite payments.refund.v1

# Run with verbose output
npm run test:conformance -- --verbose
```

#### VC Tools Testing
```bash
# Run VC conversion tests
cd oap/vc/tools
npm test

# Test CLI tools
npm run test:cli
```

#### API Testing
```bash
# Test OpenAPI generation
npm run generate:openapi
npm run test:openapi
```

## Code Style

### TypeScript
- **Use strict mode** and enable all strict checks
- **Prefer interfaces** over types for object shapes
- **Use meaningful variable names**
- **Add JSDoc comments** for public APIs
- **Follow ESLint configuration**

### JSON Schemas
- **Use descriptive titles** and descriptions
- **Include examples** for complex schemas
- **Use consistent property ordering**
- **Validate schemas** before committing

### Markdown
- **Use consistent heading levels**
- **Include table of contents** for long documents
- **Use code blocks** with language specification
- **Link to related documents**

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes to the specification
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Checklist

1. **Update version numbers** in all relevant files
2. **Update changelog** with detailed change descriptions
3. **Run full test suite** and ensure all tests pass
4. **Update documentation** to reflect changes
5. **Create release notes** highlighting key changes
6. **Tag the release** with appropriate version number

### Breaking Changes

For breaking changes:

1. **Provide migration guide** with step-by-step instructions
2. **Maintain deprecation period** of at least 6 months
3. **Update all examples** to use new format
4. **Notify community** through appropriate channels

## Community Guidelines

### Communication

- **Be respectful** and constructive in all interactions
- **Ask questions** if something is unclear
- **Help others** when you can
- **Follow the code of conduct**

### Getting Help

- **Check documentation** first
- **Search existing issues** for similar problems
- **Ask questions** in GitHub discussions
- **Join community forums** for broader discussions

### Recognition

Contributors will be recognized in:

- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **Community highlights** for outstanding work

## License

By contributing to the Open Agent Passport specification, you agree that your contributions will be licensed under the same MIT License that covers the project.

## Questions?

If you have questions about contributing, please:

1. **Check this document** for answers
2. **Search existing issues** for similar questions
3. **Create a new issue** with the "question" label
4. **Join our community discussions**

Thank you for contributing to the Open Agent Passport specification!
