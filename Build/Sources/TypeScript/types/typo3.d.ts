// Ambient declarations for TYPO3 core JavaScript modules consumed via the
// backend import map. The extension does not bundle these; they are resolved
// at runtime by TYPO3. Typed loosely on purpose - the extension only relies on
// a small, stable part of their public API.
declare module '@typo3/*';
