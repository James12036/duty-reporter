"use client";

/**
 * EditorField — three Yjs-synced textareas per room (EOS / Overlapping / Others).
 *
 * Key behaviors:
 *  - Each field's Y.Text is the source of truth (CRDT, no overwrites).
 *  - Textareas are UNCONTROLLED; a diff-based TextareaBinding syncs each one,
 *    so remote typing never resets the local scroll position or caret
 *    (fixes the Report Duck 1.0 "jumps to the top" problem).
 *  - Per-field sizes come from ROOM_FIELDS (EOS bigger, Overlapping/Others
 *    smaller) — see rooms.ts.
 *  - Status row has a fixed height and the remote-typing hint fades in/out via
 *    opacity — no layout shifts while someone else is typing.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import { TextareaBinding } from "@/lib/textarea-binding";
import { ROOM_FIELDS } from "@/config/rooms";
import type { RoomSession } from "@/lib/yjs";

interface EditorFieldProps {
  roomName: string;
  session: RoomSession | null;
  connected: boolean;
}

interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
}

export default function EditorField({ roomName, session, connected }: EditorFieldProps) {
  const [remoteActivity, setRemoteActivity] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const activityTimer = useRef<ReturnType<typeof setTimeout>>();

  const markRemoteActivity = useCallback(() => {
    setRemoteActivity(true);
    if (activityTimer.current) clearTimeout(activityTimer.current);
    activityTimer.current = setTimeout(() => setRemoteActivity(false), 1200);
  }, []);

  // ── Presence: who else is viewing this room ─────────────────────
  useEffect(() => {
    const awareness = session?.awareness ?? null;
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
  }, [session]);

  // ── Cleanup timers on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (activityTimer.current) clearTimeout(activityTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Status row — fixed height, never reflows the textareas */}
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

      {/* Three fields: EOS / Overlapping / Others */}
      <div className="px-4 pb-4 flex flex-col gap-4">
        {ROOM_FIELDS.map((field) => (
          <FieldEditor
            key={field.id}
            roomName={roomName}
            label={field.label}
            textareaClass={field.textareaClass}
            ytext={session ? session.fieldText(field.id) : null}
            connected={connected}
            onRemoteActivity={markRemoteActivity}
          />
        ))}
      </div>
    </div>
  );
}

// ── One synced textarea (a single room field) ────────────────────

interface FieldEditorProps {
  roomName: string;
  label: string;
  textareaClass: string;
  ytext: Y.Text | null;
  connected: boolean;
  onRemoteActivity: () => void;
}

function FieldEditor({
  roomName,
  label,
  textareaClass,
  ytext,
  connected,
  onRemoteActivity,
}: FieldEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Bind the textarea to the field's Y.Text (diff-based, scroll/caret safe) ──
  useEffect(() => {
    const elt = textareaRef.current;
    if (!elt) return;

    if (!ytext) {
      elt.value = "";
      return;
    }

    const binding = new TextareaBinding(ytext, elt, {
      onRemoteChange: () => onRemoteActivity(),
    });

    return () => {
      binding.destroy();
    };
  }, [ytext, onRemoteActivity]);

  return (
    <div className="flex flex-col">
      <span className="block mb-1.5 text-sm font-semibold text-brand-800">{label}</span>
      <textarea
        ref={textareaRef}
        placeholder={ytext ? `Enter ${label} details…` : "Connecting…"}
        aria-label={`${label} — ${roomName}`}
        className={`
          w-full ${textareaClass} p-3.5 text-base leading-relaxed
          bg-gray-50/70 border border-gray-200 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-300 focus:bg-white
          resize-none transition-colors duration-200
          placeholder:text-gray-400
          ${!connected ? "opacity-60" : ""}
        `}
      />
    </div>
  );
}
