# CareFlow Enterprise Playwright Readiness Standard

## 1. Purpose

This document defines the frontend standards required to make the CareFlow React application ready for stable, maintainable, enterprise level Playwright testing.

The current focus is Playwright readiness for a React application using:

```text
React
TanStack Query
TanStack Table
TanStack Router
Playwright
```

The goal is to make sure Playwright tests are stable, readable, maintainable, and do not depend on fragile selectors such as CSS classes, DOM nesting, XPath, repeated button text, or timing delays.

The React code should be built so Playwright can interact with the application the same way a real user would, while still having stable test hooks where needed.

---

## 2. Core Enterprise Rule

Every important screen should be:

```text
Semantic
Accessible
Testable
Predictable
Stable for automation
```

The frontend standard is:

```text
Use semantic HTML first.
Use data-testid for stable automation.
Use ARIA only where native HTML is not enough.
Expose clear UI states for TanStack Query, TanStack Table, and TanStack Router.
Avoid fragile selectors completely.
```

This means we should not choose between semantics and test IDs. We need both.

Semantics make the UI understandable and accessible.

`data-testid` makes Playwright automation stable for dynamic or repeated UI.

---

## 3. Playwright Selector Strategy

Playwright tests should use selectors in this priority order:

```ts
page.getByRole()
page.getByLabel()
page.getByPlaceholder()
page.getByText()
page.getByTestId()
```

### Good examples

```ts
await page.getByRole('button', { name: 'Save Service User' }).click();

await page.getByLabel('First Name').fill('John');

await page.getByTestId('service-user-row-123').click();
```

### Bad examples

```ts
await page.locator('.btn-primary').click();

await page.locator('div > div > button').click();

await page.locator('//button[text()="Save"]').click();

await page.waitForTimeout(3000);
```

Playwright tests should not depend on:

```text
CSS classes
DOM nesting
XPath
Random delays
Repeated text like Save, Edit, View
Random database data
```

---

## 4. Semantic HTML Standard

The React developer should use real HTML elements wherever possible.

### 4.1 Actions

Use real buttons for actions.

```tsx
<button type="submit">Save Service User</button>
```

Do not use clickable divs.

```tsx
<div onClick={handleSave}>Save Service User</div>
```

### 4.2 Navigation

Use real links for navigation.

```tsx
<Link to="/service-users">Service Users</Link>
```

Do not use non semantic elements for navigation.

```tsx
<div onClick={() => navigate('/service-users')}>Service Users</div>
```

### 4.3 Inputs

Every input should have a proper label.

```tsx
<label htmlFor="firstName">First Name</label>

<input
  id="firstName"
  name="firstName"
  type="text"
  data-testid="service-user-first-name-input"
/>
```

Do not rely only on placeholder text.

```tsx
<input placeholder="First Name" />
```

### 4.4 Page headings

Every route should have one clear page heading.

```tsx
<h1 data-testid="service-users-page-title">Service Users</h1>
```

Playwright can then confirm the correct page loaded.

```ts
await expect(
  page.getByRole('heading', { name: 'Service Users' })
).toBeVisible();
```

### 4.5 Tables

Use real table markup when displaying tabular data.

```tsx
<table data-testid="service-users-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Assigned Carer</th>
      <th>Actions</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>John Smith</td>
      <td>Active</td>
      <td>Sarah Khan</td>
      <td>
        <button type="button">View</button>
      </td>
    </tr>
  </tbody>
</table>
```

---

## 5. data-testid Standard

Even when semantic HTML is used, critical elements must still have stable `data-testid` values.

Use `data-testid` for:

```text
Forms
Inputs
Buttons
Dropdowns
Date pickers
Modals
Drawers
Tables
Rows
Cards
Tabs
Filters
Search fields
Pagination
Toast messages
Loading states
Empty states
Error states
Success states
Permission based actions
Rota calendar cells
Visit cards
Care worker rows
Service user rows
```

### 5.1 Naming convention

Use this format:

```text
module-action-element
```

Examples:

```text
login-email-input
login-password-input
login-submit-button

service-user-create-button
service-user-first-name-input
service-user-save-button
service-user-row-{id}
service-user-edit-button-{id}
service-user-view-button-{id}

care-worker-create-button
care-worker-row-{id}
care-worker-status-select

rota-calendar
rota-slot-{id}
rota-assign-care-worker-button

visit-card-{id}
visit-clock-in-button
visit-clock-out-button

reports-date-filter
reports-export-button
```

