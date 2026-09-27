/**
 * TextareaBinding — binds an uncontrolled <textarea> to a Y.Text.
 *
 * Why: the naive approach ("on every change replace the whole value") makes
 * remote keystrokes reset the textarea — typing at the bottom of a long field
 * jumped the view back to the top whenever another officer typed anywhere in
 * the same room (the Report Duck 1.0 complaint).
 *
 * This binding instead:
 *  - converts local edits into minimal Yjs delete/insert operations
 *    (common prefix/suffix diff), so peers receive small updates;
 *  - applies remote updates to the DOM with `setRangeText`, then restores the
 *    scroll position (sticking to the bottom only if the user was at the
 *    bottom) and remaps the caret so the user keeps typing where they were;
 *  - defers remote DOM writes until an active IME composition ends, so mobile
 *    keyboards (Cantonese / Pinyin) are not interrupted mid-word.
 *
 * The textarea must NOT be React-controlled — this binding owns its value.
 */

import * as Y from "yjs";

/** Transaction origin marking edits that came from this textarea. */
const LOCAL_ORIGIN = "report-duck-local-input";

interface Diff {
  start: number;
  removed: string;
  added: string;
}

/** Minimal single-span diff between two strings (common prefix + suffix). */
function diffStrings(oldStr: string, newStr: string): Diff {
  if (oldStr === newStr) return { start: 0, removed: "", added: "" };

  const minLen = Math.min(oldStr.length, newStr.length);
  let start = 0;
  while (start < minLen && oldStr.charCodeAt(start) === newStr.charCodeAt(start)) start++;

  // never split a surrogate pair at the prefix boundary
  if (start > 0 && start < oldStr.length && start < newStr.length) {
    const low = oldStr.charCodeAt(start);
    const high = oldStr.charCodeAt(start - 1);
    if (low >= 0xdc00 && low <= 0xdfff && high >= 0xd800 && high <= 0xdbff) start--;
  }

  let endOld = oldStr.length;
  let endNew = newStr.length;
  while (
    endOld > start &&
    endNew > start &&
    oldStr.charCodeAt(endOld - 1) === newStr.charCodeAt(endNew - 1)
  ) {
    endOld--;
    endNew--;
  }

  // never split a surrogate pair at the suffix boundary
  if (endOld < oldStr.length && endNew < newStr.length && endOld > start && endNew > start) {
    const oLow = oldStr.charCodeAt(endOld);
    const oHigh = oldStr.charCodeAt(endOld - 1);
    const nLow = newStr.charCodeAt(endNew);
    const nHigh = newStr.charCodeAt(endNew - 1);
    const oSplit = oLow >= 0xdc00 && oLow <= 0xdfff && oHigh >= 0xd800 && oHigh <= 0xdbff;
    const nSplit = nLow >= 0xdc00 && nLow <= 0xdfff && nHigh >= 0xd800 && nHigh <= 0xdbff;
    if (oSplit && nSplit) {
      endOld--;
      endNew--;
    }
  }

  return { start, removed: oldStr.slice(start, endOld), added: newStr.slice(start, endNew) };
}

export interface TextareaBindingOptions {
  /** Called after a local edit has been pushed into the shared text. */
  onLocalChange?: (value: string) => void;
  /** Called after remote content has been applied to the textarea. */
  onRemoteChange?: (value: string) => void;
}

export class TextareaBinding {
  private readonly ytext: Y.Text;
  private readonly elt: HTMLTextAreaElement;
  private readonly opts: TextareaBindingOptions;

  /** Last value at which the textarea and the shared text were in sync. */
  private shadow: string;

  /** IME composition state */
  private composing = false;
  private compositionBase = "";
  private compositionAnchor: Y.RelativePosition | null = null;
  private compositionCaret = 0;

  private destroyed = false;

  constructor(ytext: Y.Text, elt: HTMLTextAreaElement, opts: TextareaBindingOptions = {}) {
    this.ytext = ytext;
    this.elt = elt;
    this.opts = opts;
    this.shadow = ytext.toString();

    if (elt.value !== this.shadow) elt.value = this.shadow;

    ytext.observe(this.handleYTextChange);
    elt.addEventListener("input", this.handleInput);
    elt.addEventListener("compositionstart", this.handleCompositionStart);
    elt.addEventListener("compositionend", this.handleCompositionEnd);
    elt.addEventListener("blur", this.handleBlur);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ytext.unobserve(this.handleYTextChange);
    this.elt.removeEventListener("input", this.handleInput);
    this.elt.removeEventListener("compositionstart", this.handleCompositionStart);
    this.elt.removeEventListener("compositionend", this.handleCompositionEnd);
    this.elt.removeEventListener("blur", this.handleBlur);
  }

  // ── Local edits ─────────────────────────────────────────────────

  private readonly handleInput = () => {
    if (this.destroyed || this.composing) return;
    this.pushLocalToShared();
  };

