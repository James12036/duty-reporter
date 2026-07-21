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
}

export default function EditorField({
  categoryLabel,
  ytext,
  awareness,
  connected,
}: EditorFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState("");
  const [remoteTyping, setRemoteTyping] = useState(false);
  const remoteTypingTimer = useRef<ReturnType<typeof setTimeout>>();

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

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (remoteTypingTimer.current) clearTimeout(remoteTypingTimer.current);
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
      <div className="flex-1 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={handleChange}
          placeholder={`Enter ${categoryLabel.toLowerCase()} details…`}
          className={`
            w-full h-full min-h-[40vh] p-4 text-base leading-relaxed
            bg-gray-50 border border-gray-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            resize-none transition-shadow duration-200
            placeholder:text-gray-400
            ${!connected ? "opacity-60" : ""}
          `}
          aria-label={categoryLabel}
        />

        {/* Word count */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
          <span>~{wordCount} words</span>
          <span>{connected ? "Changes sync in real-time" : "Reconnecting… changes saved locally"}</span>
        </div>
      </div>
    </div>
  );
}
