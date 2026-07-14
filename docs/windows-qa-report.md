# Windows 0.1.1 Release QA Report

## Release candidate

- Test date: 2026-07-14 (Asia/Shanghai)
- Version: `0.1.1`
- Platform: Windows x64, Tauri NSIS current-user installer
- Installer: `汽修接待与车辆保险管理_0.1.1_x64-setup.exe`
- Size: `4,405,881` bytes (`4.20 MB`)
- SHA-256: `9CEB6BDDAE837281E643D775DEEBB7FE669DA4B1891E617EEC8000F0208956C0`
- Download: `https://chengxu.pages.dev/api/client-downloads/windows/0.1.1/%E6%B1%BD%E4%BF%AE%E6%8E%A5%E5%BE%85%E4%B8%8E%E8%BD%A6%E8%BE%86%E4%BF%9D%E9%99%A9%E7%AE%A1%E7%90%86_0.1.1_x64-setup.exe`

The signing private key and password remain in ignored local files. Only the updater signature was supplied to Cloudflare release metadata.

## Automated verification

| Check | Result | Evidence |
| --- | --- | --- |
| Node test suite | Pass | 57 tests passed |
| Vite production build | Pass | 59 modules transformed |
| Rust desktop check | Pass | `chengxu-desktop v0.1.1` compiled |
| Signed NSIS build | Pass | Installer and `.sig` generated |
| Version consistency | Pass | npm, lockfile, Tauri config, Cargo manifest and Cargo lock are `0.1.1` |
| COS release upload authorization | Pass | Staff denied; administrator upload covered by tests |
| Private COS download proxy | Pass | Downloaded file hash equals the local candidate hash |

## Cloud release verification

| Check | Result |
| --- | --- |
| Release catalog reports Windows `0.1.1` available | Pass |
| Android remains unavailable/coming soon | Pass |
| Updater request from `0.1.0` returns signed `0.1.1` metadata | Pass |
| Updater request from `0.1.1` returns HTTP `204` | Pass |
| Download response preserves the Chinese installer name | Pass |
| COS object uses an ASCII, version-scoped key | Pass |

## Windows end-to-end verification

| Flow | Result | Notes |
| --- | --- | --- |
| Silent install of baseline `0.1.0` | Pass | Windows uninstall registry reported `0.1.0` |
| Desktop launch | Pass | Native window opened in Tauri runtime |
| Cloud account login | Pass | Temporary administrator QA account used and removed afterward |
| Online dashboard load | Pass | Cloud data connected and existing orders loaded |
| Automatic update discovery | Pass | `0.1.0` displayed `0.1.1` update prompt |
| Signed update download/install | Pass | Client installed update and restarted |
| Installed version after update | Pass | Windows uninstall registry reported `0.1.1` |
| Latest-version behavior | Pass | No repeat update prompt after restart |
| Offline state | Pass | `网络不可用` and retry action displayed |
| Offline cached reads | Pass | Existing order remained visible while requests were blocked |
| Network recovery | Pass | Offline banner cleared and cloud-connected state returned |
| Reception/history separation | Pass | Reception showed only unsettled work; history showed only settled work |

## Residual checks

The following checks were not marked as passed in this run:

- Corrupted-signature rejection was not tested against production because it would temporarily publish invalid update metadata to live clients.
- Windows SmartScreen reputation was not evaluated on a clean external machine. The installer is updater-signed, but it is not Authenticode code-signed with a public CA certificate.
- A clean-machine install without existing WebView2/runtime state should be included in the next field acceptance test.

## Cleanup

- The temporary QA account and its sessions were deleted from D1.
- The temporary release-publisher sessions were deleted after each COS upload attempt.
- No private signing material or COS credential was added to Git.
