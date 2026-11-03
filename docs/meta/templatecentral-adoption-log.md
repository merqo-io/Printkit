# templateCentral 6.0.4 adoption log

Moved out of `AGENTS.md`.

**templateCentral 6.0.4 review (2026-10-12):** `harness.json` moved 5.15.0 →
6.0.4, porting the harness qkit adopted in its own 6.0.1 and 6.0.4 reviews
(qkit's `AGENTS.md` holds the full reasoning). The scripts were 3-way merged
against qkit's, so this repo's local lines are kept. Adopted:

- Hook commands anchored on `${CLAUDE_PROJECT_DIR}`, each with a timeout. The
  old relative paths resolved against the shell's current directory.
- `stop-checks.sh` skips the test run on a clean tree; `subagent-stop.sh`
  skips read-only agents; `post-edit-typecheck.sh` reports through
  `additionalContext`.
- The skill-usage matcher (`Skill__.*` never matched; now `Skill`), and
  `NotebookEdit` on the `protect-files.sh` matcher.
- The per-segment `block-no-verify.sh`: closes a hook-skipping flag on push,
  `--force-with-lease`, `HEAD:main`, deleting a protected branch and
  `bash -c` wrappers. A bare `git commit` / `git push` is judged by the
  branch it can land on (the hook input's `cwd` plus every literal `cd`
  target), so a worktree commit is no longer blocked by the main checkout
  sitting on `main`. Anything the hook cannot resolve also judges the
  project root: use a bare `git commit` or `git -C <literal path>`.
- `protect-files.sh`: symlinked parents resolved, `notebook_path` read,
  relative paths anchored on the project root.
- `verify-harness.sh` fails on an unreadable or empty manifest.
- The commit-msg gate accepts `type(scope)!:` and the messages git writes
  itself (`Revert "…"`, `fixup!`, `squash!`, `amend!`).
- The PR-only CI gates (changelog, readme, comment hygiene) fail when
  `origin/<base>` is missing and read the base branch from `env`.
- `post-tool-failure.sh` removed (the agent already sees tool errors).

Not adopted, for qkit's reasons: exec-form hooks (`"command": "bash",
"args": [...]`; a bare `bash` resolved without a shell on Windows can be
the WSL launcher, so any hook that used that form here is now a shell
string), the gitleaks command and allowlist syntax changes, the shared
`.claude/ci-gates.sh`, `.claude/hooks/local/`, and every Azure DevOps and
OpenCode item.
