# Self-Hosted Embedding

DiaFlow's MVP embed path is self-hosted. You host the built viewer files and your
`.diagram.json` files on static hosting you control, then place an iframe in your documentation.

No DiaFlow account, database, upload API, or hosted diagram service is required.

## Viewer URL

```txt
/viewer/?src=/diagrams/checkout.diagram.json
```

Required query parameters:

| Parameter | Description |
| --- | --- |
| `src` | URL of the Diagram JSON file to render. Relative and absolute URLs are supported. |

Optional query parameters:

| Parameter | Description |
| --- | --- |
| `scene` | Initial scene ID to render. The viewer shows an error when the ID is not in the diagram. |
| `interactive` | `1` or `0`. Defaults to `1`. Disable to render a fixed read-only SVG view. |
| `animations` | `1` or `0`. Defaults to `1`. Disable to stop flow animations. |

## Iframe Snippet

```html
<iframe
  src="/viewer/?src=/diagrams/checkout.diagram.json"
  width="100%"
  height="520"
  loading="lazy"
  title="Checkout architecture"
></iframe>
```

For a specific scene:

```html
<iframe
  src="/viewer/?src=/diagrams/checkout.diagram.json&scene=scene_normal"
  width="100%"
  height="520"
  loading="lazy"
  title="Checkout architecture"
></iframe>
```

## Static Hosting Layout

`npm run build` prepares a self-hosted embed bundle in `dist/`:

```txt
dist/
  viewer/
    index.html
  embed/
    index.html
  assets/
  diagrams/
    basic-web-architecture.diagram.json
    circuit-breaker-scenes.diagram.json
    pkce-oauth2-flow.diagram.json
```

When DiaFlow is hosted at the site root, use `/viewer/?src=/diagrams/checkout.diagram.json`.
If your host serves DiaFlow under a subdirectory, keep the `src` path relative to that deployment.

To test the bundled examples on your own static host, upload the generated `dist/` directory and
open `/embed/`. The example page embeds `/viewer/?src=/diagrams/basic-web-architecture.diagram.json`.

Example iframe snippets for the bundled diagrams:

```html
<iframe
  src="/viewer/?src=/diagrams/basic-web-architecture.diagram.json"
  width="100%"
  height="520"
  loading="lazy"
  title="Basic Web Architecture"
></iframe>
```

```html
<iframe
  src="/viewer/?src=/diagrams/circuit-breaker-scenes.diagram.json&scene=scene_normal"
  width="100%"
  height="520"
  loading="lazy"
  title="Circuit Breaker Scenes"
></iframe>
```

```html
<iframe
  src="/viewer/?src=/diagrams/pkce-oauth2-flow.diagram.json"
  width="100%"
  height="520"
  loading="lazy"
  title="PKCE OAuth2 Authentication Flow"
></iframe>
```

## Requirements

- The viewer must be able to fetch the Diagram JSON URL.
- If the JSON is on another origin, that origin must allow CORS for the viewer origin.
- Static hosts must serve `viewer/index.html` for `/viewer/`. If you use the editor app routes too,
  rewrite other client routes to the root `index.html`.
- The Diagram JSON must match the current `schemaVersion` supported by this build.

## Version Pinning

`npm run build` creates a separate viewer artifact at `dist/viewer/index.html` and packages bundled
example diagrams under `dist/diagrams/`. Host the generated `dist/viewer/`, `dist/assets/`, and
whichever `.diagram.json` files your embeds reference together with your documentation release. The
viewer root exposes `data-viewer-version` with the build version so deployed embeds can be inspected
later.

## Error States

The viewer renders an in-frame error for:

- missing `src`
- failed network request or blocked CORS request
- non-2xx HTTP response
- invalid JSON
- schema or reference validation failure
- unsupported `schemaVersion`
- unknown `scene` ID

## Current Limitations

- The viewer is read-only.
- There is no hosted DiaFlow diagram storage.
- There is no `postMessage` control API yet.
- There is no script embed or React SDK yet.
- The viewer artifact and shared assets must be deployed together from the same build.
