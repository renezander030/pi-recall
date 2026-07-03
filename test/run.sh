#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/src/index.ts"
PI="/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js"

pass=0
fail=0
ok()  { printf '  ok   %s\n' "$1"; pass=$((pass+1)); }
bad() { printf '  FAIL %s\n' "$1"; fail=$((fail+1)); }

echo "pi-recall tests"

out="$(printf '%s\n' '{"type":"get_commands","id":"cmds"}' | node "$PI" --mode rpc --no-session --extension "$EXT" 2>/dev/null)"
case "$out" in
  *'"name":"recall"'*) ok "registers /recall";; *) bad "registers /recall"; printf '%s\n' "$out";;
esac
case "$out" in
  *'"name":"recall-status"'*) ok "registers /recall-status";; *) bad "registers /recall-status"; printf '%s\n' "$out";;
esac
case "$out" in
  *'"name":"recall-impact"'*) ok "registers /recall-impact";; *) bad "registers /recall-impact"; printf '%s\n' "$out";;
esac

echo
printf 'pi-recall: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" = 0 ]
