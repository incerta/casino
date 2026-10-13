#!/bin/sh
# Runs the API and the Next.js client in one container. If either process
# exits, the container exits so Fly restarts the machine.

(cd server && bun run index.ts; kill 0) &

cd client && exec bun --bun next start --port 3000
