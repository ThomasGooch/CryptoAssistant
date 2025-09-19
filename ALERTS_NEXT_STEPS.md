# Alerts — Next Steps (UI + Integration)

Purpose: a concise, actionable plan to implement configurable alerts in the UI, wire them to the streaming/SignalR layer, and make them testable and deployable.

1) Goals
- Allow users to create, edit, enable/disable, and delete alerts (price & indicators).
- Support per-alert cooldown (client-side) with optional per-alert configuration.
- Persist alerts to backend, sync across devices, and trigger notifications reliably.

2) UI: Components & Flows
- Alert Manager page/component (`AlertManager`): list alerts, create/edit modal, per-alert cooldown input (seconds), enable/disable toggle, test button.
- Create/Edit modal: choose alert type (Price / Indicator), symbol, condition, target value, severity, cooldownSeconds (default 30s), delivery preferences (toast, email placeholder).
- Inline actions: enable/disable, delete, test-trigger.
- Small UX: validation, friendly defaults, and a dev-only ‘simulate’ button to send test indicator updates.

3) Frontend Implementation Notes
- Types: extend `PriceAlert` / `IndicatorAlert` with optional `cooldownSeconds?: number`.
- `alertService`: keep per-alert cooldown map; read `cooldownSeconds` when present, else use default constant.
- Subscribe/UI: keep `AlertBanner` and notifications in sync via `alertService.subscribe`.
- Local state: optimistic UI for create/edit while saving to backend; revert if save fails.

4) Backend APIs
- GET /api/alerts (list per-user)
- POST /api/alerts (create)
- PUT /api/alerts/{id} (update)
- DELETE /api/alerts/{id}
- POST /api/alerts/{id}/test (optional) — trigger a test notification for this alert server-side
- Persistence: add `cooldown_seconds` column to alerts table (nullable), default 30.

5) SignalR / Streaming Integration
- Server: when indicator/price crosses threshold, server-side hub can broadcast event to user's connected clients (include alertId and triggered value).
- Client: on receiving a server-trigger, call `alertService.createNotification` only if per-alert cooldown allows (map keyed by alertId). This keeps behavior consistent across client/server triggers.

6) Tests
- Unit: `alertService` — test per-alert cooldown reads `cooldownSeconds` and enforces timing (use fake timers).
- Integration: component-level tests for `AlertManager` create/edit flows and `AlertBanner` rendering.
- E2E (optional): simulate streaming events using dev SignalR helper; verify UI shows single notification within cooldown window.

7) Rollout & Migration
- DB migration adding `cooldown_seconds` with default 30s. Backfill nulls to 30 for existing alerts.
- Feature flag: protect backend broadcast path behind a feature flag if rolling out gradually.

8) Acceptance Criteria
- Users can configure cooldown per-alert and see expected deduped notifications within the running client.
- Alerts persist to backend and survive refresh/login on the same account.
- Tests cover both client-only and server-triggered flows.

9) Next Tasks & Estimates (small team)
- Frontend: add fields + wire `alertService` (1 day)
- Backend: add APIs + migration (0.5–1 day)
- Tests & QA: unit + integration (0.5 day)
- E2E / rollout: optional (0.5 day)

Notes: keep client cooldown logic as a safety/UX feature; if cross-tab or global deduping is required later, add server-side last-fired timestamps and use them as source-of-truth.
