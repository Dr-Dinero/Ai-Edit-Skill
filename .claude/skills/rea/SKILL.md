---
name: rea
description: Use REA (Reverse Engineer Anything, github.com/morluto/rea) to learn how a feature in an app, website, or binary works without its source, label the evidence, then build our own version. Use for "how does X do Y" questions about shipped apps or sites.
---

# REA: learn how a feature works, then build our own

REA is an MCP server plus CLI (`rea-agents` on npm, MIT, official source
github.com/morluto/rea or rea.tools only) that lets Claude inspect shipped
software locally: Electron/JavaScript apps, websites, native binaries, Android
APKs, .NET assemblies, archives, captures and more. It returns findings with
Evidence IDs, limitations and unknowns. Claude writes the new code.

Skip REA when complete source is available; use normal repository tools.

## Connect only when needed

This skill is instructions only. It does not register the MCP server or install
analysis engines.

- If REA tools (for example `analyze_javascript_application`, `open_binary`,
  `capture_browser_scenario`) are already in the tool list, go straight to the
  target. Do not run setup or diagnostics before every investigation. Trust the
  connected server's actual tool list and schemas over this file.
- If tools are missing, diagnose first without changing anything:
  `npx -y rea-agents@latest doctor --client claude_code --json`.
  - Missing or stale registration: show the read-only plan
    `npx -y rea-agents@latest setup --client claude_code --dry-run --json`
    (paths, backups, skill replacement), get the user's approval, then run
    `npx -y rea-agents@latest setup --client claude_code --yes`. Add
    `--install-hopper` only with separate explicit approval. Then the user must
    restart Claude Code; confirm the tools appear before resuming.
  - Registration fine but no tools in this session: ask for a restart, do not
    repeat setup.
  - Missing provider (Ghidra, Hopper, IDA, JADX): only blocks tasks needing it.
    Static JavaScript analysis needs none of them. Never install Node, Java,
    Ghidra or other prerequisites just to repair registration.
- CLI fallback that needs no MCP or engine, for an Electron/JS app directory or
  ASAR:
  `npx -y rea-agents@latest analyze-javascript-application /absolute/path --json`
- Requirements: Node.js 22.x (>=22.23.4), 24.x (>=24.22.1) or 26.12.1+. On
  Linux, Ghidra, JADX and JS analysis need a procps-compatible `ps` on PATH.
- If a call times out or the connection drops, do not blindly repeat it. Retry
  once only if it is safe to repeat; otherwise tell the user and ask them to
  restart the MCP client. Deeper recovery:
  https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/references/connection-and-recovery.md

## The five-step workflow

1. **Pick one feature.** Turn "reverse engineer CapCut" into focused questions:
   "How are auto-captions timed?", "How does the export queue pick a bitrate?".
   If the user says only "my app", ask which app. Never pick a target for them.
2. **Route by how the target is built.**
   | Target | First tool |
   | --- | --- |
   | Electron/desktop JS app (Notion, Slack, Loom, many editors) or ASAR | `analyze_javascript_application` (free, no engine) |
   | Website, actions Claude must perform | `capture_browser_scenario` with declared actions |
   | Browser page the user already has open | `list_browser_targets` |
   | Running Electron app | `list_electron_targets`; check `inspect_electron_fuses` before an Inspector attempt |
   | Saved HAR / SAZ capture | `inspect_web_network_capture` |
   | Native .exe/.app/library | `open_binary` (Ghidra free, Hopper or IDA), then `analyze_function`, pseudocode, string/function search |
   | ZIP/APK/IPA/DMG/PyInstaller archive inventory | `open_binary`, then `inspect_artifact` |
   | Android APK code | `inspect_android_package` |
   | .NET assembly | `inspect_managed_artifact` |
   | Apple bundle resources (plist, nibs, assets) | `open_bundle_resources` |
   | AgentEnv bundle of a web app | `capture_browser_scenario`, then `export_environment_bundle` |
   Many specialised inspectors exist (SQLite, WASM, Go/Rust metadata, model
   files, packet captures, PE/ELF tables). Check `binary_session` with `{}` for
   `tool_availability`; never call an unadvertised tool.
3. **Summary first.** For large or unknown-size targets pass
   `"detail": "summary"`, then drill in with `inspect_analysis_view` on the
   returned `parent_evidence_id` (one module, one page). Use
   `trace_application_feature` once a seed is known. Over MCP,
   `analyze_function` is summary-first by default. If a result is truncated or
   REA reports `resource_constraint` (transport), page the retained Evidence or
   `export_evidence_bundle`; never rerun an identical analysis.
4. **Label every finding** as **seen** (observed in files, cite Evidence ID),
   **inferred** (careful guess, say why), or **unknown** (REA could not see it,
   such as server-side logic). Static analysis never proves code ran; use
   runtime observation only when static evidence cannot answer and the user's
   scope allows executing the target. An unknown becomes an explicit design
   decision in our build.
5. **Rebuild and test.** Write our own implementation with normal coding tools,
   separating observed behavior from our design choices, and test it. Close an
   opened native session with `close_binary` when done.

For multi-feature investigations, keep a short finding ledger (question,
conclusion, Evidence IDs, evidence type, search boundary, unknowns), reuse
existing sessions and evidence, and before finishing mark each question
answered, partial or unresolved.

## Hard limits

- Copy behavior, never code or assets. No reproducing protected code.
- No bypassing DRM, license checks, anti-cheat, authentication, bot protection
  or access controls; no tampering with online services or AI provider limits.
- Only targets the user owns or is authorized to examine. Inspecting a file does
  not authorize executing it, capturing its traffic, or touching other
  parties' systems. Runtime actions execute only the declared target and steps.
- REA sees only what is local. Servers (uploads, ranking, recommendation
  algorithms) stay out of reach; say so rather than guessing.

## Deeper guides (read only the relevant one)

Base: https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/references/
- `javascript-applications.md`: ASARs, module views, feature tracing, version diffs
- `runtime-observation.md`: browser, Electron, debugger, Frida, process capture
- `native-and-artifacts.md`: native binaries, managed code, archives, Ghidra deadlines
- `android-applications.md`, `evidence-workflows.md`, `environments.md`

The full upstream skill (`reverse-engineer-anything`, about 35 KB plus
references) is installed by `npx rea-agents setup` alongside the MCP server; it
is more detailed and stays current with each release.
