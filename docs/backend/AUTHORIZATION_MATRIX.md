# PRATIKSHYA FASHON — Authorization Matrix

Companion dataset: **`data/roles-permissions.json`** — 8 roles, 82 permissions, statuses, ID prefixes.

Source of truth: `src/services/employees/authorization.js`, `src/config/employeePermissions.js`, `src/config/employeeRoles.js`, `src/config/employeeStatus.js`, `src/config/adminAccess.js`, plus the per-feature guards `employeeCanEditProduct()` and `resolveMediaAccess()`.

---

## 1. Actors

| Actor | Session | Identity | Vocabulary |
| --- | --- | --- | --- |
| **Customer** | `pratikshya_auth` | `customer.id` | none — capability is implicit in the customer endpoints |
| **Employee** | `pratikshya_employee_auth` | `PF-<PREFIX>-#####` | 8 roles × 82 permissions, `permissionMode: role \| custom` |
| **Admin** | `pratikshya_admin_auth` | `adminId` | one role `SUPER_ADMIN`, status `ACTIVE \| SUSPENDED` |
| Guest | none | — | browse, cart, wishlist, guest checkout |

Employee statuses and login rights (`EMPLOYEE_STATUS`):

| Status | Can sign in |
| --- | --- |
| `ACTIVE` | ✔ |
| `PENDING` | ✔ |
| `ON_LEAVE` | ✔ |
| `SUSPENDED` | ✖ |
| `INACTIVE` | ✖ |

---

## 2. The evaluation order of `hasPermission(employee, permission)`

```
1. no employee                                 → DENY
2. !canEmployeeLogin(employee.status)          → DENY   (before any permission is read)
3. employee.role === SUPER_ADMIN               → ALLOW  (unconditional)
4. explicit permission present                 → ALLOW
5. family implication:
        offers.manage       ⇒ every offers.*
        attendance.manage   ⇒ every attendance.*
        leave.manage        ⇒ every leave.*
        performance.manage  ⇒ every performance.*
6. otherwise                                   → DENY
```

Related helpers: `hasAnyPermission`, `hasAllPermissions`, `canAccessPath` (route gating), `hasRecognizedRole`.

> **Step 2 is the one that gets missed.** Suspending an employee must revoke everything immediately, even if their permission rows still exist. The backend must evaluate status *before* permissions on every request, not only at login.

> **Step 3 note:** the stored default permission set for `SUPER_ADMIN` contains 75 of the 82 keys (the workforce `*.manage` family sits with `STORE_MANAGER` by default), but the short-circuit means `SUPER_ADMIN` is allowed everything at runtime regardless. Implement the short-circuit; do not rely on the stored list.

---

## 3. Feature matrix — the requested view

`✔` allowed · `—` denied · `◐` conditional (condition stated)

