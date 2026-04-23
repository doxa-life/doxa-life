# template/src/components/archive/

> **Deprecated components retained for diff history.** Do not import from this folder. New code must not depend on anything here.

| File | Why archived |
|---|---|
| `MapPanel.vue` | Superseded by `LegendDesktop`/`LegendMobile`/`LegendRows` + `SideMenuDrawer`. |
| `TabLayout.vue` | Tab logic moved into `profile-config.tabs` + `useUiStore` (LL-002, LL-029). |

## Disposition

Slated for deletion in a future cleanup pass. See [`/intel/DEPRECATIONS.md`](../../../../intel/DEPRECATIONS.md).

## Next

If you need legend or tab functionality, use the live components in the parent folder.
