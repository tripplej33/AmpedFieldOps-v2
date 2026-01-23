# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in AmpedFieldOps V2, please **do not** create a public GitHub issue. Instead, please email security information to the project maintainers privately.

## Security Best Practices

### For Developers
- Never commit `.env` files or secrets to the repository
- Use environment variables for sensitive configuration
- Keep dependencies updated: `npm audit` and `npm update`
- Review third-party dependencies before adding them
- Sanitize user input before processing

### For Users
- Keep your environment variables secure
- Use strong, unique passwords for authentication
- Enable 2FA on your GitHub account
- Report suspicious activity immediately
- Keep your deployment environment updated

## Dependencies

This project uses:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Supabase** - Backend as a Service
- **TailwindCSS** - Styling

All dependencies are kept up to date and regularly audited for vulnerabilities.

## Vulnerability Response

When a vulnerability is reported:
1. We will acknowledge receipt within 48 hours
2. We will investigate and assess the severity
3. We will prepare a fix and security advisory
4. We will release a patched version as soon as possible
5. We will publicly disclose the vulnerability

## Responsible Disclosure

We appreciate responsible disclosure and ask that you:
- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing other users' data or accounts
- Avoid disrupting our services
- Keep the vulnerability confidential until we release a fix

Thank you for helping keep AmpedFieldOps V2 secure!