  private pushLocalToShared(): void {
    const newVal = this.elt.value;
    const oldVal = this.shadow;
    if (newVal === oldVal) return;

    const d = diffStrings(oldVal, newVal);
    if (!d.removed && !d.added) return;

    const doc = this.ytext.doc;
    if (!doc) return;

    const start = Math.min(d.start, this.ytext.length);
    const removeLen = Math.max(0, Math.min(d.removed.length, this.ytext.length - start));

    doc.transact(() => {
      if (removeLen > 0) this.ytext.delete(start, removeLen);
      if (d.added) this.ytext.insert(start, d.added);
    }, LOCAL_ORIGIN);

    this.shadow = this.ytext.toString();
    this.opts.onLocalChange?.(this.elt.value);
  }

  // ── Remote edits ────────────────────────────────────────────────

  private readonly handleYTextChange = (_event: Y.YTextEvent, transaction: Y.Transaction) => {
    if (this.destroyed) return;
    if (transaction.origin === LOCAL_ORIGIN) return; // our own edit — DOM is already correct
    this.applySharedToDom();
  };

  private applySharedToDom(): void {
    if (this.destroyed) return;

    // Never touch the DOM mid-composition; re-sync when the IME finishes.
    if (this.composing) return;

    const newVal = this.ytext.toString();
    const oldVal = this.elt.value;
    if (oldVal === newVal) {
      this.shadow = newVal;
      return;
    }

    const d = diffStrings(oldVal, newVal);

    const ta = this.elt;
    const scrollTop = ta.scrollTop;
    const atBottom = ta.scrollHeight - ta.clientHeight - scrollTop <= 2;
    const selStart = ta.selectionStart ?? oldVal.length;
    const selEnd = ta.selectionEnd ?? oldVal.length;

    const delta = d.added.length - d.removed.length;
    const mapPos = (p: number): number =>
      p <= d.start ? p : p >= d.start + d.removed.length ? p + delta : d.start + d.added.length;

    const newSelStart = Math.min(mapPos(selStart), newVal.length);
    const newSelEnd = Math.min(mapPos(selEnd), newVal.length);

    try {
      ta.setRangeText(d.added, d.start, d.start + d.removed.length, "preserve");
    } catch {
      ta.value = newVal; // defensive fallback — keeps content correct
    }

    try {
      ta.selectionStart = newSelStart;
      ta.selectionEnd = newSelEnd;
    } catch {
      /* selection is best-effort */
    }

    if (atBottom) {
      ta.scrollTop = ta.scrollHeight; // follow new content when already at the bottom
    } else {
      const max = Math.max(0, ta.scrollHeight - ta.clientHeight);
      ta.scrollTop = Math.min(scrollTop, max); // otherwise: keep the user's scroll position
    }

    this.shadow = newVal;
    this.opts.onRemoteChange?.(newVal);
  }

  // ── IME composition ─────────────────────────────────────────────

  private readonly handleCompositionStart = () => {
    if (this.destroyed) return;
    this.composing = true;
    this.compositionBase = this.elt.value;
    this.compositionCaret = this.elt.selectionStart ?? 0;
    const doc = this.ytext.doc;
    if (doc) {
      const idx = Math.min(this.compositionCaret, this.ytext.length);
      this.compositionAnchor = Y.createRelativePositionFromTypeIndex(this.ytext, idx);
    }
  };

  private readonly handleCompositionEnd = () => {
    if (this.destroyed) return;
    this.composing = false;

    this.commitComposition();

    this.compositionAnchor = null;
    // The DOM is the reference for what the user just wrote; re-derive the
    // remainder (any remote edits that arrived mid-composition) from Yjs.
    this.shadow = this.elt.value;
    this.applySharedToDom();
    this.shadow = this.ytext.toString();
  };

  /** Safety net: some browsers skip compositionend when the field blurs. */
  private readonly handleBlur = () => {
    if (this.destroyed) return;
    if (this.composing) this.handleCompositionEnd();
  };

  /** Push the text committed by the IME into the shared text. */
  private commitComposition(): void {
    const base = this.compositionBase;
    const domVal = this.elt.value;
    if (domVal === base) return;

    const d = diffStrings(base, domVal);
    if (!d.removed && !d.added) return;

    const doc = this.ytext.doc;
    if (!doc) return;

    // Map the composition position through any concurrent remote changes.
    let index = d.start;
    if (this.compositionAnchor) {
      const abs = Y.createAbsolutePositionFromRelativePosition(this.compositionAnchor, doc);
      if (abs) index = Math.max(0, abs.index + (d.start - this.compositionCaret));
    }
    index = Math.min(index, this.ytext.length);
    const removeLen = Math.max(0, Math.min(d.removed.length, this.ytext.length - index));

    doc.transact(() => {
      if (removeLen > 0) this.ytext.delete(index, removeLen);
      if (d.added) this.ytext.insert(index, d.added);
    }, LOCAL_ORIGIN);

    this.opts.onLocalChange?.(this.elt.value);
  }
}
