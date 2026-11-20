# OpenAdvent

OpenAdvent is a cozy browser-based advent calendar with 25 doors. The V1
calendar reveals a compliment behind each door and remembers opened doors in
the current browser.

## Requirements

- Node.js 20 or newer
- npm

## Local Development

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite. Changes reload automatically.

## Verification

Run the tests, including interaction, persistence, and accessibility coverage:

```bash
npm test
```

Run the code-quality checks:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Architecture

The React components receive calendar state and callbacks through props. The
calendar controller coordinates opening doors and restoring progress through
the `AdventService` and `OpenedAdventStore` interfaces. V1 supplies compliments
from bundled JSON and stores only the opened day numbers in browser
`localStorage`, keeping both implementations replaceable.
