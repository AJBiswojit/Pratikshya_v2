# Employee Management API Contract

**Audience:** backend implementation intern  
**Frontend owner:** Admin Portal `/admin/employees` (management) + Employee Portal (self-service: profile, attendance, leave, performance, activity, assisted orders, reports)  
**Backend framework:** **Python + FastAPI** (planned — not implemented). Pydantic v2 schemas; PostgreSQL via SQLAlchemy/Alembic as the migration target.  
**Authorization boundary:** **SUPER_ADMIN required** for every employee-**management** operation. Self-service (`/employees/me`, own attendance/leave/performance/activity) requires the authenticated employee (or a scoped manager/admin where noted).

This contract documents the backend seam required by the existing frontend employee repositories. It does **not** introduce a second authentication system, an Admin-as-employee record, or a parallel employee database.

All paths are **planned** `/api/v1` routes. The earlier revision used un-prefixed `/employees` paths; those are superseded by `/api/v1/…` (a `/employees` alias is not provided — the frontend pins `API_BASE`).

**Migration sequencing:** employee auth lands in **Phase B** and employee/workforce features in **Phase J** of the Phase A–L plan (`backend-architecture.md` §42 / `backend-integration-audit.md` §10). Nothing here is implemented.

## Technology mapping (current frontend → planned FastAPI)

| Current frontend | Planned FastAPI surface |
| --- | --- |
| `employeeAuthService` (`signInEmployee`, `signOutEmployee`, `changeEmployeePassword`, `refreshEmployeeSession`) | `POST /api/v1/auth/employee/login` / `logout` / `refresh` |
| `employeeService` (`createEmployee`, `updateEmployee`, `updateOwnEmployeeProfile`, `updateEmployeeRole`, `updateEmployeePermissions`, `setEmployeeStatus`, `resetEmployeePassword`) | `/api/v1/employees/*` + `/api/v1/employees/me` |
| `workforce/attendanceService` (`checkIn`, `checkOut`, `monthRecordsForEmployee`, …) | `/api/v1/employees/{employee_id}/attendance*` |
| `workforce/leaveService` (`requestLeave`, `reviewLeave`, `cancelLeave`, `myLeave`) | `/api/v1/employees/{employee_id}/leave`, `/api/v1/leave/{leave_id}` |
| `workforce/performanceService` (`getEmployeePerformance`, `performanceHistory`, …) | `/api/v1/employees/{employee_id}/performance` |
| `activityService` (`activityForEmployee`) | `/api/v1/employees/{employee_id}/activity` |
| `orderService` / `operationsService.getAssistedOrders` | `/api/v1/employees/{employee_id}/orders/assisted` |
| `EmployeeReports.jsx` (sales, products, customers, inventory, returns, offers, employees) | `/api/v1/employees/reports/*` |

## Responsibility and identity boundary

- Admin identities authenticate through the Admin domain.
- Employee identities authenticate through the Employee domain.
- `Kavya Menon / PF-ADM-00001 / SUPER_ADMIN` remains an Admin identity only and must never be returned by an employee endpoint.
- Employee creation accepts operational employee roles only. `ADMIN`, `SUPER_ADMIN`, Admin IDs (`PF-ADM-*`), and Admin-only permissions are invalid.
- The Admin permission key is `employees.manage`. It is granted through the `SUPER_ADMIN` Admin role only.
- Operational employee permissions do not imply `employees.manage`.
- Deactivation is non-destructive: credentials are blocked and active assignment eligibility stops, while employee, product-review, activity, attendance, order, and other historical references remain.

## Authentication and authorization

Use the Admin session/token middleware for management operations and the Employee session/token middleware for self-service. For management operations the backend must verify:

1. A valid authenticated Admin identity.
2. Active Admin status.
3. Admin role `SUPER_ADMIN`.
4. Admin permission `employees.manage`.

A customer or employee session must not satisfy this check. Hiding frontend controls is not authorization.

Authentication tokens: short-lived **JWT access token** + **rotating refresh token** (see `backend-architecture.md` §9.6). Access tokens are never stored in localStorage as authoritative credentials; refresh tokens are `HttpOnly` (hash only server-side).

