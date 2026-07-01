# E2E QA — Maestro flows

Reproducible UI automation for the iOS Simulator, replacing the flaky `cliclick` taps (which
proved unreliable at injecting clicks into the Simulator, especially on a secondary display).

## Why Maestro
- Works with **Expo Go** — no custom dev build required.
- Selects elements by **stable `testID`** (locale-independent), so flows survive en/zh switches.
- Captures screenshots as a **visual-regression baseline** for connected-state screens.

## Prerequisites
1. Metro bundler running for this project on port **8088**
   (`npx expo start --port 8088`, or the detached server already used for QA).
2. An iOS Simulator **booted** with **Expo Go** installed.
3. For the connected-state tour (`01-tab-tour`), the device must have a wallet + PIN.
   The flows enter the QA/testnet device PIN **111111** — edit `subflows/unlock.yaml` if yours differs.
   A fresh install with no wallet still passes `00-smoke` (the unlock subflow is skipped).

## Run
```sh
# from mobile/
npm run e2e            # runs every flow in .maestro/
npm run e2e:smoke      # just the boot smoke check
maestro test .maestro/01-tab-tour.yaml   # a single flow
```
Screenshots land in `.maestro/artifacts/` (git-ignored).

## Flows
| File | What it verifies |
|------|------------------|
| `00-smoke.yaml` | App boots in Expo Go, unlocks if locked, reaches the tab bar. |
| `01-tab-tour.yaml` | Walks all five tabs and screenshots each connected-state screen. |
| `subflows/unlock.yaml` | Enters the PIN only when the lock screen is showing. |

## Stable selectors used
- Tab bar buttons: `tab-Markets`, `tab-Trade`, `tab-Positions`, `tab-Agent`, `tab-Account`
  (via `tabBarButtonTestID` in `src/navigation/RootNavigator.tsx`).
- PIN keypad: `pin-key-0` … `pin-key-9` (from `src/components/PinPad.tsx`).
