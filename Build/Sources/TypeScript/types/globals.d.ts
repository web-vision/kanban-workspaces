// Global augmentations for the browser environment the workspace board runs in.
// `TYPO3` is provided by the backend runtime, `WorkspaceConfig` is inlined by
// the Fluid template, and `workspaceBoard` is exposed for debugging.
declare const TYPO3: any;

interface Window {
  TYPO3?: any;
  WorkspaceConfig?: any;
  workspaceBoard?: any;
}
