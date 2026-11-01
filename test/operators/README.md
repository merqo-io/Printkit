# Operator regressions

Node-based tests verify the kit-key CLI reads callback credentials through standard input and the bridge installer uses explicit dependency-script approvals. Fixtures are synthetic; these tests do not contact a live database, install hardware drivers or verify a physical printer.

The kit-key tests also cover the reserved slug `printkit-test` (rejected with a "reserved" error) and its uppercase or padded variants (rejected by the slug format check).
