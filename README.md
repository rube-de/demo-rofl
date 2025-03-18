# Demo ROFL App

This is a demo ROFL app that runs in TDX using Podman containers defined in a
`compose.yaml` file. It implements a simple price oracle in a shell script!

## Build

To build the ROFL app and reproduce the measurements, simply run:

```sh
oasis rofl build
```

You can verify the measurements against the policy specified in `rofl.yaml` and
published on chain by running:

```sh
oasis rofl build --verify
```

## Documentation

See [the ROFL documentation] for more details about ROFL-specific features
available to ROFL apps and on how to deploy the apps.

[the ROFL documentation]: https://docs.oasis.io/build/rofl
