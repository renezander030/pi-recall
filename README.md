# pi-recall

`pi-recall` is a standalone Pi extension that gives the Pi agent a recall
surface for trusted project knowledge.

It is intentionally not the graph engine. Its first backend is
[`pi-codegraph`](https://github.com/renezander030/pi-codegraph), which wraps
`codebase-memory-mcp`, owns the codegraph trust registry, and performs derived
code queries. `pi-recall` is the Pi-facing command/tool layer over that backend.

## Install

Install this package as a Pi package or load the extension directly:

```sh
pi --extension ./src/index.ts
```

When installed as a package, `package.json` advertises:

```json
"pi": {
  "extensions": ["./src/index.ts"]
}
```

`pi-recall` bundles the small `pi-codegraph` wrapper so the extension can run
inside an uploaded Pi/OpenShell package without depending on a host path. It
resolves the backend in this order:

1. `PI_RECALL_CODEGRAPH_BIN`
2. `PI_CODEGRAPH_BIN`
3. bundled `vendor/pi-codegraph/pi-codegraph`
4. `pi-codegraph` on `PATH`

## Commands

| Command | Purpose |
|---|---|
| `/recall-status` | Show backend status and trusted repos. |
| `/recall-trust [label]` | Trust the current repo for recall. |
| `/recall <query>` | Semantic recall through `pi-codegraph search`. |
| `/recall-arch` | Architecture overview. |
| `/recall-impact` | Blast radius for the current diff. |
| `/recall-help` | Show command summary. |

## Agent Tool

`pi-recall` also registers `recall_codegraph`, an agent-callable tool for:

- `search`
- `arch`
- `impact`
- `schema`

The tool does not bypass backend trust. If a repo is not trusted, the model
should ask the user to run `/recall-trust` instead of using an override.

## Scope

`pi-recall` can become a multi-backend recall extension later. Today it is a
small standalone Pi extension with one backend: `pi-codegraph`.