Recommended errors:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | No valid session (Admin for management; Employee for self-service) |
| 401 | `TOKEN_EXPIRED` / `REFRESH_REQUIRED` | Access token expired; client calls refresh |
| 403 | `EMPLOYEES_MANAGE_REQUIRED` | Authenticated identity lacks Admin employee-management authority |
| 403 | `FORBIDDEN` | Authenticated but not allowed on this resource |
| 404 | `EMPLOYEE_NOT_FOUND` | Employee does not exist |
| 409 | `EMPLOYEE_ID_CONFLICT` / `EMAIL_CONFLICT` | Unique identity conflict |
| 422 | `VALIDATION_ERROR` | Invalid fields, role, status, or permission |
| 429 | `RATE_LIMITED` | Credential reset, login, or repeated mutation limited |

## Employee object

```json
{
  "id": "emp-mgr-01",
  "employeeId": "PF-MGR-00008",
  "firstName": "Vikram",
  "lastName": "Iyer",
  "name": "Vikram Iyer",
  "email": "vikram.iyer@pratikshyafashon.in",
  "phone": "+91 98200 22008",
  "role": "STORE_MANAGER",
  "department": "MANAGEMENT",
  "section": "STORE_LEADERSHIP",
  "store": "MAIN_FLOOR",
  "permissions": ["dashboard.view", "products.view"],
  "permissionMode": "role",
  "status": "ACTIVE",
  "joiningDate": "2023-01-16",
  "mustChangePassword": false,
  "createdAt": "2023-01-16T09:00:00.000Z",
  "updatedAt": "2026-08-14T10:00:00.000Z",
  "lastLogin": "2026-08-11T09:02:00.000Z"
}
```

### Field rules

| Field | Rule |
| --- | --- |
| `id` | Stable backend primary key; never reused |
| `employeeId` | Stable, deterministic, globally unique employee identifier; backend-generated and immutable |
| `firstName`, `lastName` | Required, trimmed; `name` may be a read-only response convenience |
| `email` | Required, normalized lowercase, unique across employee identities; define conflict policy across Admin/customer domains explicitly |
| `phone` | Optional; normalize and validate supported Indian phone format |
| `role` | One legitimate operational employee role from the shared role catalogue |
| `department`, `section`, `store` | Existing organization values; validate section belongs to department |
| `permissions` | Existing operational permission keys only; reject all employee-account administration keys |
| `permissionMode` | `role` or `custom`; `role` resolves current role defaults |
| `status` | `ACTIVE`, `PENDING`, `ON_LEAVE`, `SUSPENDED`, or `INACTIVE` |
| `joiningDate` | ISO date |
| `mustChangePassword` | Read-only account flag in normal profile responses |
| `createdAt`, `updatedAt` | Backend-owned ISO timestamps |
| `lastLogin` | Nullable backend-owned ISO timestamp; include only if supported by auth logging |

Passwords, credential hashes, reset tokens, and fingerprints must never appear on this object or in list/detail responses.

---

## Authentication endpoints

### `POST /api/v1/auth/employee/login`

- **Purpose:** authenticate an employee and issue an access + refresh session.
- **Auth:** public. **Rate-limited** (e.g. 5/min/IP + identifier).
- **Request body:** `{ "employeeId": "PF-SLS-00124", "password": "…" }`
- **Response `200`:** `{ "ok": true, "data": { "employee": Employee, "accessToken": "…", "tokenType": "Bearer", "expiresIn": 900 } }` (refresh token set as `HttpOnly` cookie or returned opaque, per the backend standard).
- **Rules:** `canEmployeeLogin(status)` — `ACTIVE`, `PENDING`, `ON_LEAVE` may authenticate; `SUSPENDED`, `INACTIVE` return `403 FORBIDDEN` (blocked account) and revoke stale sessions. Generic error on bad credentials. Never return password hashes.
- **Errors:** `401`, `403`, `422`, `429`.
- **Audit:** `EMPLOYEE_LOGIN` (and `EMPLOYEE_LOGIN_FAILED` on failure, without secrets).

### `POST /api/v1/auth/employee/refresh`

- **Purpose:** rotate the refresh token and issue a new short-lived access token.
- **Auth:** valid refresh token only (no access token required).
- **Request body:** `{}` (refresh token via `HttpOnly` cookie) or `{ "refreshToken": "…" }`.
- **Response `200`:** `{ "ok": true, "data": { "accessToken": "…", "expiresIn": 900 } }`.
- **Rules:** reuse of a rotated refresh token revokes the token family. Employee status is re-checked — suspended/inactive employees do not receive a new token.
- **Errors:** `401 UNAUTHENTICATED` / `TOKEN_EXPIRED`, `403`, `429`.
- **Audit:** not required per refresh (avoid log noise); record family revocation.

