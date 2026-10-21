# Lottery observation implementation report

Implemented owned files only:
- scripts/lottery-observation-api.mjs (+ .test.mjs)
- src/lib/lottery-observation.ts (+ .test.ts)
- src/components/LotteryObservations.vue (scoped styles)

## Interfaces
- `createLotteryObservationApi({ fetchImpl?, now?, issueProvider?, timeoutMs? } = {})` returns `{ middleware, getResult, getIssues }`.
- `lotteryObservationApiPlugin(options?)` wires development and preview middleware.
- GET `/api/lottery-observations/issues?id=ssq&issue=2026121` (issue optional) returns `{issues, message, source?}`.
- GET `/api/lottery-observations/result?id=ssq&issue=2026120` returns `{status:'published',result}` or `{status:'unpublished'|'source-error',message}`. Invalid queries return 400, non-GET 405. `result` contains id, original string issue, numeric primary/secondary, date, exact official source URL, retrieval time.
- Component `active:boolean`, emits `notice(string)`, `change(count)`, exposes `open(id:LotteryId,tickets:Ticket[])`. List visibility handled internally; Teleport allows add modal while list inactive. Modal traps keyboard focus and restores initiating control.
- Local store key `lucky-picker:lottery-observations:v1`; corrupt/unavailable storage blocks writes and surfaces error. Batch capped at 10, total store at 1000, same game+issue+canonical ticket deduplicated.

## Source verification, 2026-10-21
Live exact official results parsed successfully for all seven games:
- CWL `findDrawNotice`: ssq 2026120, qlc 2026120, 3d 2026279 (`fc3d` frontend ID MUST map to API `name=3d`). Explicit `issueStart`/`issueEnd`, response issue checked again.
- Sporttery `getHistoryPageListV1.qry`: DLT 26118 (historical exact lookup), PL3 26279, PL5 26279, QXC 26120; gameNo 85,35,350133,04. Exact filters MUST use `startTerm`/`endTerm`; `lotteryDrawNumStart`/`lotteryDrawNumEnd` are silently ignored by upstream (verified and covered by regression test).
- Default native Node fetch independently succeeded for DLT26118 and SSQ2026120. All seven first parsed via real curl HTTP through the same normalizer.
- Results have bounded 60-second cache, concurrent request coalescing, max eight upstream fetches, max 500 cache entries and eight-second upstream timeout. Refresh rechecks all saved results, allowing official corrections. Failed/partial sources never become a no-win verdict; old complete results remain visible.

No verified public upcoming issue/cutoff feed found after own and helper investigation of CWL findIssue, sporttery getDigitalDrawInfoV1, national/provincial official pages/bundles. Default getIssues therefore returns no fabricated on-sale issue. Approved root amendment permits manually entered issue with prominent `期号待核实`, no invented date/cutoff/default; official published result blocks new additions to an already drawn issue. Source errors at add time still permit explicitly unverified record, never falsely call it verified. Optional injected issueProvider supports a future verified on-sale adapter, filtering passed cutoff/invalid provenance.

## Verified prize rules
- DLT official GS announcement https://www.gstc.org.cn/newsDetail/010600/77722 plus linked official PDF `8e65aa9f4343464a8f0685447495c0ff.pdf` read in full: seven prize tiers from 26014. Verified every winning hit combination, no-win and 26013 boundary. No legacy nine-tier guessing.
- QXC https://www.nmtc.com.cn/ggtz/21145.html read: six current tiers, positional first six plus last 0–14, all fixed-tier alternatives covered.
- QLC https://www.swlc.net.cn/games/qlc.html read: all seven tiers and disjoint result-only special ball covered.
- SSQ https://www.scflcp.com.cn/yxgz/823145252.jhtml read: six ordinary tiers plus newly published special-regime 福运奖 for 3+0. Official result feed does not unambiguously identify applicable special regime/boundary, so affected 3+0 is `暂不支持核奖`, never declared lost. Explicit regime true/false engine cases tested. Other standard ranks unaffected.
- FC3D https://www.swlc.net.cn/games/3d.html read: only generated 单选. PL3 https://www.sport.gov.cn/cpzx/n5649/c663326/content.html read: only generated 直选. PL5 official rule source URL used; one exact-position prize only.
- Engine conservatively permits verified 2026 issue formats only; other years and DLT before26014 explicitly unsupported. No prize amounts, chasing, additional bet assumptions or regime guesses.

## Verification
- Focused RED before implementation: initial missing module, then actual stubs failed four API behaviors; subsequent RED for manual issue API, official parameter mapping and malformed dates/source provenance observed before fixes.
- Final `npm test`: 17 suites, 154 tests passed (lottery focused: 53 engine/store + 9 API).
- Final `npm run build`: vue-tsc and Vite build passed.
- Root owns browser visual verification and integration/server/global files; no edits to those files from this task.

## Known limitations
- No automatic official next-issue selection available; manual issue intentionally unverified until exact official result arrives. Cannot verify pre-sale cutoff in this mode.
- SSQ 3+0 regime unresolved; explicitly unsupported. Other-year rules intentionally unsupported.
- Official sites may intermittently block server access; failures explicit, no fake fallback.
- Vue automated DOM harness not installed; root performs real browser modal/list/mobile checks.
