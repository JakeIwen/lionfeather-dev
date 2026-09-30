# Persistent local hosting

Lionfeather uses a macOS launchd boot service with the label
`com.<username>.lionfeather-org` and stable local address
**http://127.0.0.1:5174**. Run the commands below from the repository directory.

## Install and verify

Run in a normal Terminal as your normal user:

```sh
npm run service:install
```

The command builds the public site, prepares and validates a plist, installs it
at `/Library/LaunchDaemons/com.<username>.lionfeather-org.plist`, and loads the job.
It then deliberately exits the worker through an authenticated local endpoint
and verifies that launchd replaces it with a different PID and instance ID.
Only individual plist/launchctl operations use sudo; never run the whole npm
command as root. The web server runs as the user who installed it.

`npm run service:prepare` generates a reviewable plist under ignored
`.local/service/` without installing or loading it. **Preparation is not boot
registration.** `service:status` reports installation, launchd state, HTTP health,
and whether the process identities agree. It exits nonzero when the site is not
supervised. It does not stop or restart anything.

The boot job uses `RunAtLoad`, `KeepAlive`, a ten-second restart throttle, and
a twenty-second exit timeout. It runs the installed Node executable directly,
with no interactive shell, dependency installation, or build at startup. Boot
startup requires the Mac's data volume to be accessible. It does not prevent
normal system sleep or make the site available while the machine is asleep.

## Lifecycle commands

```sh
npm run service:status
npm run service:restart
npm run service:stop
npm run service:start
npm run service:verify
```

`stop` disables and unloads the job so it stays stopped across reboot until
`start` re-enables it. `verify` briefly stops the worker while leaving KeepAlive
enabled to test automatic recovery. It requires real boot registration and
matching launchd, HTTP, and private ownership records. It does not reboot the
Mac. `restart` explicitly asks launchd to replace the worker.

Remove only this service's registration, retaining site files and local state:

```sh
npm run service:uninstall
```

The installer refuses an unrelated listener on 5174 or a plist belonging to
another workspace/user. When taking over from this project's manual server, it
obtains installation authorization before stopping it. If the subsequent
bootstrap fails and no job/listener remains, it restores manual hosting and
reports that automatic startup was not verified.

## Updates and development

```sh
npm run build
```

Reload the browser after a successful build. The static server reads the current
files, so ordinary content updates do not require a service restart. The build
directory is replaced during a build; requests during that short window may
need a reload. The service does not automatically build source changes.

`npm run dev` runs Vite with live updates separately at http://127.0.0.1:5175.
`npm start` runs the production server in the foreground on 5174 when that port
is free. Ctrl+C stops a foreground process. To stop an agent-started manual
production server without signals:

```sh
node scripts/service.mjs stop-manual
```

That command refuses to stop a launchd-managed process; use `service:stop` for it.

## Verified installation

On September 30, 2026, read-only inspection confirmed the installed job points
to the current checkout, is enabled, and agrees with HTTP health
and the private process-ownership record. A subsequent `service:verify` run
confirmed automatic recovery after a controlled worker exit. The service label
retains the `lionfeather-org` suffix after the directory rename. No full Mac reboot
was performed during this check. Use `service:status` to inspect current state.

## Files and diagnostics

- `scripts/site-server.mjs`: loopback-only static server for `dist/`, SPA
  navigation fallback, health, and authenticated graceful stop.
- `scripts/service.mjs`: plist preparation, installation, lifecycle, status,
  and automatic-restart verification.
- `.local/service/com.<username>.lionfeather-org.plist`: prepared configuration.
- `.local/service/server.json`: private ownership record and random stop token,
  published only after the server binds successfully. Never publish this file.
- `.local/service/launchd.stdout.log` and `launchd.stderr.log`: service logs.

```sh
/bin/launchctl print "system/com.$(id -un).lionfeather-org"
tail -n 60 .local/service/launchd.stderr.log
```

If the configured Node version is removed, reinstall using the replacement Node
version. Uninstall before moving the project, then reinstall at its new path.
Logs remain local; remove old log content deliberately when no longer needed.

`npm test` exercises real loopback HTTP requests for assets, routes, private-file
exclusion, traversal/symlink handling, shutdown authentication, bind conflicts,
and stale ownership protection. Those tests and plist linting establish runtime
behavior and configuration validity, not actual launchd installation. Only the
live service status and restart check establish that.
