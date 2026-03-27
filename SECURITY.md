# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | Yes                |
| < 0.1   | No                 |

## Reporting a Vulnerability

If you discover a security vulnerability in GridStorm, please report it
responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email**: Send a detailed report to **gridstorm@proton.me**
2. **GitHub**: Use [GitHub Security Advisories](https://github.com/007krcs/grid-data/security/advisories/new) to privately report the vulnerability

### What to Include

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix timeline**: Depends on severity
  - Critical: Patch within 48 hours
  - High: Patch within 1 week
  - Medium: Patch in next minor release
  - Low: Patch in next release cycle

### Security Practices

GridStorm follows these security practices:

- **Dependency scanning**: Dependabot monitors all dependencies for known vulnerabilities
- **Code scanning**: CodeQL runs on every PR and weekly on the main branch
- **No innerHTML by default**: Cell renderers use `textContent` unless explicitly opted in via `dangerouslySetInnerHTML: true`
- **Immutable state**: All state mutations go through the command bus, preventing direct tampering
- **Type safety**: Strict TypeScript prevents common injection vectors
- **Command validation**: Optional runtime payload validation prevents malformed data

## Disclosure Policy

We follow coordinated disclosure. We will:

1. Confirm receipt of your report
2. Assess the vulnerability and determine impact
3. Develop and test a fix
4. Release the fix and publish a security advisory
5. Credit you in the advisory (unless you prefer anonymity)
