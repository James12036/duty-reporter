"use client";

/**
 * RoomNameBar — shows the active room's name and lets anyone rename it.
 * The new name is written to the shared meta room, so every officer sees it.
 */

import { useEffect, useRef, useState } from "react";

interface RoomNameBarProps {
  name: string;
  onRename: (name: string) => void;
}

const MAX_NAME_LENGTH = 24;

export default function RoomNameBar({ name, onRename }: RoomNameBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1.5 min-h-[44px]">
      {editing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            placeholder="Room name"
            aria-label="Room name"
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm font-semibold rounded-lg border border-[#E6DDCB] bg-[#FFFDF8]
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-300"
          />
          <button
            onClick={save}
            className="shrink-0 px-2 py-1 rounded-md text-[11px] font-medium
                       bg-emerald-50 text-emerald-800 border border-emerald-200
                       hover:bg-emerald-100 active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Save
          </button>
          <button
            onClick={cancel}
            className="shrink-0 px-2 py-1 rounded-md text-[11px] font-medium
                       bg-[#FAF6EC] text-[#7C7263] border border-[#E6DDCB]
                       hover:bg-[#F3EDDF] active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9BFAE]"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <h2 className="min-w-0 truncate text-sm font-bold text-brand-800">{name}</h2>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 px-2 py-1 rounded-md text-[11px] font-medium
                       bg-[#FAF6EC] text-[#7C7263] border border-[#E6DDCB]
                       hover:bg-[#F3EDDF] active:scale-[0.97] transition-all
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9BFAE]"
          >
            ✏️ Rename
          </button>
        </>
      )}
    </div>
  );
}
