# Legend rule

**Rule (confirmed by the PM on 18 Oct 2026):** a player in the legend pool (`src/lib/players.ts`) must **not** be registered in **this season's** UEFA Champions League squad. A player who is still active but plays elsewhere is fine: another league, the Europa or Conference League, or a club outside the CL.

## Current decisions
- **Kyle Walker, Andrew Robertson, David Alaba, Luka Modrić stay.** None of them is in a 2026/27 CL squad (see the check below). Modrić is on Milan's Europa League list, which is allowed.
- **Mohamed Salah stays, by name.** This is a PM decision, recorded here so the check isn't read as a reason to remove him.
- **No v3 pool.** The pool is not rebuilt for this rule. If the check flags someone, the PM decides case by case.
- The frozen `src/lib/legacy/players-v1.ts` only decodes old share links and is never drafted, so the rule does not apply to it. `--include-v1` lists its matches for information only.

## The check
`scripts/legend-cl-check.ts` compares every legend name with the current CL squads from football-data.org (`GET /v4/competitions/CL/teams`, squads included).
- It uses **one request**. If squads ever come back empty, it fetches each team spaced 6.5 s apart, which stays under the free tier's 10 requests/minute, and waits once on a 429.
- Names are compared without accents, case or punctuation, and with "Jr" dropped.
- `WARN` lines are exact name matches.
- `note possible match` lines (same surname and first initial, e.g. Andy/Andrew) need a human look.
- **Warning only:** the exit code is always 0. `--strict` makes a match exit 1. It skips when `FOOTBALL_DATA_API_KEY` is unset and never prints the key.

```bash
FOOTBALL_DATA_API_KEY=... bun run legend-cl-check
FOOTBALL_DATA_API_KEY=... bun scripts/legend-cl-check.ts --names "Sergio Ramos,Paul Pogba,Karim Benzema"
```

`scripts/post-deploy-check.sh` runs it after each deploy as a warning-only step, the same way as the football-data upstream check. It is skipped when the key is not in the deploy environment.

**Data caveat:** football-data squads can lag the official UEFA A/B lists, especially after the registration deadlines in September and February. Confirm any WARN, or any surprising "not in a squad", against uefa.com before acting on it.
