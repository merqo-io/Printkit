# ui

Local shadcn primitives used by Printkit: `alert`, `badge`, `button`, `input`,
`label`, `select`, `switch` and `tooltip`. `alert` carries the Bridge page's
unsupported-device message.

Feature components import these directly by name. `select` supports history
location assignment; `switch` controls bridge mode; printer setup explanations use shared InfoTooltip. Account menus and help drawers use the shared Merqo UI
package rather than unused local copies.

These primitives remain generator-managed. Put product behavior in feature
components instead of changing generated structure.

[Parent components](../README.md)

On touch screens (`pointer-coarse`) `button`, `input` and `select` grow taller (default 44px, `sm` 40px, `lg` 48px) so vendors on an iPad get a full-size tap target; mouse and trackpad keep the compact sizes.
