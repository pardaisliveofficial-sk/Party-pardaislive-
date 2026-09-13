# Railway Build Fix v13

Fixed the Vite/ESBuild parser error reported by GitHub Actions:

`src/App.tsx:19591:36 ERROR: Unterminated regular expression`

Cause: one extra closing `</div>` existed immediately before the PK conditional branch. It caused the JSX parser to become unbalanced and interpret the following JSX as an unterminated regular expression.

Fix: removed only that stray `</div>` and preserved the surrounding Guest/PK JSX structure and handlers.

Version remains 1.0.8 / Version Code 9.
