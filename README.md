# WHC Testnet Faucet
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

This repository is forked from the
[testnet-faucet](https://github.com/christroutner/testnet-faucet)
repo. That one distributes testnet BCH. This one distributed testnet WHC.

Wormhole Coins (WHC) are used to create Wormhole tokens. Here is more information
about getting started with Wormhole tokens:
- [Wormhole tokens overview](https://developer.bitcoin.com/wormhole.html)
- [Wormhole API documentation](https://developer.bitcoin.com/wormhole/docs/getting-started)
- [Wormholecash SDK GitHub Repo](https://github.com/Bitcoin-com/wormholecash)
- [Wormholecash SDK code examples](https://github.com/Bitcoin-com/wormholecash/tree/master/examples)

This application expects a `wallet.json` file in the root directory. This contains
the mnemonic seed required to access the funds the faucet will distribute. You can
generate a wallet using
[this Wormhole example](https://github.com/Bitcoin-com/wormhole-sdk/blob/master/examples/create-wallet/create-wallet.js)

## Requirements
* node __^8.9.4__
* npm __^5.7.1__

## License
MIT

## Docker
This server requires a Mongo database, so it uses Docker Compose to run in production.
[This tutorial](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-16-04)
shows how to setup Docker.
[This tutorial](https://www.digitalocean.com/community/tutorials/how-to-install-docker-compose-on-ubuntu-16-04)
shows how to setup Docker Compose. Here are some commands to build and run this
application with Docker Compose:

- `docker-compose build --no-cache` will build the Docker container from scratch.
  If previously used, this will fail without first deleting the `database` folder,
  which is created with root privileges by Docker, so it must be deleted with the
  `sudo rm -rf database` command.

- `docker-compose up -d` will run the server in the background (daemon mode).
  The server attaches to port 3000 on the host by default.