### `POST /api/v1/auth/employee/logout`

- **Purpose:** revoke the current session (and optionally all sessions).
- **Auth:** employee session.
- **Request body:** optional `{ "allSessions": false }`.
- **Response `200`:** `{ "ok": true }`.
- **Audit:** `EMPLOYEE_LOGOUT`.

---

## Collection response

### `GET /api/v1/employees`

**SUPER_ADMIN required** (management scope).

Query parameters:

- `q`: name, employee ID, email, or phone search
- `role`: exact employee role
- `status`: exact employee status
- `department`: exact department
- `cursor` / `limit`: pagination (recommended)
- `sort`: allowlisted stable sort, for example `name`, `employeeId`, `lastLogin`

Response:

```json
{
  "data": [{ "employeeId": "PF-MGR-00008", "firstName": "Vikram", "lastName": "Iyer" }],
  "meta": {
    "total": 13,
    "active": 8,
    "inactive": 1,
    "nextCursor": null
  }
}
```

Validation and behavior:

- Apply search/filter/pagination in the repository/query layer, not repeatedly in presentation code.
- Never include Admin identities or credential material.
- Counts use the same filtered account source of truth.
- Return stable ordering to prevent pagination duplicates.

Errors: `401`, `403`, `422` for invalid filters.

## Detail response

### `GET /api/v1/employees/{employee_id}`

**SUPER_ADMIN required** (management scope; an employee may read their own record via `/employees/me`).

Response:

```json
{
  "data": {
    "employeeId": "PF-MGR-00008",
    "firstName": "Vikram",
    "lastName": "Iyer",
    "status": "ACTIVE"
  },
  "activity": [
    {
      "id": "act-123",
      "action": "EMPLOYEE_UPDATED",
      "summary": "Updated Vikram Iyer",
      "actorName": "Kavya Menon · PF-ADM-00001",
      "at": "2026-08-14T10:00:00.000Z"
    }
  ]
}
```

Activity is optional if supplied by the shared activity/audit source (`GET /api/v1/employees/{employee_id}/activity`). Return account-administration-relevant history; do not duplicate an Employee Portal dashboard.

Errors: `401`, `403`, `404`.

## Create employee

### `POST /api/v1/employees`

**SUPER_ADMIN required**.

Request:

```json
{
  "firstName": "Asha",
  "lastName": "Patel",
  "email": "asha.patel@pratikshyafashon.in",
  "phone": "+91 98765 43210",
  "role": "SALES_EXECUTIVE",
  "department": "WOMENS_SAREES",
  "section": "SILK_BANARASI",
  "store": "MAIN_FLOOR",
  "joiningDate": "2026-08-14",
  "status": "PENDING",
  "permissionMode": "role",
  "permissions": []
}
```

Response `201`:

```json
{
  "data": {
    "employeeId": "PF-SLS-00156",
    "firstName": "Asha",
    "lastName": "Patel",
    "mustChangePassword": true
  },
  "credentialSetup": {
    "temporaryPassword": "one-time-value",
    "mustChangePassword": true,
    "expiresAt": "2026-08-15T10:00:00.000Z"
  }
}
```

Validation:

- Backend generates the deterministic unique `employeeId` transactionally using the established prefix/sequence policy.
- Reject client-supplied `id`, `employeeId`, timestamps, `lastLogin`, password hashes, or Admin identity fields.
- Reject `ADMIN`, `SUPER_ADMIN`, unknown employee roles, and `PF-ADM-*` IDs.
- Reject `employees.manage` and every employee-account administration permission.
- Validate email uniqueness, contact fields, department/section/store relationships, date, and status.
- Generate credentials through the Employee authentication system. Store only a production-grade password hash or one-time setup token, never a password on the employee record.
- Return a temporary secret once only, or replace this with a secure activation link if that is the backend standard.
- Write an audit event signed by the Admin actor.

Errors: `401`, `403`, `409`, `422`.

## Edit employee profile/account

### `PATCH /api/v1/employees/{employee_id}`

**SUPER_ADMIN required**.

Request fields (all optional):

