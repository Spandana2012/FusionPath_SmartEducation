# LocalStorage demo-data migration

Existing browser-only state is preserved on a learner's first visit after Phase 1.
The client posts its validated `fusionpath.learnerState` value once to
`POST /api/adaptive/learners/bootstrap`, saves the returned learner ID, and then
uses the database state as authoritative. The local value remains a short offline
cache only.

There is no server-side bulk migration because localStorage is browser-scoped and
never reaches the server unless the learner opens the product. To retire the cache
after adoption, remove `fusionpath.learnerState` only after a successful state sync.

The bootstrap request is deliberately the only migration input: it imports the
cached profile and current snapshot once, creates the learner profile, seeds the
historical mistake counts as `imported_demo` events, and returns the authoritative
roadmap version. Subsequent writes are serialized by the client and persisted as
new roadmap versions; newly observed mistake-count deltas become `state_sync`
events rather than replacing the journal.
