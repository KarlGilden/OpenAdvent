# Advent calendar API specification

Status: proposed implementation contract, based on the supplied route sketch and agreed product behaviour. Additions and assumptions are identified below. This is a separate project from Tuttly/LangStore.

## 1. Scope and agreed behaviour

- Users create calendars and define content for days 1–25.
- Content is shared by everyone in a calendar. Each member opens doors independently.
- Users join calendars through invitation links.
- Doors unlock by date in the viewing user's local time zone. Earlier doors remain available.
- Closed doors are hidden visually; protection against inspecting content is not an MVP requirement.
- Calendar membership includes an isAdmin flag.
- Simple reads may call a repository directly. Business rules belong in services.

## 2. Proposed defaults requiring confirmation

- All routes require authentication; invite acceptance can resume after sign-in.
- The API resolves the authentication-provider identity to an internal user UUID before handlers run. No request body supplies the acting user ID.
- Creation makes 25 empty doors and gives the creator admin membership, atomically.
- A calendar represents December of an explicit year. Door content is plain text initially.
- PATCH updates only provided fields. Empty door content is valid while drafting; calendar name must be nonblank.
- Calendar metadata updates change the name only. Year is immutable after creation to avoid changing unlock dates underneath recorded openings.
- Invitation links are reusable, have no MVP expiry, and grant non-admin membership. An admin can rotate the link. Existing memberships survive rotation.
- The API validates unlock dates using server time and a client-supplied IANA time zone. This implements local-date behaviour, not protection against a user deliberately choosing another zone.
- No delete, member-removal, admin-promotion or door-reset routes in this scope.

## 3. Request and response conventions

All paths below are relative to `/api`. UUID route parameters and integer day values are validated at the API boundary. Days must be 1–25, also enforced by a database CHECK constraint.

Use JSON bodies. For date-sensitive routes, require the device's IANA time zone: GET query `?timeZone=Europe/Berlin`, or POST body `{ "timeZone": "Europe/Berlin" }`. Reject missing or unsupported zones with 400; do not silently use the server zone.

CalendarSummary: `{ id, name, year }`.

CalendarView: `{ id, name, year, isAdmin, days: [{ day, isUnlocked, openedAt, content }] }`. `openedAt` is an ISO timestamp or null. Return all 25 door numbers so the UI can render the complete calendar. Proposed normal-view policy: content is null for future days and available for unlocked days, including doors not yet visually opened. The admin editor receives all content through its separate route.

OpeningView: `{ adventId, day, content, openedAt }`.

Do not expose provider IDs, invitation hashes or other members' opening history in these responses.

## 4. Routes

| Method and path | Input | Result | Handler dependency |
| --- | --- | --- | --- |
| GET /user | Authenticated internal user ID | 200 current user `{ id, name, email }` | UserRepository.findById |
| GET /advent | Authenticated internal user ID | 200 CalendarSummary[] for memberships | AdventRepository.listForMember |
| POST /advent | `{ name, year }` | 201 CalendarSummary; Location header | AdventService.createCalendar |
| PATCH /advent/:adventId | `{ name }` | 200 CalendarSummary | AdventService.updateCalendar |
| GET /advent/:adventId | Query timeZone | 200 CalendarView | AdventService.getCalendar |
| GET /advent/:adventId/days | None | 200 all `{ day, content }` rows, admin only | AdventService.getEditableDays |
| PATCH /advent/:adventId/days/:day | `{ content }` | 200 updated `{ day, content }` | AdventService.updateDay |
| POST /advent/:adventId/days/:day/open | `{ timeZone }` | 200 OpeningView | AdventService.openDay |
| POST /advent/:adventId/invitations | None | 201 `{ inviteUrl }`; replaces any previous invitation | AdventInvitationService.rotateInvitation |
| POST /advent/join | `{ token }` | 200 `{ adventId }` | AdventInvitationService.joinCalendar |

### Changes from the sketch

