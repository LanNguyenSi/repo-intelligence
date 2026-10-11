# Security Policy

## Supported Versions

Active development is on `master`. The packages are not published to a package registry; fixes land on `master`, which is the only supported version.

repo-intelligence reads GitHub metadata (pull requests and their files, GitHub Actions workflow runs and jobs) and local repository files. Vulnerabilities such as a GitHub-token leak, a webhook signature bypass in devreview, unauthorized access to ci-insights data or sync endpoints, or scoring tampering are treated as serious.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security reports.

Email **contact@lan-nguyen-si.de** with:

- Affected sub-package
- Reproduction steps or proof-of-concept
- Impact assessment

You will get an acknowledgement within 72 hours and an initial assessment within 7 days. A fix timeline depends on severity and complexity, communicated in the assessment.
