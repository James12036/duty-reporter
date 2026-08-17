#!/bin/bash
# Duty Reporter tunnel watchdog — checks the tunnel health endpoint.
# If the tunnel is unreachable (dead or half-dead in a retry loop),
# force-restart cloudflared so launchd brings up a fresh tunnel.
#
# Logs to /Users/James/duty-reporter/logs/watchdog.log

LOG=/Users/James/duty-reporter/logs/watchdog.log
TUNNEL_LOG=/Users/James/duty-reporter/logs/tunnel.log
# grep -o already includes the https:// prefix; guard against duplicates
RAW_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" | tail -1)
HEALTH_URL="${RAW_URL%/}/health"

now() { date "+%Y-%m-%d %H:%M:%S"; }

# No tunnel URL yet (tunnel just started) — nothing to check
if [ -z "$HEALTH_URL" ] || [ "$HEALTH_URL" = "https:///health" ]; then
  exit 0
fi

# Two failed checks in a row = dead tunnel → restart cloudflared
if ! curl -s --max-time 8 "$HEALTH_URL" >/dev/null 2>&1; then
  sleep 5
  if ! curl -s --max-time 8 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "$(now) TUNNEL DOWN: $HEALTH_URL — restarting cloudflared" >> "$LOG"
    launchctl kickstart -k gui/$(id -u)/com.james.dutyreporter.tunnel >> "$LOG" 2>&1
    echo "$(now) restart issued" >> "$LOG"
  fi
fi