- POST /advent needs a service because creator membership and 25 doors must be created with the calendar.
- PATCH replaces PUT for partial calendar updates. Updates require admin checks and cannot go straight to an unrestricted repository write.
- The open route names the specific day; it does not rely on a shared or single currentAdventDay counter.
- The sketch's admin-only POST /advent/:id/user is replaced by invitation acceptance. An invited user is not an admin and must be able to join using their own authenticated identity and a valid token. Direct admin addition of a known user is an optional later feature.
- Listing calendars, editing door content and managing invitations fill gaps in the original sketch.
- Normal retrieval returns every door number, even if future content is omitted. Returning only unlocked rows would leave the UI without the full calendar shape.

## 5. Services and methods

Services accept plain inputs and internal user IDs. They do not depend on HTTP requests, replies, authentication SDKs or database implementations.

### AdventService

Dependencies: AdventRepository, AdventMemberRepository, AdventDayRepository, AdventOpeningRepository, Clock.

| Method | Responsibilities |
| --- | --- |
| createCalendar(userId, { name, year }) | Validate name/year; invoke atomic calendar/day/admin creation; return summary. |
| updateCalendar(userId, adventId, { name }) | Require membership and admin status; validate name; persist update. |
| getCalendar(userId, adventId, timeZone) | Require membership; load doors and this user's openings; compute unlock status using Clock; assemble CalendarView and apply content policy. |
| getEditableDays(userId, adventId) | Require admin membership; return all door content for editing, irrespective of date. |
| updateDay(userId, adventId, day, { content }) | Require admin membership; validate day/content; update the existing door. Never change opening history. |
| openDay(userId, adventId, day, timeZone) | Require membership; verify door exists and is unlocked; record first opening idempotently; return shared content and the original opening timestamp. |

Use a shared private requireMembership/requireAdmin helper within services rather than duplicating checks in handlers. A member without admin rights receives Forbidden; an inaccessible calendar receives NotFound.

### AdventInvitationService

Dependencies: AdventRepository, AdventMemberRepository, InvitationTokenProvider, configured public app URL.

| Method | Responsibilities |
| --- | --- |
| rotateInvitation(userId, adventId) | Require admin membership; generate a secure random token; store only its hash; return a join URL containing the raw token. |
| joinCalendar(userId, token) | Hash token; resolve matching calendar; add a non-admin membership if absent; return calendar ID. Repeat acceptance succeeds without duplicates or role changes. |

InvitationTokenProvider exposes `generateToken(): string` and `hashToken(token): string`. Its implementation uses cryptographically secure randomness and a suitable hash. Raw tokens must not appear in application logs. Rotation returns a fresh link because the original token cannot be recovered from its hash.

### Date policy

Use a pure helper `isDayUnlocked({ year, day, now, timeZone }): boolean`, with an injectable `Clock.now(): Date` for deterministic tests. Convert now to the user's local calendar date and compare it with December/day/year. Do not compare only the day-of-month. Prior-year calendars remain unlocked; future-year calendars remain locked.

## 6. Repositories and methods

Repository interfaces live with application/core code; PostgreSQL implementations live in infrastructure. Repositories return domain data or null, not HTTP responses. Database errors must not become false NotFound results.

### UserRepository

- `findById(userId): Promise<User | null>` — current-user read only; the route uses the authenticated ID, not a client-supplied ID.
- Provider lookup/provisioning belongs to the existing authentication flow; implementation details are outside this spec.

### AdventRepository

- `listForMember(userId): Promise<CalendarSummary[]>` — membership-scoped query with deterministic ordering.
- `findById(adventId): Promise<Advent | null>` — internal service lookup after access checks.
- `createWithDaysAndAdmin({ name, year, creatorUserId }): Promise<Advent>` — one transaction creates calendar, 25 blank doors and creator admin membership. This purpose-specific persistence operation keeps transaction mechanics out of core code.
- `updateName(adventId, name): Promise<Advent | null>`.
- `replaceInviteTokenHash(adventId, tokenHash): Promise<void>`.
- `findByInviteTokenHash(tokenHash): Promise<Advent | null>`.

### AdventMemberRepository

