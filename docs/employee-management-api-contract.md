# Employee Management API Contract

**Audience:** backend implementation intern  
**Frontend owner:** Admin Portal `/admin/employees`  
**Authorization boundary:** **SUPER_ADMIN required** for every employee-management operation

This contract documents the backend seam required by the existing frontend employee repository. It does **not** introduce a second authentication system, an Admin-as-employee record, or a parallel employee database.

## Responsibility and identity boundary

- Admin identities authenticate through the existing Admin domain.
- Employee identities authenticate through the existing Employee domain.
- `Kavya Menon / PF-ADM-00001 / SUPER_ADMIN` remains an Admin identity only and must never be returned by an employee endpoint.
- Employee creation accepts operational employee roles only. `ADMIN`, `SUPER_ADMIN`, Admin IDs (`PF-ADM-*`), and Admin-only permissions are invalid.
- The Admin permission key is `employees.manage`. It is granted through the `SUPER_ADMIN` Admin role only.
- Operational employee permissions do not imply `employees.manage`.
- Deactivation is non-destructive: credentials are blocked and active assignment eligibility stops, while employee, product-review, activity, attendance, order, and other historical references remain.

## Authentication and authorization

Use the existing Admin session/token middleware. For all operations below the backend must verify:

1. A valid authenticated Admin identity.
2. Active Admin status.
3. Admin role `SUPER_ADMIN`.
4. Admin permission `employees.manage`.

A customer or employee session must not satisfy this check. Hiding frontend controls is not authorization.

Recommended errors:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | No valid Admin session |
| 403 | `EMPLOYEES_MANAGE_REQUIRED` | Authenticated identity lacks Admin employee-management authority |
| 404 | `EMPLOYEE_NOT_FOUND` | Employee does not exist |
| 409 | `EMPLOYEE_ID_CONFLICT` / `EMAIL_CONFLICT` | Unique identity conflict |
| 422 | `VALIDATION_ERROR` | Invalid fields, role, status, or permission |
| 429 | `RATE_LIMITED` | Credential reset or repeated mutation limited |

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
| `lastLogin` | Nullable backend-owned ISO timestamp; include only if supported by existing auth logging |

Passwords, credential hashes, reset tokens, and fingerprints must never appear on this object or in list/detail responses.

## Collection response

### `GET /employees`

**SUPER_ADMIN required**

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

### `GET /employees/:employeeId`

**SUPER_ADMIN required**

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

Activity is optional if supplied by the existing shared activity/audit source. Return account-administration-relevant history; do not duplicate an Employee Portal dashboard.

Errors: `401`, `403`, `404`.

## Create employee

### `POST /employees`

**SUPER_ADMIN required**

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
- Generate credentials through the existing Employee authentication system. Store only a production-grade password hash or one-time setup token, never a password on the employee record.
- Return a temporary secret once only, or replace this with a secure activation link if that is the backend standard.
- Write an audit event signed by the Admin actor.

Errors: `401`, `403`, `409`, `422`.

## Edit employee profile/account

### `PATCH /employees/:employeeId`

**SUPER_ADMIN required**

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

## Status operation

### `PATCH /employees/:employeeId/status`

**SUPER_ADMIN required**

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

### `PATCH /employees/:employeeId/role`

**SUPER_ADMIN required**

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

### `PATCH /employees/:employeeId/permissions`

**SUPER_ADMIN required**

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

### `POST /employees/:employeeId/reset-credentials`

**SUPER_ADMIN required**

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

## Employee authentication integration

The existing Employee login operation must read current employee status before issuing or restoring a session:

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

At minimum, write structured events for employee creation, profile update, role change, department change, permission change, activation, deactivation/suspension, and credential reset. Include actor Admin ID, target employee ID, action, timestamp, and non-secret summary. Reuse the existing shared activity/audit system.
