# Contributing

Thanks for taking the time.

## Setup

```sh
yarn install
```

The repository is a Yarn workspace: the library at the root, a demo app in `example/`.

## Working on the library

```sh
yarn typecheck        # tsc --noEmit
yarn lint             # eslint
yarn format           # prettier --write
yarn test             # jest (watch mode outside CI)
yarn build            # tsc to build/
```

## Running the example app

The example consumes the library from source through the Metro resolver, so JS changes hot reload. Native changes need a rebuild.

```sh
yarn build                 # tsc in watch mode: the example imports build/, not src/
yarn example expo prebuild --platform ios --clean
cd example/ios && pod install && cd -
yarn example ios
```

Run `pod install` from `example/ios`, not with `--project-directory` from the root:
expo-modules-autolinking resolves the dependency graph from the CocoaPods process'
working directory, so running it from the repo root links zero local modules —
silently, with a green `pod install`.

Only iOS is implemented natively — on any other platform the example renders posters and reports the surface as unavailable, which is the intended behaviour.

## Native code

The Swift lives in `ios/`. Anything touching it must keep the two invariants the module exists for:

1. **No `AVPlayerViewController`.** The moment one is created the whole point is gone.
2. **`AVAudioSession` is never touched.** No `setCategory`, no `setActive`. The player is muted for its entire life so the system never activates the shared session on its behalf, and the module never fights another player stack over it.

CI compiles the example app on macOS (`.github/workflows/build-ios.yml`) — that is the only job that type-checks the Swift, so watch it on your PR.

## Commits

Conventional Commits, enforced in CI. `feat:` cuts a minor, `fix:` a patch, `BREAKING CHANGE:` a major — releases are cut by semantic-release from the history, so the message is the changelog.

## Releasing

Maintainers only: run the **Release** workflow from the Actions tab. It builds, versions, tags, publishes to npm and writes the changelog.
