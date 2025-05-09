# Demo ROFL App

This is a demo ROFL app that runs in TDX using Podman containers defined in a
`compose.yaml` file. It implements a simple price oracle in a shell script!

## Documentation

See [the ROFL documentation] for more details about ROFL-specific features
available to ROFL apps and on how to deploy the apps. See [the tutorial] on how
to create your own version of this app.

[the ROFL documentation]: https://docs.oasis.io/build/rofl
[the tutorial]: https://docs.oasis.io/build/rofl/app

## Existing Deployment

The `rofl.yaml` in this repository defines an existing deployment named `test`
that is used for testing of the demo ROFL app. If you want to modify any of the
application aspects, you need to create your own deployment.
