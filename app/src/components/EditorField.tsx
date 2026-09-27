"use client";

/**
 * EditorField — Yjs-synced textarea for a room.
 *
 * Key behaviors:
 *  - The Y.Text is the source of truth (CRDT, no overwrites).
 *  - The textarea is UNCONTROLLED; a diff-based TextareaBinding syncs it, so
 *    remote typing never resets the local scroll position or caret
 *    (fixes the Report Duck 1.0 "jumps to the top" problem).
 *  - Status row has a fixed height and the remote-typing hint fades in/out via
 *    opacity — no layout shifts while someone else is typing.
 *  - Full-height textarea suitable for ~300 words.
 */

import { useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";
import { TextareaBinding } from "@/lib/textarea-binding";

interface EditorFieldProps {
  roomName: string;
  ytext: Y.Text | null;
  awareness: WebsocketProvider["awareness"] | null;
  connected: boolean;
}

interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
}

function computeWords(value: string): number {
  return value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function EditorField({
  roomName,
  ytext,
  awareness,
  connected,
}: EditorFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [remoteActivity, setRemoteActivity] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const activityTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Bind the textarea to the Y.Text (diff-based, scroll/caret safe) ──
  useEffect(() => {
    const elt = textareaRef.current;
    if (!elt) return;

    if (!ytext) {
      elt.value = "";
      setWordCount(0);
      return;
    }

    const binding = new TextareaBinding(ytext, elt, {
      onLocalChange: (value) => setWordCount(computeWords(value)),
      onRemoteChange: (value) => {
        setWordCount(computeWords(value));
        setRemoteActivity(true);
        if (activityTimer.current) clearTimeout(activityTimer.current);
        activityTimer.current = setTimeout(() => setRemoteActivity(false), 1200);
      },
    });
    setWordCount(computeWords(elt.value));

    return () => {
      binding.destroy();
    };
  }, [ytext]);

  // ── Presence: who else is viewing this room ─────────────────────
  useEffect(() => {
    if (!awareness) {
      setRemoteUsers([]);
      return;
    }
    const updateUsers = () => {
      const users: RemoteUser[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return; // skip local user
        if (state && state.name) {
          users.push({ clientId, name: state.name, color: state.color || "#6366f1" });
        }
      });
      setRemoteUsers(users);
    };
    awareness.on("change", updateUsers);
    updateUsers();
    return () => {
      awareness.off("change", updateUsers);
    };
  }, [awareness]);

  // ── Cleanup timers on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (activityTimer.current) clearTimeout(activityTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Status row — fixed height, never reflows the textarea */}
      <div className="flex items-center gap-3 px-4 h-9 text-xs whitespace-nowrap overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? "bg-green-500 animate-pulse" : "bg-gray-300"
            }`}
          />
          <span className={connected ? "text-gray-500" : "text-gray-400"}>
            {connected ? "Live" : "Connecting…"}
          </span>
        </div>

        {remoteUsers.length > 0 && (
          <div className="flex items-center gap-1 text-gray-500 min-w-0">
            <span className="shrink-0">•</span>
            <div className="flex -space-x-1 shrink-0">
              {remoteUsers.slice(0, 3).map((u) => (
                <span
                  key={u.clientId}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ring-1 ring-white"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {u.name[0]}
                </span>
              ))}
            </div>
            <span className="truncate">
              {remoteUsers.length === 1 ? `${remoteUsers[0].name} is here` : `${remoteUsers.length} others here`}
            </span>
          </div>
        )}

        {/* Fades in/out via opacity — occupies the same space, so no jump */}
        <span
          className={`ml-auto shrink-0 flex items-center gap-1.5 text-amber-600 transition-opacity duration-300 ${
            remoteActivity ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          Someone is updating…
        </span>
      </div>

      {/* Textarea (uncontrolled — the binding owns its value) */}
      <div className="flex-1 px-4 py-3 flex flex-col">
        <textarea
          ref={textareaRef}
          placeholder={ytext ? `Enter details for ${roomName}…` : "Connecting…"}
          aria-label={roomName}
          className={`
            w-full flex-1 min-h-[90vh] p-4 text-base leading-relaxed
            bg-gray-50/70 border border-gray-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-300 focus:bg-white
            resize-none transition-colors duration-200
            placeholder:text-gray-400
            ${!connected ? "opacity-60" : ""}
          `}
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
      </div>
    </div>
  );
}
