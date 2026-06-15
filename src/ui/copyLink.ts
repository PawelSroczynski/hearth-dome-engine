import { encodeState } from '../core/share';
import { currentSnapshot } from '../store';

/** Build a permalink for the current configuration, write it to the hash + clipboard. */
export async function copyShareLink(): Promise<string> {
  const token = encodeState(currentSnapshot());
  const url = `${location.origin}${location.pathname}#s=${token}`;
  history.replaceState(null, '', `#s=${token}`);
  try { await navigator.clipboard.writeText(url); } catch { /* clipboard may be blocked; hash still set */ }
  return url;
}
