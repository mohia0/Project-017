# Perceived Performance and Navigation Speed Improvement Plan

I completely agree with your approach! If you already have beautifully designed skeleton loaders for your pages, we absolutely should use them. We do not need a third-party top loader if the built-in skeletons can do the job perfectly.

This creates the most "native" and branded experience possible.

## User Review Required

> [!IMPORTANT]
> I have removed the top loader from the plan and focused entirely on utilizing your existing skeleton loaders combined with the background data preloading. Please review this final plan. If you approve, I will begin implementation.

## Proposed Changes

### 1. Extract Existing Skeletons into `loading.tsx` Boundaries
When you click a link, Next.js freezes the screen because it is downloading the Javascript for the new page. 
To fix this, we will take the skeleton UI you already built inside your pages (like the one in `InvoicesPage`) and place it inside a new `loading.tsx` file for that route (e.g., `src/app/invoices/loading.tsx`). 
**What this does:** The moment a user clicks "Invoices", Next.js will instantly render your custom skeleton in the middle panel while the code downloads. No freezing, no delay, and it uses your exact design.

### 2. Aggressive Background Data Preloading
We will update `WorkspaceDataSync` inside `src/components/layout/AppLayout.tsx`.
Currently, data fetching is deferred until you actually visit the page. We will change this to silently trigger `fetchInvoices`, `fetchProposals`, `fetchClients`, `fetchForms`, and `fetchSchedulers` in the background as soon as the app loads.
**What this does:** By the time the user's browser finishes downloading the Invoices page code, the data is already sitting in the Zustand store. The page will skip its internal loading state and instantly render the data.

## Verification Plan

### Manual Verification
1. I will apply these changes and start the development server.
2. We will load the dashboard and verify that the network tab silently fetches invoices, proposals, and clients in the background.
3. We will navigate to the Invoices tab and observe that the transition is instant—your custom skeleton will flash for a split second (if the JS is still downloading), and then the data will appear immediately.