| Feature | Customer | Employee | Admin |
| --- | --- | --- | --- |
| Browse published catalogue | ✔ | ✔ | ✔ |
| See DRAFT / ARCHIVED products | — | ◐ `products.view` (workspace only, never a customer surface) | ✔ |
| **Product create** | — | ◐ `products.manage` | ✔ |
| **Product edit** | — | ◐ `products.manage` **AND** `product.assignedEmployeeId === self` **AND** only the 30 whitelisted fields | ✔ (all fields) |
| **Price edit** | — | ◐ same rule; `price`/`compareAtPrice` are inside the whitelist | ✔ |
| **Inventory (view)** | — | ✔ `inventory.view` (all 8 roles have it) | ✔ |
| **Inventory (receive / adjust / transfer / audit)** | — | ◐ `inventory.receive` / `.adjust` / `.transfer` / `.audit` | ✔ |
| **Inventory (thresholds, locations, full manage)** | — | ◐ `inventory.manage` (INVENTORY_MANAGER only) | ✔ |
| **Media upload** | — | ◐ `media.upload` (STORE_MANAGER, FASHION_STYLIST) | ✔ |
| **Media assignment to product** | — | ◐ `media.assign` (STORE_MANAGER) | ✔ |
| **Media delete** | — | — (no role has `media.delete` by default) | ✔ |
| **Product approval** | — | — (review is submitted by employees, decided by admin) | ✔ |
| **Publishing** | — | — | ✔ (blocked by `getPublishIssues()`) |
| **Unpublish / Archive / Restore** | — | — | ✔ |
| **Employee assignment to a product** | — | — | ✔ |
| **Taxonomy management** (categories, subcategories, collections) | — | ◐ `categories.*` / `collections.*` (STORE_MANAGER) | ✔ |
| **Orders — view** | own only | ◐ `orders.view` | ✔ |
| **Orders — place** | ✔ (incl. guest) | ◐ `orders.create` (SALES_EXECUTIVE — assisted orders) | ✔ |
| **Orders — cancel** | ◐ own, status ∈ `CANCELLABLE_STATUSES` | ◐ `orders.cancel` | ✔ (+ `PACKED`, `READY_TO_DISPATCH`) |
| **Orders — fulfilment (allocate/pick/pack/dispatch)** | — | ◐ `orders.fulfill` / `.pick` / `.pack` / `.dispatch` | ✔ |
| **Orders — force status transition** | — | — | ✔ (bypasses the adjacency map; must be audited) |
| **Returns — request** | ◐ own, `DELIVERED` only, inside the return window | — | — |
| **Returns — approve / reject / receive / inspect** | — | ◐ `returns.manage` (CUSTOMER_SUPPORT, STORE_MANAGER) | ✔ |
| **Refunds** | — | ◐ `orders.refund` (CUSTOMER_SUPPORT, STORE_MANAGER) | ✔ |
| **Offers — create / edit / activate / pause** | — | ◐ `offers.create` / `.edit` / `.activate` / `.pause` (STORE_MANAGER) | ✔ |
| **Offers — archive / full manage** | — | — (`offers.archive`, `offers.manage`: SUPER_ADMIN only) | ✔ |
| **Reports / analytics** | — | ◐ `analytics.view` + the specific `analytics.*` slice | ✔ |
| **User management (employees)** | — | ◐ `employees.view` (STORE_MANAGER can view only) | ✔ (create/edit/suspend/reset/permissions) |
| **Customer records** | own only | ◐ `customers.view`; `customers.manage` is SUPER_ADMIN only | ✔ |
| **Settings** | — | — | ✔ |
| **Attendance — own check in/out** | — | ✔ `attendance.checkin` / `.checkout` (all roles) | ✔ |
| **Attendance — correct others** | — | ◐ `attendance.correct` (STORE_MANAGER) | ✔ |
| **Leave — request** | — | ✔ `leave.create` (all roles) | ✔ |
| **Leave — approve / reject** | — | ◐ `leave.approve` / `.reject` (STORE_MANAGER) | ✔ |
| **Performance — review others** | — | ◐ `performance.review` (STORE_MANAGER) | ✔ |
| **AI Shopping assistant** | ✔ | ✔ | ✔ |
| **AI Mirror (virtual try-on)** | ✔ (signed-in; eligible categories only) | — | — |
| **AI Business assistant** | — | ◐ workspace access | ✔ |
| **Activity log** | — | ◐ own activity | ✔ (all) |

---

## 4. Role × permission grid (defaults, 82 permissions)

Runtime reminder: `SUPER_ADMIN` is allowed everything regardless of this table.

