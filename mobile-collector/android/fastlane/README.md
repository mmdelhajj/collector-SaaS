fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android alpha

```sh
[bundle exec] fastlane android alpha
```

Bump build number, build signed AAB, upload to Play Console Alpha

### android production

```sh
[bundle exec] fastlane android production
```

Bump build number, build signed AAB, upload to Play Console Production

### android bump

```sh
[bundle exec] fastlane android bump
```

Bump build number only (no build, no upload)

### android upload_alpha

```sh
[bundle exec] fastlane android upload_alpha
```

Upload an already-built AAB to Alpha (skip bump and build)

### android upload_production

```sh
[bundle exec] fastlane android upload_production
```

Upload an already-built AAB to Production (skip bump and build)

### android internal

```sh
[bundle exec] fastlane android internal
```

Build signed AAB and upload to Internal App Sharing (instant install link)

### android validate

```sh
[bundle exec] fastlane android validate
```

Verify service account credentials work (no upload)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
