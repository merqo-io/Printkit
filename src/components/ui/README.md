# ui

Local shadcn primitive used by Printkit: `alert`, which carries the Bridge
page's unsupported-device message.

`badge`, `button`, `input`, `label`, `select`, `switch`, `tooltip` and `cn`
come from `@merqo/ui/primitives`, so the kit does not drift from the shared
source. On touch screens (`pointer-coarse`) every shared `Button` size is at
least 44px (`lg` is 48px) and `Select` triggers are 44px, so vendors on an
iPad get a full-size tap target; `src/components/button-touch.dom.test.tsx`
guards the button sizes.

[Parent components](../README.md)
