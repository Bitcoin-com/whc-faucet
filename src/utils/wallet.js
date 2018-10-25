/*
  This library handles all the wallet functionality.
*/

"use strict"

module.exports = {
  consolidateUTXOs, // Consolidate up to 20 spendable UTXOs
  sendWHC // Send WHC tokens to an address.
}

// Inspect utility used for debugging.
const util = require("util")
util.inspect.defaultOptions = {
  showHidden: true,
  colors: true,
  depth: 1
}

const WH = require("wormhole-sdk/lib/Wormhole").default
const Wormhole = new WH({ restURL: `https://trest.bitcoin.com/v1/` })
// const Wormhole = new BB({ restURL: `http://localhost:3000/v1/` })
// const Wormhole = new BB({ restURL: `http://decatur.hopto.org:3003/v1/` })
//const Wormhole = new BB({ restURL: `http://192.168.0.13:3003/v1/` })

const walletInfo = require(`../../wallet.json`)

async function consolidateUTXOs() {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = Wormhole.Mnemonic.toSeed(mnemonic)

    // master HDNode
    const masterHDNode = Wormhole.HDNode.fromSeed(rootSeed, "testnet") // Testnet

    // HDNode of BIP44 account
    const account = Wormhole.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

    const change = Wormhole.HDNode.derivePath(account, "0/0")

    // get the cash address
    const cashAddress = Wormhole.HDNode.toCashAddress(change)
    // const cashAddress = walletInfo.cashAddress

    // instance of transaction builder
    const transactionBuilder = new Wormhole.TransactionBuilder("testnet")

    // Combine all the utxos into the inputs of the TX.
    const u = await Wormhole.Address.utxo([cashAddress])
    const inputs = []
    let originalAmount = 0

    console.log(`Number of UTXOs: ${u[0].length}`)

    for (let i = 0; i < u[0].length; i++) {
      const thisUtxo = u[0][i]

      originalAmount = originalAmount + thisUtxo.satoshis
      inputs.push(thisUtxo)
      transactionBuilder.addInput(thisUtxo.txid, thisUtxo.vout)

      // Can only do 20 UTXOs at a time.
      if (inputs.length > 19) break
    }

    // If there aren't very many UTXOs, just exit.
    if (inputs.length < 5) {
      console.log(`Not enough UTXOs to bother consolidating. Exiting.`)
      return
    }

    // original amount of satoshis in vin
    // console.log(`originalAmount: ${originalAmount}`)

    // get byte count to calculate fee. paying 1 sat/byte
    const byteCount = Wormhole.BitcoinCash.getByteCount(
      { P2PKH: inputs.length },
      { P2PKH: 1 }
    )
    // console.log(`fee: ${byteCount}`)

    // amount to send to receiver. It's the original amount - 1 sat/byte for tx size
    const sendAmount = originalAmount - byteCount
    console.log(`sendAmount: ${sendAmount}`)

    // Catch a bug here
    if (sendAmount < 0) {
      console.log(`sendAmount is negative, aborting UTXO consolidation.`)
      return
    }

    // add output w/ address and amount to send
    transactionBuilder.addOutput(cashAddress, sendAmount)

    // keypair
    const keyPair = Wormhole.HDNode.toKeyPair(change)

    // sign w/ HDNode
    let redeemScript
    inputs.forEach((input, index) => {
      // console.log(`inputs[${index}]: ${util.inspect(inputs[index])}`)
      transactionBuilder.sign(
        index,
        keyPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        inputs[index].satoshis
      )
    })

    // build tx
    const tx = transactionBuilder.build()

    // output rawhex
    const hex = tx.toHex()
    // console.log(`TX Hex: ${hex}`)

    // sendRawTransaction to running BCH node
    const broadcast = await Wormhole.RawTransactions.sendRawTransaction(hex)
    console.log(`\nConsolidating UTXOs. Transaction ID: ${broadcast}`)
  } catch (err) {
    console.log(`Error in consolidateUTXOs: `, err)
  }
}

async function sendWHC(bchAddr) {
  const propertyId = 1 // WH ID identifying the token. 1 === WHC.
  const TOKEN_QTY = 3 // Number of tokens to send.

  try {
    // Exit if not a valid cash address.
    const isValid = validateAddress(bchAddr)
    if (!isValid) return false

    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = Wormhole.Mnemonic.toSeed(mnemonic)

    // master HDNode
    const masterHDNode = Wormhole.HDNode.fromSeed(rootSeed, "testnet") // Testnet

    // HDNode of BIP44 account
    const account = Wormhole.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

    const change = Wormhole.HDNode.derivePath(account, "0/0")

    // get the cash address
    //const cashAddress = Wormhole.HDNode.toCashAddress(change)
    const cashAddress = walletInfo.cashAddress

    // Create simple send payload.
    const payload = await Wormhole.PayloadCreation.simpleSend(
      propertyId,
      TOKEN_QTY.toString()
    )

    // Get a utxo to use for this transaction.
    const u = await Wormhole.Address.utxo([cashAddress])
    const utxo = findBiggestUtxo(u[0])

    // Create a rawTx using the largest utxo in the wallet.
    utxo.value = utxo.amount
    const rawTx = await Wormhole.RawTransactions.create([utxo], {})

    // Add the token information as an op-return code to the tx.
    const opReturn = await Wormhole.RawTransactions.opReturn(rawTx, payload)

    // Set the destination/recieving address for the tokens, with the actual
    // amount of BCH set to a minimal amount.
    const ref = await Wormhole.RawTransactions.reference(opReturn, bchAddr)

    // Generate a change output.
    const changeHex = await Wormhole.RawTransactions.change(
      ref, // Raw transaction we're working with.
      [utxo], // Previous utxo
      cashAddress, // Destination address.
      0.000005 // Miner fee.
    )

    const tx = Wormhole.Transaction.fromHex(changeHex)
    const tb = Wormhole.Transaction.fromTransaction(tx)

    // Finalize and sign transaction.
    const keyPair = Wormhole.HDNode.toKeyPair(change)
    let redeemScript
    tb.sign(0, keyPair, redeemScript, 0x01, utxo.satoshis)
    const builtTx = tb.build()
    const txHex = builtTx.toHex()

    // sendRawTransaction to running BCH node
    const broadcast = await Wormhole.RawTransactions.sendRawTransaction(txHex)

    console.log(`Sending WHC. Transaction ID: ${broadcast}`)

    return broadcast
  } catch (err) {
    console.log(err)
  }
}

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo(utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.satoshis > largestAmount) {
      largestAmount = thisUtxo.satoshis
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}

// Returns true if BCH address is valid, false otherwise.
function validateAddress(bchAddr) {
  try {
    Wormhole.Address.isCashAddress(bchAddr)
    Wormhole.Address.isTestnetAddress(bchAddr)
    return true
  } catch (err) {
    return false
  }
}
