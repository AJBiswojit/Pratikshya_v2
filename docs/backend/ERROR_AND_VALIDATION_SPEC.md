# PRATIKSHYA FASHON — Error & Validation Specification

Every rule and message below is **quoted from the repository**. Where the frontend has no opinion — above all on HTTP status codes — the entry says so instead of inventing one.

---

## 0. The result envelope

The application has no HTTP layer. Every service function returns one of:

```js
{ ok: true,  ...payload }
{ ok: false, error: "One human sentence." }
{ ok: false, errors: ["Sentence.", "Sentence."] }   // publish/approve blockers
{ ok: false, error: "MEDIA_ALREADY_ASSIGNED", ownerProductId, ownerProductName, ownerProductStatus }
```

Rules the backend must respect:
1. **Keep the envelope.** Whatever status codes are chosen, the body must still carry `ok` and `error`/`errors`, or every call site changes.
2. **Messages are user-facing copy**, sentence case with a full stop, written for shoppers and staff — not developer strings. Reuse them verbatim.
3. **`MEDIA_ALREADY_ASSIGNED` is the only machine-readable code in the codebase.** The UI branches on it to offer a transfer. Any further codes are new API surface — `BACKEND DECISION REQUIRED`.

> ### HTTP status codes — `NOT DEFINED / BACKEND DECISION REQUIRED`
> The frontend never produces, inspects or maps a status code. No `fetch`, no `axios`, no `response.status`, no 4xx/5xx handling exists anywhere. **Do not assume this document implies 400/401/403/404/409/422.** The mapping must be decided by the backend team and written back here.

---

## 1. Field validators (`src/utils/validation.js`)

| Validator | Rule | Failure message |
| --- | --- | --- |
| `isValidEmail` | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` on the trimmed value | `Please provide a valid email address.` |
| `isValidPhone` | `/^(?:\+91\|0)?[6-9]\d{9}$/` after stripping spaces, hyphens, parentheses | `Please enter a valid 10-digit mobile number.` |
| `isValidPincode` | `/^[1-9][0-9]{5}$/` | *(no dedicated message)* |
| `validatePassword` | non-empty **and** length ≥ 6 | `Password is required.` / `Password must be at least 6 characters.` |
| `validatePasswordMatch` | password valid **and** equal to confirmation | `Passwords do not match.` |
| `isValidIdentifier` | a valid email **or** a valid phone | — |
| `sanitizeReturnUrl` | relative paths starting with a single `/` only; rejects `//` and absolute URLs | falls back to `/account` |
| `formatPhone` | display normalisation to `+91 XXXXX XXXXX` | — |

`sanitizeReturnUrl` is an **open-redirect guard**. Any server-side redirect after login must apply the same rule.

---

## 2. Customer authentication (`src/context/AuthContext.jsx`)

| Rule | Message |
| --- | --- |
| identifier empty | `Please enter your email address or phone number.` |
| password missing or < 6 | `Please enter a valid password (minimum 6 characters).` |
| no matching account | `That email or phone doesn't match our records.` |
| first name empty on sign-up | `First name is required.` |
| invalid email on sign-up | `Please provide a valid email address.` |
| invalid phone on sign-up | `Please enter a valid 10-digit mobile number.` |
| email already registered | `An account with this email already exists. Please sign in.` |
| password rules on sign-up | message from `validatePassword()` |
| forgot-password, unknown identifier | `Please provide a registered email address or phone number.` |
| forgot-password success | `Password reset instructions have been sent to <identifier>.` |
| reset, password < 6 | `Password must be at least 6 characters.` |
| reset, mismatch | `Passwords do not match.` |
| reset success | `Your password has been successfully updated.` |

**Undefined:** hashing, salting, reset-token generation/expiry/single-use, account lockout, rate limiting, credential-stuffing defence, email verification, 2FA. All `BACKEND DECISION REQUIRED`.

---

## 3. Employee & admin authentication

| Rule | Message |
| --- | --- |
| blank credentials | `Enter your employee ID and password.` |
| malformed employee ID | `That employee ID does not look right.` |
| unknown employee ID | `That employee ID does not match our records.` |
| bad password | `Employee ID or password is not correct.` |
| no credential record | `This account has no credentials issued. Please contact your administrator.` |
| no role on the account | `This account has no assigned role. Please contact your administrator.` |
| verification failure | `Credentials could not be verified.` |
| change password, wrong current | `Current password is not correct.` |
| admin reset | `A new temporary password has been generated. This is a DEMO credential.` |

Status gate: `SUSPENDED` and `INACTIVE` cannot sign in (`canEmployeeLogin`); admin `SUSPENDED` cannot sign in (`canAdminSignIn`).

Password policy (settings section `employees`): min length **8**, uppercase ✔, lowercase ✔, number ✔, special character ✖, expiry **30 days**, inactive behaviour "Block sign in".
> Note the inconsistency the backend must resolve: **customers** are validated at ≥ 6 characters with no complexity, **employees** at ≥ 8 with complexity. `BACKEND DECISION REQUIRED`.

---

