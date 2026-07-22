"use client";

/**
 * ConnectionStatus — Shows sync state and who else is viewing the current category.
 * Uses Yjs awareness to display remote user presence.
 */

import { useEffect, useState } from "react";
import type { WebsocketProvider } from "y-websocket";

interface RemoteUser {
  name: string;
  color: string;
}

interface ConnectionStatusProps {
  connected: boolean;
  awareness: WebsocketProvider["awareness"] | null;
}

export default function ConnectionStatus({ connected, awareness }: ConnectionStatusProps) {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const users: RemoteUser[] = [];
      states.forEach((state, _clientId) => {
        // Skip local user (we only show remote users here)
        if (state.name && state.name !== awareness.getLocalState()?.name) {
          users.push({ name: state.name, color: state.color || "#6366f1" });
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

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-xs">
      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected
              ? "bg-green-500 animate-pulse"
              : "bg-gray-300"
          }`}
        />
        <span className={connected ? "text-gray-500" : "text-gray-400"}>
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* Remote users */}
      {remoteUsers.length > 0 && (
        <div className="flex items-center gap-1 text-gray-500">
          <span>•</span>
          <div className="flex -space-x-1">
            {remoteUsers.slice(0, 3).map((u, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ring-1 ring-white"
                style={{ backgroundColor: u.color }}
                title={u.name}
              >
                {u.name[0]}
              </span>
            ))}
          </div>
          <span>
            {remoteUsers.length === 1
              ? `${remoteUsers[0].name} is here`
              : `${remoteUsers.length} others here`}
          </span>
        </div>
      )}
    </div>
  );
}