```json
{
  "firstName": "Asha",
  "lastName": "Patel",
  "email": "asha.patel@pratikshyafashon.in",
  "phone": "+91 98765 43210",
  "role": "SALES_EXECUTIVE",
  "department": "BRIDAL",
  "section": "BRIDAL_COUTURE",
  "store": "BRIDAL_SUITE",
  "joiningDate": "2026-08-14",
  "status": "ACTIVE",
  "permissionMode": "custom",
  "permissions": ["dashboard.view", "products.view"]
}
```

Response `200`: `{ "data": Employee }`

Validation:

- `employeeId`, primary key, `createdAt`, and login metadata are immutable.
- Reject Admin roles/permissions.
- Validate the fully merged resulting record, not only isolated patch fields.
- Apply role + permissions + department updates atomically to avoid partial account state.
- Use optimistic concurrency (`If-Match`/version) if supported; otherwise return the latest `updatedAt`.
- Audit meaningful changes without recording secrets.

Errors: `401`, `403`, `404`, `409`, `422`.

> The granular operations below (`/status`, `/role`, `/permissions`) are retained as explicit endpoints because the current frontend exercises them as distinct workflows. A backend may implement them as sub-routes of `PATCH /employees/{employee_id}` — but they must remain individually authorizable and audited.

## Delete employee

### `DELETE /api/v1/employees/{employee_id}`

**SUPER_ADMIN required**.

- **Purpose:** permanently remove an employee record. **Planned capability — the current frontend has no delete operation.** The frontend's only destructive path today is non-destructive deactivation (`PATCH /api/v1/employees/{employee_id}/status` → `INACTIVE`/`SUSPENDED`).
- **Rules:** hard delete only when the record has no historical references (no orders, attendance, leave, performance, product reviews, activity); otherwise reject with `409 CONFLICT` and require deactivation instead. Never cascade-delete history to enable a delete.
- **Request body:** `{ "confirm": "PF-SLS-00156" }` (re-typed employee ID, mirroring the product permanent-delete confirm).
- **Response `204`** on success.
- **Audit:** `EMPLOYEE_DELETED` (actor + target ID).

Errors: `401`, `403`, `404`, `409`, `422`.

## Self-service profile

### `GET /api/v1/employees/me`

- **Purpose:** return the authenticated employee's own record + resolved effective permissions.
- **Auth:** employee session (or admin).
- **Response `200`:** `{ "ok": true, "data": Employee, "permissions": ["dashboard.view", "products.view"] }`.
- **Errors:** `401`.

### `PATCH /api/v1/employees/me`

- **Purpose:** employee edits their own profile (limited fields only — identity, status, assignment, role, permissions are excluded).
- **Auth:** employee session (owner).
- **Request body:** optional `{ "phone": …, "store": … }` (whitelisted profile fields only).
- **Response `200`:** `{ "data": Employee }`.
- **Audit:** `EMPLOYEE_PROFILE_UPDATED`.
- **Errors:** `401`, `409`, `422`.

## Status operation

### `PATCH /api/v1/employees/{employee_id}/status`

**SUPER_ADMIN required**.

Request: `{ "status": "INACTIVE", "reason": "Optional administrative note" }`

Response: `{ "data": Employee }`

Rules:

- `INACTIVE` and `SUSPENDED` must immediately invalidate/deny Employee Portal sessions.
- Inactive employees must be excluded from active work-assignment selectors.
- Existing assignments and all historical records remain; do not cascade-delete.
- `ACTIVE` restores authentication, subject to valid existing credentials.
- Status changes are idempotent and audited.

Errors: `401`, `403`, `404`, `422`.

## Role operation

### `PATCH /api/v1/employees/{employee_id}/role`

**SUPER_ADMIN required**.

Request:

```json
{
  "role": "INVENTORY_MANAGER",
  "permissionMode": "role",
  "keepCustomPermissions": false
}
```

Response: `{ "data": Employee }`

Rules: reject Admin roles; when mode is `role`, resolve the shared role defaults; when retaining custom permissions, revalidate every grant.

Errors: `401`, `403`, `404`, `422`.

## Permission operation

### `PATCH /api/v1/employees/{employee_id}/permissions`

**SUPER_ADMIN required**.

Request:

```json
{
  "permissionMode": "custom",
  "permissions": ["dashboard.view", "products.view", "products.manage"]
}
```

Response: `{ "data": Employee }`

Rules:

