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

`actions.ts` — `updatePasswordAction` validates matching passwords with an
eight-character floor in Zod, checks the recovery window again on the
server, then calls Supabase `updateUser` with the cookie-bound server
client. A successful update deletes the cookie, so the same session cannot
change the password a second time. A Supabase error keeps the window open
for a retry. A closed window returns `expired`, and the form switches to the
expired card. Supabase owns the authoritative password policy. No
service-role client is used.

Every state renders in the shared `ElevatedCard`, and its labels use the same small uppercase style as the login page.

`page.tsx` sets the tab title "Set a new password", matching the form's heading.

Tests: `page.dom.test.tsx` (a plain session is refused, a recovery session
gets the form), `actions.test.ts` (window checks, validation, the cookie
cleared only after a successful update) and `reset-password-form.dom.test.tsx`
(form states and submit handling).
