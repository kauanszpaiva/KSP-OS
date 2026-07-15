# Client Workflow Status

Target flow:

Internal user creates client organization -> invites Client Owner -> client accepts invitation -> internal user creates project -> grants client project access -> publishes project update -> client sees update -> client submits request with file -> internal queue receives it -> internal user triages it -> client sees published status.

Current status: schema, permission, and app-shell foundations are in place. Server actions, file upload sessions, notification dispatch, and full browser E2E automation remain in progress and are not release-ready.