| Permission | SUPER_ADMIN | STORE_MANAGER | SALES_EXEC | INV_MANAGER | INV_STAFF | WAREHOUSE | SUPPORT | STYLIST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dashboard.view` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `products.view` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `products.manage` | ✔ | ✔ | — | — | — | — | — | — |
| `categories.view` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `categories.create` | ✔ | ✔ | — | — | — | — | — | — |
| `categories.edit` | ✔ | ✔ | — | — | — | — | — | — |
| `categories.archive` | ✔ | ✔ | — | — | — | — | — | — |
| `collections.view` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `collections.create` | ✔ | ✔ | — | — | — | — | — | — |
| `collections.edit` | ✔ | ✔ | — | — | — | — | — | — |
| `collections.assign` | ✔ | ✔ | — | — | — | — | — | — |
| `collections.archive` | ✔ | ✔ | — | — | — | — | — | — |
| `media.view` | ✔ | ✔ | — | ✔ | — | ✔ | — | ✔ |
| `media.upload` | ✔ | ✔ | — | — | — | — | — | ✔ |
| `media.edit` | ✔ | ✔ | — | — | — | — | — | — |
| `media.delete` | ✔ | — | — | — | — | — | — | — |
| `media.assign` | ✔ | ✔ | — | — | — | — | — | — |
| `media.manage` | ✔ | ✔ | — | — | — | — | — | — |
| `orders.view` | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ | — |
| `orders.create` | ✔ | — | ✔ | — | — | — | — | — |
| `orders.manage` | ✔ | ✔ | — | — | — | — | — | — |
| `orders.fulfill` | ✔ | ✔ | — | ✔ | — | ✔ | — | — |
| `orders.pick` | ✔ | ✔ | — | — | — | ✔ | — | — |
| `orders.pack` | ✔ | ✔ | — | — | — | ✔ | — | — |
| `orders.dispatch` | ✔ | ✔ | — | — | — | ✔ | — | — |
| `orders.cancel` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `orders.return` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `orders.refund` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `customers.view` | ✔ | ✔ | ✔ | — | — | — | ✔ | ✔ |
| `customers.manage` | ✔ | — | — | — | — | — | — | — |
| `inventory.view` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `inventory.receive` | ✔ | ✔ | — | ✔ | ✔ | ✔ | — | — |
| `inventory.adjust` | ✔ | ✔ | — | ✔ | ✔ | — | — | — |
| `inventory.transfer` | ✔ | ✔ | — | ✔ | ✔ | ✔ | — | — |
| `inventory.manage` | ✔ | — | — | ✔ | — | — | — | — |
| `inventory.audit` | ✔ | ✔ | — | ✔ | ✔ | ✔ | — | — |
| `warehouse.view` | ✔ | ✔ | — | ✔ | — | ✔ | — | — |
| `warehouse.pick` | ✔ | ✔ | — | — | — | ✔ | — | — |
| `returns.view` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `returns.manage` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `offers.view` | ✔ | ✔ | ✔ | — | — | — | ✔ | ✔ |
| `offers.create` | ✔ | ✔ | — | — | — | — | — | — |
| `offers.edit` | ✔ | ✔ | — | — | — | — | — | — |
| `offers.activate` | ✔ | ✔ | — | — | — | — | — | — |
| `offers.pause` | ✔ | ✔ | — | — | — | — | — | — |
| `offers.archive` | ✔ | — | — | — | — | — | — | — |
| `offers.manage` | ✔ | — | — | — | — | — | — | — |
| `employees.view` | ✔ | ✔ | — | — | — | — | — | — |
| `employees.create` | ✔ | — | — | — | — | — | — | — |
| `employees.edit` | ✔ | — | — | — | — | — | — | — |
| `employees.suspend` | ✔ | — | — | — | — | — | — | — |
| `employees.resetPassword` | ✔ | — | — | — | — | — | — | — |
| `employees.managePermissions` | ✔ | — | — | — | — | — | — | — |
| `employees.manage` | ✔ | — | — | — | — | — | — | — |
| `analytics.view` | ✔ | ✔ | — | ✔ | — | — | ✔ | — |
| `analytics.sales` | ✔ | ✔ | — | — | — | — | — | — |
| `analytics.products` | ✔ | ✔ | — | ✔ | — | — | — | — |
| `analytics.customers` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `analytics.inventory` | ✔ | ✔ | — | ✔ | — | — | — | — |
| `analytics.returns` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `analytics.offers` | ✔ | ✔ | — | — | — | — | — | — |
| `analytics.employees` | ✔ | ✔ | — | — | — | — | — | — |
| `profile.view` / `profile.edit` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `attendance.view` / `.checkin` / `.checkout` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `attendance.manage` / `.correct` | — | ✔ | — | — | — | — | — | — |
| `leave.view` / `leave.create` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `leave.approve` / `.reject` / `.manage` | — | ✔ | — | — | — | — | — | — |
| `performance.view` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `performance.manage` / `.review` | — | ✔ | — | — | — | — | — | — |
| `team.view` | ✔ | ✔ | — | ✔ | — | — | — | — |
| `support.view` | ✔ | ✔ | — | — | — | — | ✔ | — |
| `support.manage` | ✔ | — | — | — | — | — | ✔ | — |
| `styling.view` | ✔ | ✔ | — | — | — | — | — | ✔ |
| `styling.manage` | ✔ | — | — | — | — | — | — | ✔ |

Default counts: SUPER_ADMIN 75 · STORE_MANAGER 68 · INVENTORY_MANAGER 26 · CUSTOMER_SUPPORT 26 · WAREHOUSE_STAFF 24 · FASHION_STYLIST 19 · SALES_EXECUTIVE 17 · INVENTORY_STAFF 17.

---

## 5. The two conditional guards that permissions alone do not express

### 5.1 Product editing — ownership of the assignment
```js
employeeCanEditProduct(employee, product) =
      canEmployeeLogin(employee.status)
  &&  ( employee.role === SUPER_ADMIN
        || ( hasPermission(employee, "products.manage")
             && product.assignedEmployeeId === employee.employeeId ) )
