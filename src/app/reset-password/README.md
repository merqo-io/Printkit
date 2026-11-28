# Password recovery

`page.tsx` is a server component. It calls `getRecoveryState`
(`@/lib/recovery-window`) and passes the result to the form. The form only
shows password inputs when the state is `ready`: the session holds a
`printkit_recovery` cookie that `/auth/callback` minted for that same
session within the last 15 minutes, after a reset link's code exchange
(`redirectType: "recovery"`).
A plain signed-in session, a signed-out visitor, and a used or expired link
all get the "This link has expired" card with a route back to sign in. If
the session cannot be checked, the card says so instead.

`actions.ts` — `updatePasswordAction` validates a non-empty, matching pair in
Zod (no length or character rule, so the client cannot drift from Supabase), checks the recovery window again on the
server, then calls Supabase `updateUser` with the cookie-bound server
client. A successful update deletes the cookie, so the same session cannot
change the password a second time. A Supabase error keeps the window open
for a retry; the error shown comes from (the shared `authErrorMessage(error, "update")` from `@merqo/ui`), never Supabase's raw text. A closed window returns `expired`, and the form switches to the
expired card. Supabase owns the authoritative password policy. No
service-role client is used.

Every state renders in the shared `ElevatedCard`, and its labels use the same sentence-case style as the login page.

`page.tsx` sets the tab title "Set a new password", matching the form's heading.

Tests: `page.dom.test.tsx` (a plain session is refused, a recovery session
gets the form), `actions.test.ts` (window checks, validation, the cookie
cleared only after a successful update) and `reset-password-form.dom.test.tsx`
(form states and submit handling).

The reset-password form takes `Button`, `Input`, `Label` and `cn` from `@merqo/ui/primitives`.

The form wraps the shared `ResetPasswordForm` from `@merqo/ui` in an `ElevatedCard`. The kit keeps the recovery `state` (the server action can flip it to `expired`) and passes `minLength={1}` so Supabase stays the only length rule. Server action errors come back as final copy and render inline under the confirm field through `mapError={(m) => m}`; a success toasts, routes to `/dashboard` and holds the button through the navigation. `PasswordRequirementsHint` (tap to show) sits beside the "New password" label. A weak-password rejection shows the specific rule from the shared `weakPasswordMessage`.

`loading.tsx` is the card-shaped placeholder (`role="status"`) shown while `page.tsx` creates the server client and checks the recovery session; `loading.dom.test.tsx` covers it.
