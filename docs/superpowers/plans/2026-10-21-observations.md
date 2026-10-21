# Observations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Implement approved stock and single-draw lottery observation workflows in the existing app.
**Architecture:** Independent domain storage/calculation, independent server adapters, and self-contained Vue observation panels; App.vue wires entry points and shared server composes middleware.
**Tech Stack:** Vue 3, TypeScript, Node 22, Vitest; existing dependencies only.
**Spec:** docs/superpowers/specs/2026-10-21-stock-observation-design.md and docs/superpowers/specs/2026-10-21-lottery-observation-design.md

## Global Constraints
- Browser persistence separate from generation history, no login or background notification.
- Never fabricate official results, trading calendars, prices or issue numbers; network failure retains old valid data and shows error.
- All dates/times Asia/Shanghai; numeric codes/issue strings preserve leading zeros.
- Parallel implementation explicitly requested; disjoint ownership below overrides sequential skill default.
- Use current checkout on feature branch to preserve user's running preview; no extra worktree or main-branch changes.

## Review Focus
- Stock suspension and market holidays must not shift checkpoints using individual stock row counts.
- Adjusted price series must use a consistent baseline; raw prices must be labeled.
- Lottery rule changes are keyed by effective issue, and unavailable official data cannot mean loss.
- Storage corruption/failure and partial network failures must be explicit and preserve records.
- Two entry paths, mobile layout, and batch lottery additions must remain functional.

### Task 1: Stock observations (parallel owner A)
**Files:** Create scripts/stock-observation*.mjs, src/lib/stock-observation*.ts, src/components/StockObservations.vue and matching tests. Own optional stock-only CSS file. Do not edit App.vue, HotStockPicker.vue, TicketList.vue, vite.config.ts, server.mjs or global CSS.
**Interfaces:** StockObservations has `active: boolean`, emits `notice: string`, exposes `addStock(stock: {code:string;name:string;market:string}, source:'all'|'hot'): void` and `hasActive(code:string): boolean`; optionally emits `change(count:number)` for root badge. Export `createStockObservationApi()` middleware and `stockObservationApiPlugin()` from scripts/stock-observation-api.mjs. API path /api/stock-observations/quote?code=xxxxxx&from=YYYY-MM-DD. Root mounts component always and uses v-show.
- [x] Read stock spec and existing service patterns; validate live source responses for daily raw/adjusted quotes and market sessions.
- [x] Write failing Vitest tests for baseline time, market calendar checkpoints, suspensions, consistent adjusted returns, storage validation and network failures. Run focused tests and confirm failure.
- [x] Implement server adapter with validation, request timeout/bounded concurrency/cache and honest failure states; independent tests via injected fetch.
- [x] Implement browser observation store and panel with filters, details chart/table, pending states, manual/automatic refresh, confirmation removal, persistence error visibility and no duplicate active records.
- [x] Run focused tests and type/build checks. Commit only owned files. Report exact API shapes and live-source limitations.

### Task 2: Lottery observations (parallel owner B)
**Files:** Create scripts/lottery-observation*.mjs, src/lib/lottery-observation*.ts, src/components/LotteryObservations.vue and matching tests. Own optional lottery-only CSS. Do not edit root/shared files listed in Task1 or picker.ts.
**Interfaces:** LotteryObservations has `active: boolean`, emits `notice: string`, exposes `open(id:LotteryId,tickets:Ticket[]):void`; optionally emits `change(count:number)`. Panel handles issue selection dialog and full list itself. Export `createLotteryObservationApi()` and `lotteryObservationApiPlugin()` from scripts/lottery-observation-api.mjs. API paths namespaced /api/lottery-observations/.
- [x] Read lottery spec and official effective rules; validate actual official issue/results sources, including 2026 DLT and positional games. Never invent future issue/cutoff.
- [x] Write failing tests for every verified prize tier, no-win, malformed/wrong issue data, leading zeros/position/special ball, rule boundary, storage failure and deduplication. Run focused tests to see failure.
- [x] Implement versioned rule engine, provider middleware with cache/timeouts and source error handling, persistence and independently functional Vue panel/dialog. Unsupported rules/issues must show explicit unsupported status rather than guessed award.
- [x] Include single/batch additions bound to confirmed pre-cutoff issue; support externally specified officially published issue, no chasing.
- [x] Run focused tests and type/build checks. Commit only owned files. Report exact interfaces and live-source limitations.

### Task 3: Integration (root)
**Files:** App.vue, TicketList.vue, HotStockPicker.vue, vite.config.ts, scripts/server.mjs, src/style.css, README.md.
**Interfaces:** Consume Task1/2 exposed panel methods, middleware/plugin exports. HotStockPicker emits `observe` with structured Stock; TicketList emits `observe` with index. Root owns nav switches, per-result and batch actions.
- [x] Add integration assertions for middleware availability/HTTP validation and any root interaction state needing tests.
- [x] Wire always-mounted observation panels with active prop and v-show; stock tabs all/hot/watch; lottery pick/watch tabs. Add accessible action buttons and batch observation; no changes to random generation semantics.
- [x] Compose APIs in dev/preview/production, preserve old hot-stock sync. Document data-source behavior and limitations.
- [x] Run full tests and production build; inspect desktop/mobile browser and live endpoint behavior, including failures.

### Task 4: Independent review and finish
- [x] Fresh reviewer checks full diff vs both specs for correctness and user-visible failure modes.
- [x] Resolve important findings with regression tests, rerun affected checks and full build when necessary.
- [x] Commit changes, keep local preview running and report supported behavior plus material source limitations. Do not push/publish without request.