- `findMembership(adventId, userId): Promise<AdventMember | null>`.
- `addIfAbsent({ adventId, userId, isAdmin: false }): Promise<AdventMember>` — use the unique membership key to make joining concurrency-safe; preserve an existing member's admin status.

### AdventDayRepository

- `listForCalendar(adventId): Promise<AdventDay[]>` — ordered by day ascending.
- `findByDay(adventId, day): Promise<AdventDay | null>`.
- `updateContent(adventId, day, content): Promise<AdventDay | null>` — update, not insert; doors are created with the calendar.

### AdventOpeningRepository

- `listForUser(adventId, userId): Promise<AdventDayOpening[]>` — always scope by both IDs.
- `createIfAbsent({ adventId, userId, day }): Promise<AdventDayOpening>` — concurrent or repeated requests return the original opening. Never overwrite openedAt on retry.

Database constraints: unique membership (adventId, userId), unique door (adventId, day), unique opening (adventId, userId, day); opening foreign keys reference the corresponding member and door. Invite token hash is unique. Timestamps use TIMESTAMPTZ.

## 7. Layering and authorization

Direct repository reads are allowed only when no business policy is being applied and the query is scoped by trusted authentication context. GET /user and GET /advent satisfy this requirement. Response mapping still belongs in the API.

Single-calendar reads involve membership and date policy, so they use a service. All writes in this spec use services. Repositories must never be exposed as arbitrary client-controlled query interfaces.

Services receive shared repositories through dependency injection; the current user and time zone are per-call inputs, never mutable fields on singleton services.

Create operations are atomic. Unique constraints, rather than application-only checks, enforce retry safety for joins and openings. If member removal or concurrent permission changes are later introduced, authorization-sensitive writes must recheck authorization within the write transaction or use authorization-scoped SQL.

## 8. Errors

Use the project's common error envelope; proposed shape if none exists: `{ "error": { "code": "DOOR_LOCKED", "message": "This door is not available yet." } }`.

- 400: invalid UUID, day, input, year or time zone.
- 401: unauthenticated request.
- 403: non-admin member attempts editing/inviting; or a member attempts opening a date-locked door (distinct error codes).
- 404: calendar absent or inaccessible; door absent; invitation invalid or rotated.
- 500: unexpected failure; log internally and return a generic message.

Do not use 409 for repeated joins or opens; these are successful idempotent operations. A second open returns 200 and the original timestamp.

## 9. Minimum tests

Service tests with mocked repositories and a fixed Clock:

1. Creation validates inputs and calls atomic creation with the authenticated creator.
2. Nonmembers cannot read or open; non-admin members cannot edit or rotate invitations.
3. Users in different zones unlock the same day at the correct local midnight; test year boundaries and catch-up days.
4. Calendar views include 25 door numbers, only this user's opening history, and future content follows the proposed null policy.
5. Open rejects locked days; repeated opening preserves the timestamp and returns the shared content.
6. Valid invitations grant ordinary membership; invalid/rotated tokens fail; existing admin membership is preserved.

PostgreSQL integration tests:

7. Calendar creation rolls back all rows if one creation step fails.
8. Day values 0 and 26 fail; duplicate memberships, doors and openings cannot be created.
9. Opening foreign keys reject nonmembers and doors belonging to another calendar.
10. Concurrent joins/opens remain idempotent; opening one user's door does not affect another user's history.

API tests:

11. Authentication, schema validation, status codes, error envelopes and response mapping match contracts; request bodies cannot impersonate another user or assign admin status.
12. Simple-read endpoints return only the authenticated user's profile/calendars.

## 10. Remaining product questions

- Confirm the proposed defaults, particularly immutable year, reusable invitations and omission of future content from normal GET responses.
- What door content is needed: plain text only, or images, links and structured content? This determines the content contract and upload work.
- Can creators edit content after members have opened a door? Proposed MVP: yes, everyone sees the updated shared content; opening timestamps remain unchanged.
- How is a new authenticated user provisioned into app_user? Reuse an existing flow if present; otherwise this is a prerequisite implementation task.