- Allow only known operational employee permissions.
- Explicitly reject `employees.manage` and related employee-account keys.
- Do not infer employee-account authority from products, inventory, orders, workforce, analytics, or any other operational permission.
- Deduplicate keys and audit the change.

Errors: `401`, `403`, `404`, `422`.

## Reset credentials

### `POST /api/v1/employees/{employee_id}/reset-credentials`

**SUPER_ADMIN required**.

Request:

```json
{
  "mode": "temporary_password",
  "revokeExistingSessions": true
}
```

Response `200`:

```json
{
  "data": {
    "employeeId": "PF-SLS-00124",
    "mustChangePassword": true
  },
  "credentialSetup": {
    "temporaryPassword": "one-time-value",
    "expiresAt": "2026-08-15T10:00:00.000Z"
  }
}
```

Rules:

- Rate-limit this action.
- Revoke active Employee sessions when requested (recommended default).
- Return the temporary secret once only; never return credential hashes.
- Do not log the temporary password.
- Audit who initiated the reset and when.

Errors: `401`, `403`, `404`, `422`, `429`.

---

## Attendance

### `GET /api/v1/employees/{employee_id}/attendance`

- **Purpose:** attendance records/summary for one employee.
- **Auth:** employee (owner) or scoped manager/admin (`attendance.view`).
- **Query parameters:** `month` (`YYYY-MM`), `from`/`to` (ISO dates), `cursor`/`limit`.
- **Response `200`:** `{ "data": { "records": [...], "summary": { "present": 22, "late": 1, "absent": 0 } } }`.
- **Errors:** `401`, `403`, `404`.

### `POST /api/v1/employees/{employee_id}/attendance/check-in`

- **Purpose:** record a check-in punch.
- **Auth:** employee (owner) or manager with `attendance.manage`.
- **Request body:** `{ "at": "2026-08-21T09:02:00Z", "location": "MAIN_FLOOR" }` (server re-validates `at` against settings; browser clock is not authority).
- **Response `201`:** `{ "data": { "record": ..., "status": "ON_TIME" | "LATE" | … } }`.
- **Errors:** `400`, `401`, `403`, `409` (already checked in), `422`.
- **Audit:** `ATTENDANCE_CHECK_IN`.

### `POST /api/v1/employees/{employee_id}/attendance/check-out`

- **Purpose:** record a check-out punch.
- **Auth:** employee (owner) or manager with `attendance.manage`.
- **Request body:** `{ "at": "2026-08-21T18:30:00Z" }`.
- **Response `201`:** `{ "data": { "record": ... } }`.
- **Errors:** `400`, `401`, `403`, `409` (no open check-in), `422`.
- **Audit:** `ATTENDANCE_CHECK_OUT`.

## Leave

### `GET /api/v1/employees/{employee_id}/leave`

- **Purpose:** leave requests for one employee (own or scoped view).
- **Auth:** employee (owner) or manager/admin (`leave.view`).
- **Query parameters:** `status`, `from`/`to`, `cursor`/`limit`.
- **Response `200`:** `{ "data": [ { "leaveId": ..., "type": "CASUAL", "startDate": …, "endDate": …, "status": "PENDING" } ] }`.
- **Errors:** `401`, `403`, `404`.

### `POST /api/v1/employees/{employee_id}/leave`

- **Purpose:** request leave.
- **Auth:** employee (owner) or manager (`leave.request`).
- **Request body:** `{ "type": "CASUAL", "startDate": "2026-09-01", "endDate": "2026-09-03", "reason": "…" }`.
- **Response `201`:** `{ "data": { "leaveId": ..., "status": "PENDING" } }`.
- **Errors:** `401`, `403`, `409` (overlapping/insufficient balance), `422`.
- **Audit:** `LEAVE_REQUESTED`.

### `PATCH /api/v1/leave/{leave_id}`

- **Purpose:** review/cancel a leave request.
- **Auth:** manager/admin (`leave.approve` / `leave.reject`); owner may `cancel`.
- **Request body:** `{ "decision": "APPROVED" | "REJECTED" | "CANCELLED", "reviewNote": "…" }`.
- **Response `200`:** `{ "data": { "leaveId": ..., "status": "APPROVED" } }`.
- **Audit:** `LEAVE_APPROVED` / `LEAVE_REJECTED` / `LEAVE_CANCELLED`.
- **Errors:** `401`, `403`, `404`, `409` (invalid transition), `422`.

