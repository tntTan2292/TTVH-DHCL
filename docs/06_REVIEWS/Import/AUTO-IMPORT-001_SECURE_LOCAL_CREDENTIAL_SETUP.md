# AUTO-IMPORT-001 Secure Local Credential Setup

- Ticket: `AUTO-IMPORT-001`
- Checkpoint: `1 - Secure Local Credential Setup`
- Status: `READY FOR PO LOCAL INPUT`
- Date: `2026-07-19`

## Observed Authority

- Product Owner provided portal URL: `https://dkcl.vnpost.vn/`
- Product Owner will enter two account groups locally: the Huế operational account for detailed Huế shipment data, and the Tổng công ty / nationwide account for later national summary, provincial comparison, and Huế ranking discovery.
- Codex must not expose credentials, cookies, tokens, session IDs, personal information, or downloaded sensitive data in chat, logs, screenshots, commits, or documentation.

## Local Files

- Tracked placeholder template: `.env.example`
- Local ignored credential file for Product Owner input: `.env`

## Security Controls Added

- `.env`, `.env.local`, and `.env.*.local` are ignored.
- Local portal browser/session storage folders are ignored.
- Local portal download folders are ignored unless the file is placed in an already approved ignored local folder.
- `.env.example` contains placeholders only for `PORTAL_HUE_USERNAME`, `PORTAL_HUE_PASSWORD`, `PORTAL_NATIONAL_USERNAME`, and `PORTAL_NATIONAL_PASSWORD`.

## Account Isolation Requirement

- Checkpoint 2A must use only `PORTAL_HUE_USERNAME` and `PORTAL_HUE_PASSWORD`.
- Checkpoint 2B must not execute until Product Owner authorizes it.
- Before Checkpoint 2B, the Huế session must be ended or isolated, and Codex must document whether logout, separate browser profiles, incognito contexts, or isolated session storage is required.
- The two account sessions must not share cached identity unexpectedly.

## Stop Condition

No login attempt has been performed.

Next action requires Product Owner confirmation that the local `.env` file has been filled with both the Huế operational account group and the Tổng công ty / nationwide account group.
