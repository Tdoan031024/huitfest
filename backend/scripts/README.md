# Backend Utility Scripts

This folder contains ad-hoc utilities used for diagnostics, data inspection, and one-time migrations.

## Structure

- `dev/*.ts`: TypeScript helper scripts moved out of `src` to keep runtime code clean.
- `inspect-timeline-items.js`: Timeline inspection helper.
- `sync-timeline-table.js`: Timeline sync helper.

## Run Examples

From `backend`:

```bash
npm run admin:create -- <username> <password>
```

```bash
npx ts-node scripts/dev/check-slugs.ts
npx ts-node scripts/dev/view-config-v4.ts
npx ts-node scripts/dev/test-rules-save.ts
```

Notes:

- These scripts are not part of the backend build output.
- Keep production runtime code inside `src/` only.
