# Execution ledger — plan: docs/plan.md
Pre-flight: Task 1 produces Ticket/LotteryId consumed by Task 2; compatible. Task 3 builds Task 2 entrypoint.
Ruling: New empty repository is the isolated workspace, created on feat/initial-app rather than a second worktree; no existing code or branch needs protection. Cost if wrong: moving the checkout later.
