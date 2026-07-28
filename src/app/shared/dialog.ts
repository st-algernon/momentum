/** Shared width for every MatDialog in the app. Lives in its own module (rather than on a
 *  component that happens to open dialogs) so eagerly-loaded code can reference it without
 *  pulling a component — and its whole import chain — out of a lazy chunk. */
export const DIALOG_WIDTH = 'min(520px, calc(100vw - 28px))';
