# TODO

## Upgrade Local Node.js Runtime

Current local development is running on Node.js 18. Some modern dev tools already expect Node.js 20 or newer.

Observed impact:

- Latest `vitest` requires Node.js 20+.
- Latest `jsdom` requires Node.js 20+.
- The project currently pins older test tooling versions to keep tests working on Node.js 18.

Recommended upgrade:

- Upgrade local Node.js to Node.js 20 LTS or newer.
- After upgrading, update `vitest` and `jsdom` to their latest compatible versions.
- Run:

```sh
npm install
npm run check
```

The project should keep passing `npm run check` after the upgrade.
