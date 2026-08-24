# KSP OS profile and avatar security

## User experience

- Every authenticated Command and Portal user can open **Profile** from the avatar menu.
- Editable fields are name, profile photo, phone number, language, time zone, and SMS preference.
- Email and access-control fields are visible but not self-editable.
- Page descriptions stay collapsed until the user opens **About this page**.

## Data boundaries

- Avatar bytes live in the private `profile-avatars` bucket.
- Paths use `<profile_id>/<generated_uuid>.<extension>` and cannot point at another profile.
- The application issues one-hour signed URLs only after Storage RLS authorizes the caller.
- Internal colleagues may read one another's avatars when they share an active KSP organization membership.
- Portal users may read avatars only inside the same active client workspace.
- Founder CEO and Executive Operations may read Portal-member avatars in their KSP organization.
- Anonymous users and unrelated clients cannot read avatar objects.

## Mutation controls

- Profile RLS allows a user to update only their own row.
- PostgreSQL column privileges limit self-service writes to `display_name`, `avatar_path`, `phone_e164`, `timezone`, `locale`, and `sms_opt_in`.
- Email, account status, MFA requirements, phone verification, and email-brand settings remain admin-controlled.
- Changing a phone number clears verification and disables SMS in a database trigger.
- SMS opt-in is valid only for a verified phone number.
- Avatar uploads are limited to JPG, PNG, or WebP and 5 MB.
- Authenticated users cannot overwrite or delete stored avatar originals; replacement creates a new path.

## Deferred work

Phone verification and outbound SMS delivery belong to the notification-channel slice. A saved number does not imply verification, consent, or successful delivery.
