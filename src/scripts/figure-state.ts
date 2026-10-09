/**
 * Shared figure state, so the static SVG and the optional 3D scene follow the
 * same story beat and highlight. The 3D scene subscribes via subscribe().
 */
export interface FigureState {
  /** Story step 0-6 (0 = before the first step). */
  beat: number;
  /** Channel pinned from the legend, if any. */
  pinned: string | null;
  /** Channel previewed by hover or focus, if any. */
  preview: string | null;
}

type Listener = (state: Readonly<FigureState>, active: string) => void;
const listeners = new Set<Listener>();
let last: { state: FigureState; active: string } | null = null;

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (last) listener(last.state, last.active);
  return () => listeners.delete(listener);
}

export function onFigureState(state: FigureState, active: string): void {
  last = { state: { ...state }, active };
  for (const l of listeners) l(last.state, active);
}
