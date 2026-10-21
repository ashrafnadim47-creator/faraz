# FORGE Core

The existing `js/` editor modules remain the implementation. `core/index.js` is the shared public facade.

This lets Android, Desktop, and a future Web shell consume one editor core rather than three separate implementations.