### 5.2 Dynamic records

For repeated records, use dynamic test IDs based on the record ID.

```tsx
<tr data-testid={`service-user-row-${serviceUser.id}`}>
  <td>{serviceUser.fullName}</td>
  <td>{serviceUser.status}</td>
  <td>
    <button
      type="button"
      aria-label={`View service user ${serviceUser.fullName}`}
      data-testid={`service-user-view-button-${serviceUser.id}`}
    >
      View
    </button>
  </td>
</tr>
```

Playwright can then target the exact record.

```ts
await page.getByTestId(`service-user-view-button-${serviceUserId}`).click();
```

---

## 6. ARIA Standard

ARIA should be used carefully.

The rule is:

```text
Use native HTML first.
Use ARIA only when native HTML does not provide enough meaning.
```

Bad ARIA is worse than no ARIA.

### 6.1 Required for icon only buttons

If a button only contains an icon, add `aria-label`.

```tsx
<button
  type="button"
  aria-label="Edit service user"
  data-testid={`service-user-edit-button-${serviceUser.id}`}
>
  <EditIcon />
</button>
```

This allows Playwright to use:

```ts
await page.getByRole('button', { name: 'Edit service user' }).click();
```

### 6.2 Not required when visible text exists

If the button already has clear visible text, do not duplicate it with ARIA.

```tsx
<button
  type="submit"
  data-testid="service-user-save-button"
>
  Save Service User
</button>
```

Do not unnecessarily add:

```tsx
aria-label="Save Service User"
```

### 6.3 Custom components

ARIA may be required for:

```text
Icon only buttons
Custom dropdowns
Comboboxes
Modals
Drawers
Tabs
Tooltips
Date pickers
Calendar cells
Drag and drop areas
Complex rota components
```

---

## 7. Reusable Component Standard

All shared React components must accept a `testId` prop and pass it to the correct DOM element.

This applies to:

```text
Button
Input
Select
Textarea
Checkbox
Radio
Modal
Drawer
Table
DatePicker
Dropdown
Tabs
Toast
Pagination
SearchBox
FileUploader
```

### 7.1 Button example

```tsx
type AppButtonProps = {
  children: React.ReactNode;
  testId?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
};

export function AppButton({
  children,
  testId,
  type = 'button',
  disabled,
  isLoading,
  onClick,
}: AppButtonProps) {
  return (
    <button
      type={type}
      data-testid={testId}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      onClick={onClick}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
```

### 7.2 Usage example

```tsx
<AppButton
  type="submit"
  testId="service-user-save-button"
  isLoading={createMutation.isPending}
>
  Save Service User
</AppButton>
```

---

## 8. TanStack Query Readiness

TanStack Query controls server state, caching, refetching, loading, errors, and mutations.

For Playwright, all important query and mutation states must be visible and predictable.

Every query based screen should expose:

```text
Initial loading
Background fetching
Success state
Empty state
Error state
Refetching state
Mutation pending
Mutation success
Mutation error
```

### 8.1 Query states

```tsx
{isLoading && (
  <div data-testid="service-users-loading">
    Loading service users...
  </div>
)}

{isFetching && !isLoading && (
  <div data-testid="service-users-refetching">
    Refreshing service users...
  </div>
)}

{isError && (
  <div role="alert" data-testid="service-users-error">
    Failed to load service users
  </div>
)}

{data?.length === 0 && (
  <div data-testid="service-users-empty-state">
    No service users found
  </div>
)}
```

### 8.2 Mutation states

For create, update, delete, assign visit, clock in, clock out, and care note actions:

```tsx
<button
  type="submit"
  disabled={createServiceUserMutation.isPending}
  data-testid="service-user-save-button"
>
  {createServiceUserMutation.isPending ? 'Saving...' : 'Save Service User'}
</button>
```

Playwright can verify the real disabled state.

```ts
await expect(page.getByTestId('service-user-save-button')).toBeDisabled();
```

### 8.3 Test environment query settings