## 4. Employee records (`validateEmployeeDraft`)

| Field | Rule | Message |
| --- | --- | --- |
| firstName | required | `First name is required.` |
| lastName | required | `Last name is required.` |
| email | required | `Email is required.` |
| email | format | `Please enter a valid email address.` |
| email | unique | `An employee with this email already exists.` |
| phone | 10 digits | `Please enter a valid 10-digit mobile number.` |
| role | required and recognised | `Please choose a role.` / `That role is not recognised.` |
| department | required | `Please choose a department.` |
| store | required | `Please choose a store or floor.` |
| joiningDate | required | `Joining date is required.` |
| status | recognised | `Please choose a valid status.` / `That status is not recognised.` |
| ID generation | collision after retries | `Could not generate a unique employee ID.` |
| lookup | missing | `Employee not found.` |

---

## 5. Product validation

### Publish blockers (`getPublishIssues`) — the array form
```
Product ID is required.
Product name is required.
Product name must be real product information, not a placeholder.
SKU is required.
Category is required.
Selling price must be greater than zero.
A description is required.
At least one cover image is required before publishing.
Media ownership must be resolved before publishing (N conflicts).
A primary image owned by this product is required before publishing.
Review flags must be resolved before publishing: <labels>.
Grouping review must be resolved before publishing (<groupIds>).
```

### Pricing engine (`computePricing`)
```
MRP must be greater than zero.
Selling price must be greater than zero.
Selling price cannot be above MRP.
Percentage discount must be between 0 and 100.
Fixed discount cannot be negative.
Fixed discount cannot exceed the selling price.
GST rate must be between 0% and 100%.
Final price must never be negative.
```

### Identity
- Product ID pattern `^[A-Z0-9][A-Z0-9-]{1,14}$`; must be free (`changeProductId`).
- SKU unique (`skuTaken`), slug unique among non-archived (`slugTaken`, `suggestSlug`).
- Lookup failure: `Product not found.`

### Authorization
- Employee edit denied unless assigned + `products.manage` (`employeeCanEditProduct`).
- Fields outside `EMPLOYEE_EDITABLE_FIELDS` are **silently dropped**, not rejected. `BACKEND DECISION REQUIRED`: keep dropping, or start rejecting (a behaviour change the UI does not expect).

---

## 6. Media validation

| Rule | Message / behaviour |
| --- | --- |
| media missing | `Media not found.` |
| assigning contested media without confirm | `{ ok:false, error: "MEDIA_ALREADY_ASSIGNED", ownerProductId, ownerProductName, ownerProductStatus }` |
| `update()` on `id`/`scope`/`productId`/`placement`/`createdAt` | ignored (immutable) |
| ephemeral blob URL on update | ignored — the previous URL is kept |
| promoting a second `COVER` | incumbent demoted to `GALLERY` |
| image upload | `.jpg .jpeg .png .webp`, `image/jpeg\|png\|webp`, ≤ 10 MB |
| video upload | `.mp4 .webm`, `video/mp4\|webm`, ≤ 100 MB |

Canned rejection reasons (`REJECTION_REASONS`):
```
Image quality or lighting is not suitable.
Wrong product or colorway selected.
File format or aspect ratio does not meet house standards.
Please upload higher resolution or clearer angle.
Duplicate media asset.
```

---

## 7. Taxonomy validation

`Subcategory not found.` · category/collection lookups return `null` and the UI renders an empty state. Slug uniqueness is enforced by normalisation. Archiving is available; **deletion is not defined anywhere**.

---

## 8. Cart & offers

### Cart
| Rule | Behaviour |
| --- | --- |
| product no longer resolves | line dropped on restore |
| quantity above available stock | clamped (`clampFor`) |
| quantity < 1 | line removed |
| duplicate `(productId, color, size)` | merged |
| stored coupon no longer valid | dropped; `couponLapsed` surfaced |
| empty bag at checkout | `Your bag is empty.` |
| unavailable item | `A product in your bag is no longer available.` |

### Offer validation (`validateOffer`) — the single checkout gate
```
Coupon code is required.
That coupon code is already in use.            (admin, on create)
Use letters, numbers and hyphens only (2–24 characters).
Offer name is required.
Enter a discount greater than zero.
Percentage discount cannot exceed 100.
Minimum order cannot be negative.
Maximum discount cannot be negative.
End date cannot be before the start date.
Select at least one product. / category. / collection. / customer.
This offer isn't open yet.
This offer has expired.
This offer has reached its usage limit.
This offer is limited to one use per customer.
This offer is not valid for this order.
This offer isn't available for this collection.
This offer is already part of your order.
Only unused drafts can be removed. Archive the offer instead.
```
Success copy: `<CODE> is now part of your order.`

---

## 9. Inventory validation

