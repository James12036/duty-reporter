"use client";

/**
 * EditorField — Yjs-synced textarea for a category.
 *
 * Key behaviors:
 *  - Uses a Y.Text as the source of truth (CRDT, no overwrites)
 *  - Shows "remote activity" indicator when another user is typing
 *  - Full-height textarea suitable for ~300 words
 *  - Auto-scrolls to bottom on new remote changes if user is at bottom
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";
import ConnectionStatus from "./ConnectionStatus";

interface EditorFieldProps {
  categoryLabel: string;
  ytext: Y.Text | null;
  awareness: WebsocketProvider["awareness"] | null;
  connected: boolean;
  /** Reference template shown below the textarea with a copy button */
  template?: string | null;
}

export default function EditorField({
  categoryLabel,
  ytext,
  awareness,
  connected,
  template = null,
}: EditorFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState("");
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const remoteTypingTimer = useRef<ReturnType<typeof setTimeout>>();
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Sync Y.Text → local state ───────────────────────────────────
  useEffect(() => {
    if (!ytext) {
      setLocalText("");
      return;
    }

    const handleUpdate = () => {
      const text = ytext.toString();
      setLocalText(text);

      // Flash indicator that someone else changed the text
      // (only if the change didn't come from our own typing)
      if (document.activeElement !== textareaRef.current) {
        setRemoteTyping(true);
        if (remoteTypingTimer.current) clearTimeout(remoteTypingTimer.current);
        remoteTypingTimer.current = setTimeout(() => setRemoteTyping(false), 1200);
      }
    };

    // Initial sync
    handleUpdate();

    ytext.observe(handleUpdate);
    return () => {
      ytext.unobserve(handleUpdate);
    };
  }, [ytext]);

  // ── Local typing → Y.Text ───────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalText(newValue);

      if (ytext) {
        // CRDT merge: replace the entire text (Yjs handles conflicts)
        ytext.delete(0, ytext.length);
        ytext.insert(0, newValue);
      }
    },
    [ytext]
  );

  // ── Copy reference template to clipboard ───────────────────────
  const handleCopyTemplate = useCallback(async () => {
    if (!template) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(template);
      } else {
        const ta = document.createElement("textarea");
        ta.value = template;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [template]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (remoteTypingTimer.current) clearTimeout(remoteTypingTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const wordCount = localText
    ? localText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="flex flex-col h-full">
      <ConnectionStatus connected={connected} awareness={awareness} />

      {/* Remote activity indicator */}
      {remoteTyping && (
        <div className="mx-4 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2 animate-pulse">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          Someone is updating this field…
        </div>
      )}

      {/* Textarea */}
      <div className="flex-1 px-4 py-3 flex flex-col">
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={handleChange}
          placeholder={`Enter ${categoryLabel.toLowerCase()} details…`}
          className={`
            w-full flex-1 min-h-[75vh] p-4 text-base leading-relaxed
            bg-gray-50/70 border border-gray-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-300 focus:bg-white
            resize-none transition-all duration-200
            placeholder:text-gray-400
            ${!connected ? "opacity-60" : ""}
          `}
          aria-label={categoryLabel}
        />

        {/* Word count + progress toward ~300 words */}
        <div className="mt-2.5">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
            <span>
              ~{wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
            <span>
              {connected ? "Changes sync in real-time" : "Reconnecting… changes saved locally"}
            </span>
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                wordCount >= 300 ? "bg-green-500" : "bg-brand-400"
              }`}
              style={{ width: `${Math.min(100, (wordCount / 300) * 100)}%` }}
            />
          </div>
        </div>

        {/* Reference template (EOS / Overlapping) */}
        {template ? (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Reference template
              </span>
              <button
                onClick={handleCopyTemplate}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all active:scale-[0.97]
                  ${
                    copied
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100"
                  }`}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre className="w-full text-[13px] leading-relaxed bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-gray-700 whitespace-pre-wrap font-sans">
              {template}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