For test environments, consider disabling unnecessary retries and background refetching if they make Playwright tests flaky.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: process.env.NODE_ENV === 'test' ? false : 3,
      refetchOnWindowFocus: process.env.NODE_ENV === 'test' ? false : true,
    },
    mutations: {
      retry: false,
    },
  },
});
```

This should only affect test behavior. Production behavior should not be weakened.

---

## 9. TanStack Table Readiness

TanStack Table is headless. It provides table logic, but the developer controls the actual markup.

The developer must render proper semantic table HTML and stable selectors.

Every TanStack Table should expose:

```text
Table wrapper
Table heading
Column headers
Sorting buttons
Search input
Column filters
Rows
Row IDs
Row action buttons
Selected row state
Pagination buttons
Page size selector
Loading state
Empty state
Error state
```

### 9.1 Table example

```tsx
<table data-testid="service-users-table">
  <thead>
    <tr>
      <th>
        <button
          type="button"
          data-testid="service-users-sort-name-button"
          aria-label="Sort service users by name"
        >
          Name
        </button>
      </th>

      <th>Status</th>
      <th>Assigned Carer</th>
      <th>Actions</th>
    </tr>
  </thead>

  <tbody>
    {rows.map((row) => (
      <tr data-testid={`service-user-row-${row.original.id}`}>
        <td>{row.original.fullName}</td>
        <td>{row.original.status}</td>
        <td>{row.original.assignedCarer}</td>
        <td>
          <button
            type="button"
            aria-label={`View service user ${row.original.fullName}`}
            data-testid={`service-user-view-button-${row.original.id}`}
          >
            View
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### 9.2 Search, filters, and pagination

```tsx
<input
  aria-label="Search service users"
  data-testid="service-users-search-input"
/>

<button
  type="button"
  disabled={!table.getCanPreviousPage()}
  data-testid="service-users-previous-page-button"
>
  Previous
</button>

<button
  type="button"
  disabled={!table.getCanNextPage()}
  data-testid="service-users-next-page-button"
>
  Next
</button>

<select
  aria-label="Rows per page"
  data-testid="service-users-page-size-select"
>
  <option value="10">10</option>
  <option value="25">25</option>
  <option value="50">50</option>
</select>
```

### 9.3 Virtualized tables

If virtualization is used later, Playwright cannot interact with rows that are not currently rendered in the DOM.

In that case:

```text
Tests must scroll before interacting with off screen rows.
Rows must have stable dynamic test IDs.
The table should expose a clear loading or rendering state.
Avoid assuming all rows are present in the DOM at once.
```

---

## 10. TanStack Router Readiness

TanStack Router controls routes, navigation, route loading, route errors, search params, and protected routes.

Every route should have:

```text
Stable route path
Real Link navigation
Clear h1 heading
Route loading state
Route error state
Permission denied state
Not found state
Stable search params
Breadcrumbs where useful
```

### 10.1 Link navigation

```tsx
<Link
  to="/service-users"
  data-testid="nav-service-users-link"
>
  Service Users
</Link>
```

### 10.2 Page structure

```tsx
<main>
  <h1 data-testid="service-users-page-title">Service Users</h1>
</main>
```

Playwright:

```ts
await page.getByRole('link', { name: 'Service Users' }).click();

await expect(
  page.getByRole('heading', { name: 'Service Users' })
).toBeVisible();
```

### 10.3 Protected routes

Permission based pages should expose clear states.

```tsx
{!canViewServiceUsers && (
  <div role="alert" data-testid="service-users-permission-denied">
    You do not have permission to view service users.
  </div>
)}
```

### 10.4 Not found routes

```tsx
<div role="alert" data-testid="route-not-found">
  Page not found
</div>
```

---

## 11. Forms Readiness

Every form should have:

```text
Form level test ID
Proper label for each field
Field level test ID
Validation error test ID
Submit button test ID
Cancel button test ID
Loading state
Success state
Error state
Disabled state during submission
```

### 11.1 Form example

```tsx
<form
  onSubmit={handleSubmit}
  data-testid="service-user-create-form"
>
  <label htmlFor="firstName">First Name</label>

  <input
    id="firstName"
    name="firstName"
    type="text"
    data-testid="service-user-first-name-input"
    aria-describedby="firstName-error"
  />

  {errors.firstName && (
    <p
      id="firstName-error"
      role="alert"
      data-testid="service-user-first-name-error"
    >
      First name is required
    </p>
  )}

  <button
    type="submit"
    disabled={createMutation.isPending}
    data-testid="service-user-save-button"
  >
    {createMutation.isPending ? 'Saving...' : 'Save Service User'}
  </button>
</form>
```

---

## 12. Modal, Drawer, and Dropdown Readiness

For modals and drawers:

```text
Use role dialog
Use aria-labelledby
Add test ID to modal wrapper
Add test ID to close button
Add test ID to confirm button
Add test ID to cancel button
Handle Escape key
Trap focus if possible
```

### 12.1 Modal example

```tsx
<div
  role="dialog"
  aria-labelledby="delete-service-user-title"
  data-testid="delete-service-user-modal"
>
  <h2 id="delete-service-user-title">
    Delete Service User
  </h2>

  <button
    type="button"
    data-testid="delete-service-user-cancel-button"
  >
    Cancel
  </button>

  <button
    type="button"
    data-testid="delete-service-user-confirm-button"
  >
    Delete
  </button>
</div>
```

### 12.2 Dropdowns and comboboxes

For custom dropdowns:

```text
Expose the trigger button
Expose selected value
Expose options list
Expose every option
Expose empty state
Expose disabled state
Expose loading state if async
```

Example test IDs:

```text
care-worker-select-trigger
care-worker-select-value
care-worker-select-options
care-worker-select-option-{id}
care-worker-select-empty-state
```

---

## 13. Toast and Notification Readiness

Success and error messages must be testable.

### 13.1 Success message

```tsx
<div role="status" data-testid="service-user-created-success">
  Service user created successfully
</div>
```

### 13.2 Error message

```tsx
<div role="alert" data-testid="service-user-created-error">
  Service user could not be created
</div>
```

Do not show important messages only as animations that disappear too quickly.

Playwright should have enough time to detect them.

---

## 14. Loading, Empty, Error, and Success States

Every screen should have predictable states.

Example for Service Users:

```text
service-users-loading
service-users-refetching
service-users-empty-state
service-users-error
service-users-table
service-user-created-success
service-user-updated-success
service-user-deleted-success
```

This helps Playwright wait for real UI behavior instead of using hard waits.

---

## 15. Permission Based UI

CareFlow will have role based access.

Possible roles:

```text
Admin
Manager
Care worker
Read only user
```

The frontend should expose permission behavior clearly.

### 15.1 Allowed action

```tsx
{canCreateServiceUser && (
  <button
    type="button"
    data-testid="service-user-create-button"
  >
    Create Service User
  </button>
)}
```

### 15.2 Restricted action

```tsx
{!canCreateServiceUser && (
  <div data-testid="service-user-create-not-allowed">
    You do not have permission to create service users.
  </div>
)}
```

Playwright should test both allowed and restricted users.

---

## 16. Recommended Playwright Project Structure

Recommended structure for `careflow-e2e-tests`:

```text
careflow-e2e-tests/
  tests/
    smoke/
      login.spec.ts
      dashboard.spec.ts

    auth/
      login.spec.ts
      logout.spec.ts
      permissions.spec.ts

    service-users/
      create-service-user.spec.ts
      update-service-user.spec.ts
      delete-service-user.spec.ts
      service-user-table.spec.ts

    care-workers/
      create-care-worker.spec.ts
      update-care-worker.spec.ts

    rota/
      create-rota.spec.ts
      assign-visit.spec.ts
      rota-calendar.spec.ts

    visits/
      clock-in.spec.ts
      clock-out.spec.ts
      visit-notes.spec.ts

    reports/
      reports-filter.spec.ts
      export-report.spec.ts

  pages/
    LoginPage.ts
    DashboardPage.ts
    ServiceUsersPage.ts
    CareWorkersPage.ts
    RotaPage.ts
    VisitsPage.ts
    ReportsPage.ts

  fixtures/
    auth.fixture.ts
    users.fixture.ts
    roles.fixture.ts
    serviceUsers.fixture.ts
    careWorkers.fixture.ts
    visits.fixture.ts

  utils/
    apiClient.ts
    testDataFactory.ts
    authHelper.ts
    cleanup.ts
    constants.ts

  auth/
    admin.storageState.json
    manager.storageState.json
    carer.storageState.json
    readonly.storageState.json

  playwright.config.ts
  package.json
  README.md
```

---

## 17. Playwright Config Standard

Example config:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html'],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

---

## 18. Test Data Standard

Playwright tests should not depend on random existing records.

We need:

```text
Fixed test users
Seeded roles
Seeded permissions
Seeded service users
Seeded care workers
Seeded visits
Cleanup after tests
Unique test data per run
Separate test environment
No real patient data
No real care worker data
```

Example users:

```text
admin@careflow.test
manager@careflow.test
carer@careflow.test
readonly@careflow.test
```

---

## 19. Authentication Standard

Do not log in manually in every test.

Use storage state:

```ts
test.use({ storageState: 'auth/admin.storageState.json' });
```

Recommended approach:

```text
One login test checks the actual login form.
Most tests reuse authenticated storage state.
Permission tests use different role based storage states.
Session expiry should have its own dedicated tests.
```

---

## 20. Page Object Model Standard

Use page objects for repeated flows.

### 20.1 Login page object example

```ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async expectLoginError() {
    await expect(this.page.getByRole('alert')).toBeVisible();
  }
}
```

---

## 21. Test Writing Rules

Developers and QA should follow these rules:

```text
Do not use CSS selectors unless there is no other option.
Do not use XPath.
Do not use hard waits.
Do not depend on DOM nesting.
Do not depend on random data.
Do not test everything through E2E.
Do not write huge tests that cover too many flows.
Use clear assertions after every major action.
Use test.step for readability.
Use API helpers for setup and cleanup.
Use role and label locators first.
Use test IDs for dynamic or repeated elements.
```

---

## 22. Critical CareFlow E2E Flows

Playwright should cover these flows first:

```text
Admin login
Manager login
Care worker login
Invalid login
Forgot password if included

Admin dashboard loads
Role based navigation appears correctly
Unauthorized route shows permission denied

Create service user
Update service user
Search service user
Filter service user table
View service user profile

Create care worker
Update care worker
Assign care worker to visit

Create rota
View rota calendar
Assign visit
Update visit
Cancel visit if included

Clock in
Clock out
Add care note
Add visit note
View visit history

Generate report
Filter report by date
Export report if included

Logout
Session expiry handling
```

---

## 23. CI/CD Standard

The pipeline should run:

```text
Install dependencies
Run lint
Run type check
Build frontend
Start test environment
Seed test data
Run Playwright smoke tests
Run full Playwright suite where required
Upload HTML report
Upload traces, screenshots, and videos on failure
Block deployment if critical tests fail
```

Recommended split:

```text
Pull request pipeline: smoke tests and critical flows
Staging pipeline: full regression suite
Production deployment: smoke tests before and after deployment
Nightly pipeline: full cross browser regression
```

---

## 24. Definition of Done for Frontend

A frontend task is not complete unless:

```text
Semantic HTML is used
Important elements have data-testid
Inputs have labels
Icon buttons have aria-label
Loading state is visible
Error state is visible
Empty state is visible where applicable
Success state is visible where applicable
Buttons use real disabled state
TanStack Query states are handled
TanStack Table controls are testable
TanStack Router page has heading and route states
Playwright can test the flow without CSS selectors or hard waits
```

---

## 25. Developer Checklist

Before marking a React screen complete, check:

```text
Does the page have a clear h1?
Are forms using labels?
Are buttons real button elements?
Are navigation items real links?
Are important elements using stable data-testid values?
Are dynamic rows using record based test IDs?
Are loading, empty, error, and success states visible?
Are TanStack Query states testable?
Are TanStack Table controls testable?
Are TanStack Router states testable?
Are icon only buttons using aria-label?
Are custom components passing testId to the right DOM element?
Can Playwright test the flow without CSS selectors?
Can Playwright test the flow without waitForTimeout?
```

---

## 26. Final Standard

For CareFlow, the Playwright readiness standard is:

```text
Semantic HTML for user facing selectors.
data-testid for stable automation.
ARIA only where needed.
TanStack Query states exposed clearly.
TanStack Table rendered with testable controls.
TanStack Router routes made predictable.
Reusable components built with testId support.
No CSS selectors, XPath, hard waits, or timing based Playwright tests.
```

This is not overengineering.

This is the correct foundation for Playwright scripts that can survive real product changes.
