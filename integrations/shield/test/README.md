# SHIELD integration test folder

This folder contains the **test fixture** (`shield.md`) and **integration test** that run conversion and verify. The **scope adapters** live in [../adapters/](../adapters/): [index.js](../adapters/index.js) imports each scope adapter (e.g. [system-command-execute.js](../adapters/system-command-execute.js) for `tool.call` → `system.command.execute`) and is also the CLI entry point when run as a script.

## Contents

| File | Description |
|------|-------------|
| `shield.md` | Example [SHIELD v0](https://nova-hunting.github.io/shield.md/) threat feed (tool scope: block `rm -rf`, require approval for `sudo`). Policy is always generated from this file via the adapters. |
| `test-shield-to-verify.js` | Integration tests: (1) conversion via adapters, (2) APort verify with policy-in-body, (3) response shape. |

## Flow

1. **SHIELD** (`shield.md`) defines threats.
2. **Adapters** ([../adapters/index.js](../adapters/index.js)) parse the feed and delegate by scope; [system-command-execute.js](../adapters/system-command-execute.js) handles `tool.call` → OAP `system.command.execute` policy + limits.
3. **Verify:** `POST /api/verify/policy/IN_BODY` with that policy and passport.
4. **Response** fits OAP; deny can follow SHIELD block format.

## Run the adapter (CLI)

Run [../adapters/index.js](../adapters/index.js) as a script:

```bash
# From repo root (default: test/shield.md)
node spec/integrations/shield/adapters/index.js
# Explicit path
node spec/integrations/shield/adapters/index.js spec/integrations/shield/test/shield.md
```

Output: JSON with `policy`, `limitsFragment`, and `threats`. For policy-only or limits-only:

```bash
SHIELD_OUTPUT=policy  node spec/integrations/shield/adapters/index.js spec/integrations/shield/test/shield.md
SHIELD_OUTPUT=limits  node spec/integrations/shield/adapters/index.js spec/integrations/shield/test/shield.md
```

## Run the tests

**API base URL:**

- **Not local (default, e.g. CI):** Uses live API `https://api.aport.io`. No env needed.
- **Local:** Set `LOCAL=1` (or `RUN_LOCAL=1` or `APORT_VERIFY_LOCAL=1`) and start the dev server (e.g. `npm run dev` or `wrangler dev`) at `http://localhost:8787`.
- **Override:** `APORT_API_BASE_URL` overrides the default (e.g. `APORT_API_BASE_URL=http://localhost:8787`).

```bash
# Use live API (default when not local)
node spec/integrations/shield/test/test-shield-to-verify.js

# Use local dev server
LOCAL=1 node spec/integrations/shield/test/test-shield-to-verify.js

# Explicit base URL
APORT_API_BASE_URL=https://api.aport.io node spec/integrations/shield/test/test-shield-to-verify.js
```

**Test coverage:** Conversion (shield.md → policy + limits via adapters), APort verify (allow/deny), response shape (deny code and message).

See [../README.md](../README.md) for SHIELD↔OAP mapping and adapter strategy.
