# Security Policy

## Supported Versions

Active development is on `master`. Sub-packages may publish independently; the latest published release of each is supported.

repo-intelligence ingests dependency data, GitHub metadata, and CI logs. Vulnerabilities (GitHub-token leak, CVE-data injection, SSRF in fetchers, scoring tampering) are treated as serious.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security reports.

Email **contact@lan-nguyen-si.de** with:

- Affected sub-package
- Reproduction steps or proof-of-concept
- Impact assessment

You will get an acknowledgement within 72 hours and an initial assessment within 7 days. A fix timeline depends on severity and complexity, communicated in the assessment.
