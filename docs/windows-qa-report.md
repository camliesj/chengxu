# Windows 0.1.2 Release QA Report

## Release candidate

- Test dates: 2026-07-14 to 2026-07-15 (Asia/Shanghai)
- Version: `0.1.2`
- Platform: Windows x64, Tauri NSIS current-user installer
- Installer: `汽修接待与车辆保险管理_0.1.2_x64-setup.exe`
- Size: `4,406,294` bytes (`4.20 MB`)
- SHA-256: `888CBF62CE0302D244FFE5CFA30CEF73B33B405CFC658607116923AB61B0E48B`
- Download: `https://chengxu.pages.dev/api/client-downloads/windows/0.1.2/%E6%B1%BD%E4%BF%AE%E6%8E%A5%E5%BE%85%E4%B8%8E%E8%BD%A6%E8%BE%86%E4%BF%9D%E9%99%A9%E7%AE%A1%E7%90%86_0.1.2_x64-setup.exe`

The updater private key and password remain in ignored local files. Only the public updater signature is stored in Cloudflare release metadata.

## Test machine

- Operating system: Windows 10 Home China, 21H2, build `19044.1865`
- WebView2 runtime: `150.0.4078.65`
- Installed application: `0.1.2`, per-user NSIS installation
- Display scaling affects physical window dimensions; the configured minimum remains `1280x720` logical pixels.

## Automated verification

| Check | Result | Evidence |
| --- | --- | --- |
| Node test suite | Pass | 60 tests passed |
| Receipt API authorization | Pass | Staff upload/delete requests return `403 ADMIN_REQUIRED` |
| Repair export authorization | Pass | Batch export is permission-gated and opens the export page for administrators |
| Vite production build | Pass | 59 modules transformed |
| Rust desktop check | Pass | `chengxu-desktop v0.1.2` compiled |
| Signed NSIS build | Pass | Installer and `.sig` generated |
| Version consistency | Pass | npm, lockfile, Tauri config, Cargo manifest and Cargo lock are `0.1.2` |
| Updater signature verification | Pass | Final installer signature is valid |
| Corrupted package rejection | Pass | Flipping one installer byte causes signature verification to fail |

## Cloud release verification

| Check | Result |
| --- | --- |
| Release catalog reports Windows `0.1.2` available | Pass |
| Android remains unavailable/coming soon | Pass |
| Updater request from `0.1.1` returns signed `0.1.2` metadata | Pass |
| Updater request from `0.1.2` returns HTTP `204` | Pass |
| Private COS download proxy returns `4,406,294` bytes | Pass |
| Downloaded installer SHA-256 equals the local release candidate | Pass |
| COS object uses an ASCII, version-scoped key | Pass |

## Windows end-to-end verification

| Flow | Result | Notes |
| --- | --- | --- |
| Real uninstall/reinstall baseline | Pass | Executed against the previous `0.1.1` package |
| Silent install of final `0.1.2` | Pass | Installer returned exit code `0`; installed file version is `0.1.2` |
| Desktop launch | Pass | Native Tauri window opened and connected to production APIs |
| Desktop and Start menu shortcuts | Pass | Verified during the previous Windows acceptance run |
| Native window behavior and minimum size | Pass | Verified during the previous Windows acceptance run |
| Single-instance activation | Pass | Verified during the previous Windows acceptance run |
| Offline cached read and network recovery | Pass | Verified during the previous Windows acceptance run |
| Reception/history separation | Pass | Reception shows unsettled work; history shows settled work |
| One-page work-order print | Pass | Exactly one print sheet/PDF page; browser URL is absent |
| COS receipt upload/read/delete | Pass | Real image upload returned `200`, content read matched PNG bytes, deletion returned `200`, later read returned `404` |
| Staff navigation permissions | Pass | Export and system settings are absent |
| Staff order permissions | Pass | No settlement/reversal controls; settled-record mutation is rejected by the API |
| Staff receipt permissions | Pass | Receipt can be viewed; upload and delete controls are absent; direct mutations return `403` |
| Administrator permissions | Pass | Export, settings, settlement and receipt deletion controls are present |
| Repair batch export | Pass | Hidden from staff; administrator action opens the working data-export page |

## Deferred or external checks

- Native Excel save is intentionally deferred at the user's request for this test cycle.
- Windows 11 testing is skipped at the user's request; the native acceptance run used Windows 10 21H2.
- Windows SmartScreen reputation was not evaluated on a clean external machine.
- The installer and installed executable are not Authenticode code-signed with a public CA certificate, so SmartScreen reputation is not expected to be established yet.
- A clean-machine install without existing WebView2/runtime state remains a field acceptance check.
- The final `0.1.1` to `0.1.2` update was verified through metadata, signed package download, signature validation and silent installation, but the in-app restart flow was not repeated after the last UI-only patch.

## Cleanup

- Temporary QA accounts, sessions and targeted operation logs were removed from D1; all cleanup counts returned zero.
- The temporary COS receipt object was deleted and a subsequent read returned `404`.
- Temporary signature-verifier source and executable files were deleted.
- No private signing material or COS credential was added to Git.