```
Inventory record not found.          Inventory already exists.
Location name is required.           A location with that name already exists.
Choose store or warehouse.           Both transfer locations must be active.
Choose a source and destination.     Source and destination must be different.
Transfer not found.                  Transfer quantity must be greater than zero.
Receiving quantity must be greater than zero.
Adjustment cannot be zero.           Available stock cannot be negative.
This movement would make stock negative.
Damaged quantity must be greater than zero.
Inspection quantity must be greater than zero.
Only sold order inventory can be restocked.
Sold quantity is no longer sufficient to restock this order.
Source stock is no longer sufficient to dispatch this transfer.
Archived products cannot be transferred.
Inactive variants cannot carry a new stock movement.
That product variant no longer exists.
Reservation not found.               Reserved inventory no longer exists.
Reserved quantity is no longer available.
The order's inventory reservation could not be found.
The sold inventory allocation is no longer valid.
```

Quantity invariants (`normaliseQuantity`): `reserved ≤ onHand`; `damaged ≤ onHand − reserved`; `available = max(0, onHand − reserved − damaged)`; all non-negative integers. Reservations expire after **15 minutes**.

---

## 10. Orders & returns

### Orders
- Status transitions validated by `ORDER_TRANSITIONS` / `canTransition()`. An invalid transition is refused; `forceTransition()` is the admin override and must be audited.
- Customer cancellation only from `CANCELLABLE_STATUSES` (through `PICKING`); admin adds `PACKED`, `READY_TO_DISPATCH`.
- Returns only from `DELIVERED`.

### Returns
```
This order is not eligible for a return.
Please complete your return request.
Please select at least one piece to return.
Please choose a reason for the return.
Please choose how you would like this resolved.
Return not found.
That is not a valid step for this return.
This return cannot be approved right now.
This return cannot be rejected right now.
This return cannot be marked as received right now.
This return cannot be inspected right now.
Please select a rejection reason.
Pickup can only be scheduled for approved returns.
Please inspect every item before completing.
Refund can only be initiated after inspection is complete.
Refund can only be completed after initiation.
```
Success copy: `Return requested.` · `Pickup scheduled.` · `Return marked as received.` · `Inspection completed.` · `Refund initiated.` · `Refund completed.`

Guards: `canReviewReturn`, `canApproveReturn`, `canRejectReturn`, `canSchedulePickup`, `canReceiveReturn`, `canInspectReturn`, `canInitiateRefund`, `canCompleteRefund`. `customerFacingRejection()` converts an internal reason into customer-safe copy — **the internal reason must never be sent to the customer.**

Return window: settings `returns.returnWindowDays` (default 7).

---

## 11. Settings

Unknown section ⇒ `Unknown settings section`. Reads deep-merge over `SETTINGS_DEFAULTS`, so a missing or corrupt key silently falls back rather than throwing. Corrupt JSON ⇒ defaults are rewritten. **Preserve this forgiving read behaviour** — the UI has no error state for settings.

---

## 12. Workforce

- Attendance date must match `^\d{4}-\d{2}-\d{2}$`; `employeeId` required; unknown status falls back to `NOT_CHECKED_IN`. Unique `(employeeId, date)`.
- Leave: both dates must match the same pattern; they are auto-ordered; `days` defaults to the inclusive count; unknown `leaveType` falls back to `OTHER`; unknown status falls back to `PENDING`; overlapping leave is detected.
- Performance: `employeeId` + `period` required; unknown status falls back to `NOT_STARTED`. Unique `(employeeId, period)`.

---

## 13. Global defensive behaviours to preserve

1. **Corrupt storage never crashes.** Every repository wraps its read in `try/catch` and falls back to seed/default data. A backend should return a valid empty shape rather than an error where the UI has no error state (lists, settings, taxonomy).
2. **Normalisation is total.** `normaliseProductRecord`, `normaliseOrder`, `normaliseMedia`, `normaliseOffer`, `normaliseTaxonomyRecord`, `normaliseAttendance`, `normaliseLeave`, `normalisePerformance` widen any partial record to the full shape. **Backend responses must be complete**, or the UI silently substitutes defaults.
3. **Invalid records are dropped, not surfaced.** `normaliseEmployees` skips invalid rows and duplicate IDs; `restoreCart` skips dead lines. Keep the filtering server-side so the client never receives an unusable row.
4. **Credentials never leave the credential table.** Employee and admin profiles are stripped by `toPublicEmployee` / `toPublicAdmin`.
5. **Nothing is silent when ownership changes.** Media transfers require confirmation and write to the diary.

---

## 14. Undefined — backend decisions required

| Item | Why it matters |
| --- | --- |
| **HTTP status code mapping** | the frontend defines none |
| Additional machine-readable error codes | only `MEDIA_ALREADY_ASSIGNED` exists |
| Field-level error objects (`{ field, message }`) | the frontend expects flat strings |
| Localisation of error copy | all strings are English, `en-IN` formatting |
| Validation of `specifications` / `highlights` shape | free-form today |
| Max lengths for name, description, notes, tags | none enforced anywhere |
| Rate limiting and its error copy | absent |
| Request size limits, upload virus scanning | absent |
| Idempotency conflicts (double order submit) | no key, no message |
| Optimistic-concurrency conflicts | no version column, no message |
| Payment gateway failure taxonomy | only the 4 demo scenarios `success \| failure \| cancelled \| pending` |