```
**`products.manage` alone is not enough.** An employee may only edit a product assigned to them. This is the "no unauthorized employee edits" integrity rule and it must be enforced server-side, not just hidden in the UI.

### 5.2 Field-level whitelist
Even an authorised employee may write only `EMPLOYEE_EDITABLE_FIELDS` (30):
`name, price, compareAtPrice, description, shortDescription, category, subcategory, gender, fabric, material, primaryColor, secondaryColor, colors, patterns, work, occasion, sizes, season, fit, length, highlights, careInstructions, collectionIds, collections, tags, stock, availability`

Notably **not** editable by an employee: `id`, `sku`, `slug`, `status`, `published`, `review`, `reviewFlags`, `assignedEmployeeId`, `mediaIds`, `primaryMediaId`, `galleryMediaIds`, `variants`, `seo`, any audit field.
`pickEmployeeEditableFields()` drops everything else silently — the backend must do the same or reject.

### 5.3 Media access
`resolveMediaAccess({ admin, employee })` → `{ canView, canUpload, canEdit, canDelete, canAssign, canManageMarketing }`.
Admin ⇒ full grant. No actor ⇒ nothing. Employee ⇒ one permission per capability.

---

## 6. Route gating

`canAccessPath(employee, path)` gates `/employee/*`; `src/config/adminAccess.js` + `AdminAuthContext` gate `/admin/*`; unauthorised employees land on `/employee/access-denied`.

**These are UI conveniences.** Every `/admin/*` and `/employee/*` route has a data path behind it that must be independently authorised server-side. Route gating is not authorization.

---

## 7. Customer scoping

The customer has no permission vocabulary. The rules are ownership rules:
- Orders: only `order.customerId === self` (guest orders match on email until claimed).
- Addresses, preferences, wishlist, cart, recently-viewed, AI Mirror history: own rows only.
- `notes.internal[]` on an order must **never** be serialised to a customer endpoint.
- Draft/archived products must never appear on a customer endpoint, even by direct id.

---

## 8. Not defined — backend decisions required

| Item | Note |
| --- | --- |
| Customer account status/ban | Admin UI prints `ACTIVE` as a literal; no enum, no suspension path |
| Multiple admins / admin roles beyond `SUPER_ADMIN` | `ADMIN_ROLES` has exactly one value |
| Delegation, temporary elevation, break-glass | absent |
| Per-store / per-location scoping of permissions | `employee.store` exists and `workforce/scope.js` filters some views, but permissions are global |
| Approval of an employee's *own* submission by themselves | not prevented anywhere — decide whether self-approval is allowed |
| API keys / service accounts / machine-to-machine auth | absent |
| Session TTL, refresh, concurrent-session limits, forced logout on permission change | only `refreshEmployeeSession()` exists |
| Audit of permission checks (denied attempts) | only successful actions are logged |
