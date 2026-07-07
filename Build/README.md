# Frontend build (TypeScript / SCSS / Font Awesome)

The backend assets of this extension are compiled from sources under
`Build/Sources/` into `Resources/Public/`. The **compiled artifacts are
committed** to the repository; a GitHub workflow (`.github/workflows/build-assets.yml`)
fails a pull request if they are out of date with the sources.

## Sources → artifacts

| Source                                             | Artifact                                   |
|----------------------------------------------------|--------------------------------------------|
| `Build/Sources/TypeScript/kanban-workspaces/*.ts`  | `Resources/Public/JavaScript/*.js`         |
| `Build/Sources/Sass/styles.scss`                   | `Resources/Public/Css/Styles.css`          |
| `@fortawesome/fontawesome-free` (npm)              | `Resources/Public/Css/Fontawesome.min.css` |
| `@fortawesome/fontawesome-free` (npm)              | `Resources/Public/webfonts/*.woff2`        |

TypeScript is transpiled 1:1 with `tsc` (no bundling): import specifiers such as
`@web-vision/kanban-workspaces/...` and `@typo3/...` are preserved and resolved
at runtime by the TYPO3 backend import map. This mirrors the TYPO3 core approach.

## Running the build

The build runs in a Node.js container through the test runner (no local Node
required):

```bash
# Compile the TypeScript modules
Build/Scripts/runTests.sh -s buildJavascript

# Compile the SCSS and publish the Font Awesome artifacts
Build/Scripts/runTests.sh -s buildCss
```

After changing anything under `Build/Sources/` (or bumping the Font Awesome
version in `Build/package.json`), re-run both suites and commit the regenerated
files in `Resources/Public/`.

## Working directly with npm

Inside the container (`Build/` is the npm project root):

```bash
npm ci             # install the pinned toolchain from package-lock.json
npm run build      # build:js + build:css (+ Font Awesome)
npm run build:js
npm run build:css
```

A linting layer (eslint for TypeScript, stylelint for SCSS) is a natural
follow-up on top of this scaffold; it is intentionally out of scope for the
initial build introduction.
