# Self-Hosting Your Own Diagrams

This guide covers the complete path from a local `.diagram.json` file to a diagram embedded in a
website. It is intended for developers who want to host both the DiaStream viewer and their diagram
files without a DiaStream account or hosted backend.

For viewer query parameters and iframe options, see the shorter
[embedding reference](embedding.md).

## Deployment Model

```txt
Local .diagram.json file
        |
        v
outputs/
        |
        | npm run build
        v
dist/diagrams/ + dist/viewer/ + dist/assets/
        |
        v
Static host such as Netlify, Amplify, or GitHub Pages
        |
        v
iframe in a blog or documentation site
```

The viewer fetches the Diagram JSON in the visitor's browser. No server-side rendering, database,
upload API, or DiaStream service is involved.

## 1. Prepare the Repository

Clone DiaStream and install its dependencies:

```sh
git clone https://github.com/gyugyu90/DiaStream.git
cd DiaStream
nvm install
nvm use
npm install
```

## 2. Save Your Diagram

Use `create-diagram`, or create and edit a diagram in the local editor, to produce a file such as:

```txt
checkout-flow.diagram.json
```

Use a URL-safe filename containing lowercase letters, numbers, and hyphens. Do not put secrets,
credentials, private hostnames, or other sensitive data in a diagram that will be publicly hosted.

## 3. Add the Diagram to the Static Site

`create-diagram` writes new files to `outputs/` by default. The local editor home page automatically
lists valid `outputs/**/*.diagram.json` files after refresh. For an existing file saved elsewhere,
place it there before committing:

```sh
mkdir -p outputs
cp /absolute/path/to/checkout-flow.diagram.json outputs/
```

Validate the file before committing it:

```sh
npm run diagrams:validate -- outputs/checkout-flow.diagram.json
```

The production build packages every Diagram JSON file under `outputs/` into `dist/diagrams/`. After
a production build, the source file above is therefore available at:

```txt
dist/diagrams/checkout-flow.diagram.json
```

Commit the source Diagram JSON, not the generated `dist/` directory:

```sh
git add outputs/checkout-flow.diagram.json
git commit -m "Add checkout flow diagram"
```

Each later commit to the same file can update every iframe that references its stable URL after the
static host finishes deploying.

## 4. Build and Test Locally

Create the production output:

```sh
npm run build
```

Confirm that the Diagram JSON was included:

```sh
test -f dist/diagrams/checkout-flow.diagram.json
```

Start the production preview:

```sh
npm run preview
```

Then open:

```txt
http://127.0.0.1:4173/viewer/?src=/diagrams/checkout-flow.diagram.json
```

The exact preview port is printed by Vite and may differ when port `4173` is already in use.

## 5. Deploy with Netlify

Connect the Git repository to Netlify and use these build settings:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node.js version | Read from `.nvmrc` |

You can enter these values in the Netlify UI or create a `netlify.toml` file at the repository root:

```toml
[build]
command = "npm run build"
publish = "dist"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

Do not add `force = true` to this rewrite. Netlify's normal static-file shadowing allows the real
`/viewer/index.html`, `/assets/*`, and `/diagrams/*` files to be served before the SPA fallback.

After deployment, verify both URLs directly:

```txt
https://YOUR-SITE.netlify.app/diagrams/checkout-flow.diagram.json
https://YOUR-SITE.netlify.app/viewer/?src=/diagrams/checkout-flow.diagram.json
```

The first URL should return JSON. The second should render the diagram.

## 6. Embed the Viewer

Use the deployed viewer URL in a blog, documentation site, or wiki:

```html
<iframe
  src="https://YOUR-SITE.netlify.app/viewer/?src=/diagrams/checkout-flow.diagram.json"
  width="100%"
  height="520"
  loading="lazy"
  title="Checkout architecture"
></iframe>
```

If the diagram contains multiple scenes, the viewer displays scene navigation by default. You can
select an initial scene or hide the controls with query parameters documented in
[embedding.md](embedding.md).

## Manual Deployment Without Git

For a one-off drag-and-drop deployment, build first and copy the Diagram JSON afterward:

```sh
npm run build
cp /absolute/path/to/checkout-flow.diagram.json dist/diagrams/
```

Upload the complete `dist/` directory to the static host. Copying must happen after
`npm run build`, because each build recreates `dist/` and removes files that were added there by
hand.

## Hosting the JSON Separately

The viewer and Diagram JSON do not need to use the same host. An external source URL is supported:

```html
<iframe
  src="https://viewer.example.com/viewer/?src=https%3A%2F%2Ffiles.example.com%2Fcheckout-flow.diagram.json"
  width="100%"
  height="520"
  title="Checkout architecture"
></iframe>
```

For external JSON hosting:

- encode the absolute JSON URL before placing it in the `src` query parameter;
- allow the viewer origin with the JSON host's CORS response headers;
- allow the JSON origin in the viewer host's Content Security Policy `connect-src`, if one is set;
- serve both the viewer and JSON over HTTPS;
- make the JSON publicly readable, because the viewer has no authentication integration.

## Updating a Published Diagram

To update an existing embed without changing the iframe:

1. Edit the local `.diagram.json` file in DiaStream.
2. Replace the copy under `outputs/` while keeping the same filename.
3. Validate, commit, and push the change.
4. Wait for the static host to deploy the new build.

If the old diagram remains visible after deployment, check the host or CDN cache. For deployments
that require immutable files, use a versioned filename such as `checkout-flow-v2.diagram.json` and
update the iframe URL.

## Troubleshooting

### The JSON URL returns the application HTML

The SPA rewrite is overriding static files. On Netlify, remove `force = true` or `200!`. On another
host, exclude `.json`, `/assets/*`, and `/viewer/*` from a forced SPA rewrite.

### The viewer reports a fetch or CORS error

Open the JSON URL directly. If it works in a tab but the viewer still cannot fetch it, inspect the
JSON response's CORS headers and the viewer page's Content Security Policy.

### The viewer reports a schema error

Validate the exact deployed source file locally:

```sh
npm run diagrams:validate -- outputs/checkout-flow.diagram.json
```

The viewer build and Diagram JSON must support the same `schemaVersion`.

### A newly saved local file is missing from the deployment

Files in Downloads or another local folder are not available to Netlify's build machine. Copy the
file into `outputs/`, commit it, and push it to the connected Git repository.