## Performance

### `GET /api/v1/employees/{employee_id}/performance`

- **Purpose:** performance records/summary for one employee.
- **Auth:** employee (owner) or manager/admin (`performance.view`).
- **Query parameters:** `period` (period key, default current), `history=true` for full history.
- **Response `200`:** `{ "data": { "period": "2026-08", "score": 87, "targets": {...}, "history": [...] } }`.
- **Errors:** `401`, `403`, `404`.

## Activity

### `GET /api/v1/employees/{employee_id}/activity`

- **Purpose:** account-administration + audit-relevant activity for one employee (shared `audit_logs` source).
- **Auth:** employee (owner, own activity) or admin (`employees.manage`) / manager.
- **Query parameters:** `cursor`/`limit`, `action` filter.
- **Response `200`:** `{ "data": [ { "id": "act-123", "action": "EMPLOYEE_UPDATED", "summary": …, "actorName": …, "at": … } ], "meta": { "nextCursor": null } }`.
- **Errors:** `401`, `403`, `404`.

## Assisted orders

### `GET /api/v1/employees/{employee_id}/orders/assisted`

- **Purpose:** assisted orders created by/attributed to an employee (read from the canonical order register, `channel=ASSISTED`).
- **Auth:** employee (owner) or manager/admin (`orders.view`).
- **Query parameters:** `cursor`/`limit`, `status`.
- **Response `200`:** `{ "data": [ { "orderId": …, "customer": …, "items": …, "status": …, "channel": "ASSISTED" } ], "meta": { "nextCursor": null } }`.
- **Errors:** `401`, `403`, `404`.

### `POST /api/v1/employees/{employee_id}/orders/assisted`

- **Purpose:** create an assisted (floor) order through the **same** order entity as checkout orders (`channel=ASSISTED`, `source=employee_assisted`).
- **Auth:** employee with `orders.create` (employee scope) or manager/admin.
- **Request body:** `{ "items": [ { "productId": "PF-…", "quantity": 1, "selection": {} } ], "customer": { "fullName": "Walk-in", "phone": "…" }, "paymentMethod": "cod" }`.
- **Response `201`:** `{ "data": Order }` (server prices, server inventory check; customer identity optional only on this path).
- **Errors:** `400`, `401`, `403`, `409` (stock), `422`.
- **Audit:** `ORDER_CREATED` with `channel=ASSISTED` + employee actor.

## Reports

### `GET /api/v1/employees/reports/{section}`

`section ∈ { sales, products, customers, inventory, returns, offers, employees }` (the current `EmployeeReports.jsx` sections; the same analytics read-model as the Admin Portal, permission-scoped per section).

- **Purpose:** employee-visible analytics read-models (read-only; the backend owns aggregation).
- **Auth:** employee session with the matching `analytics.<section>` permission (e.g. `ANALYTICS_SALES`); customers never see this desk.
- **Query parameters:** `period` (e.g. `this-month`), `from`/`to`, `department`, `cursor`/`limit`.
- **Response `200`:** `{ "data": { "metrics": …, "series": […] }, "meta": { "period": … } }`.
- **Errors:** `401`, `403`, `422`.

---

## Employee authentication integration

The Employee login operation must read current employee status before issuing or restoring a session:

- `ACTIVE` may authenticate.
- Existing project rules for `PENDING`/`ON_LEAVE` remain unless backend policy changes are coordinated.
- `INACTIVE` and `SUSPENDED` must return a blocked-account error and revoke stale sessions.
- Admin identities must never resolve in the Employee authentication repository.

## Active assignment contract

Operational assignment endpoints/selectors (Product Review, order fulfillment, and similar) should query a shared scope equivalent to:

```text
identityDomain = EMPLOYEE
AND status = ACTIVE
AND required operational permission (when applicable)
```

This selector must never return `PF-ADM-*`, `ADMIN`, or `SUPER_ADMIN`. Assignment history may continue to reference an employee who was later deactivated; only new assignment eligibility is removed.

## Audit requirements

At minimum, write structured events for employee creation, profile update, role change, department change, permission change, activation, deactivation/suspension, credential reset, login/logout, attendance check-in/out, leave request/review/cancel, assisted order creation, and permanent deletion. Include actor Admin/Employee ID, target employee ID, action, timestamp, and non-secret summary. Reuse the existing shared activity/audit system (`audit_logs`).
