# APF Task 1 Report: Buildable Android Project Skeleton

## Scope

Created the independent `android-client/` Kotlin and Jetpack Compose project, including the Gradle 8.13 wrapper, version catalog, launchable `MainActivity`, app identity, manifest, resources, and one unit sanity test. Android build caches and outputs are ignored.

## RED

Command run from `android-client/`:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.BuildSanityTest
```

Expected missing-symbol result before `AppIdentity.kt` existed:

```text
> Task :app:compileDebugKotlin FAILED
MainActivity.kt:11:27 Unresolved reference 'AppIdentity'.

BUILD FAILED
```

The missing `AppIdentity` symbol stopped main-source compilation before the test source could be compiled, which is the intended contract failure.

## GREEN

Focused test command run from `android-client/` after adding `AppIdentity`:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.BuildSanityTest
```

Output:

```text
> Task :app:testDebugUnitTest

BUILD SUCCESSFUL in 27s
26 actionable tasks: 8 executed, 18 up-to-date
```

Completed skeleton verification command run from `android-client/`:

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug
```

Output:

```text
> Task :app:testDebugUnitTest
> Task :app:packageDebug
> Task :app:assembleDebug

BUILD SUCCESSFUL in 1m 16s
45 actionable tasks: 20 executed, 25 up-to-date
```

Generated APK verified at `android-client/app/build/outputs/apk/debug/app-debug.apk`.

## Self-Review

- `git diff --check` reported no whitespace errors.
- The standard wrapper points to `gradle-8.13-bin.zip`.
- The project uses `compileSdk = 36`, `minSdk = 26`, `targetSdk = 35`, application ID `com.chengxu.autoservice`, and version `0.1.0`.
- Scope is limited to Task 1; no permissions beyond the manifest network-state declaration, navigation flows, networking, or workbench code were added.

## Compatibility Note

Kotlin 2.3.21 treats `kotlinOptions { jvmTarget = "17" }` as a build-script error. The equivalent `kotlin.compilerOptions.jvmTarget` setting uses `JvmTarget.JVM_17`, preserving the required Java/Kotlin 17 target while allowing the project to build.
