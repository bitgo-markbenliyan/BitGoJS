/**
 * @prettier
 */
import * as utxolib from '@bitgo/utxo-lib';
const { isWalletUnspent, signInputWithUnspent, toOutput } = utxolib.bitgo;
type Unspent<TNumber extends number | bigint = number> = utxolib.bitgo.Unspent<TNumber>;
type RootWalletKeys = utxolib.bitgo.RootWalletKeys;

import * as debugLib from 'debug';

import { isReplayProtectionUnspent } from './replayProtection';

const debug = debugLib('bitgo:v2:utxo');

export class InputSigningError<TNumber extends number | bigint = number> extends Error {
  static expectedWalletUnspent<TNumber extends number | bigint>(
    inputIndex: number,
    unspent: Unspent<TNumber>
  ): InputSigningError<TNumber> {
    return new InputSigningError(inputIndex, unspent, `not a wallet unspent, not a replay protection unspent`);
  }

  constructor(public inputIndex: number, public unspent: Unspent<TNumber>, public reason: Error | string) {
    super(`signing error at input ${inputIndex}: unspentId=${unspent.id}: ${reason}`);
  }
}

export class TransactionSigningError<TNumber extends number | bigint = number> extends Error {
  constructor(signErrors: InputSigningError<TNumber>[], verifyError: InputSigningError<TNumber>[]) {
    super(
      `sign errors at inputs: [${signErrors.join(',')}], ` +
        `verify errors at inputs: [${verifyError.join(',')}], see log for details`
    );
  }
}

/**
 * Sign all inputs of a wallet transaction and verify signatures after signing.
 * Collects and logs signing errors and verification errors, throws error in the end if any of them
 * failed.
 *
 * @param transaction - wallet transaction (builder) to be signed
 * @param unspents - transaction unspents
 * @param walletSigner - signing parameters
 * @param isLastSignature - Returns full-signed transaction when true. Builds half-signed when false.
 */
export function signAndVerifyWalletTransaction<TNumber extends number | bigint>(
  transaction: utxolib.bitgo.UtxoTransaction<TNumber> | utxolib.bitgo.UtxoTransactionBuilder<TNumber>,
  unspents: Unspent<TNumber>[],
  walletSigner: utxolib.bitgo.WalletUnspentSigner<RootWalletKeys>,
  { isLastSignature }: { isLastSignature: boolean }
): utxolib.bitgo.UtxoTransaction<TNumber> {
  const network = transaction.network as utxolib.Network;
  const prevOutputs = unspents.map((u) => toOutput(u, network));

  let txBuilder: utxolib.bitgo.UtxoTransactionBuilder<TNumber>;
  if (transaction instanceof utxolib.bitgo.UtxoTransaction) {
    txBuilder = utxolib.bitgo.createTransactionBuilderFromTransaction<TNumber>(transaction, prevOutputs);
    if (transaction.ins.length !== unspents.length) {
      throw new Error(`transaction inputs must match unspents`);
    }
  } else if (transaction instanceof utxolib.bitgo.UtxoTransactionBuilder) {
    txBuilder = transaction;
  } else {
    throw new Error(`must pass UtxoTransaction or UtxoTransactionBuilder`);
  }

  const signErrors: InputSigningError<TNumber>[] = unspents
    .map((unspent: Unspent<TNumber>, inputIndex: number) => {
      if (isReplayProtectionUnspent<TNumber>(unspent, network)) {
        debug('Skipping signature for input %d of %d (RP input?)', inputIndex + 1, unspents.length);
        return;
      }
      if (!isWalletUnspent<TNumber>(unspent)) {
        return InputSigningError.expectedWalletUnspent<TNumber>(inputIndex, unspent);
      }
      try {
        signInputWithUnspent<TNumber>(txBuilder, inputIndex, unspent, walletSigner);
        debug('Successfully signed input %d of %d', inputIndex + 1, unspents.length);
      } catch (e) {
        return new InputSigningError<TNumber>(inputIndex, unspent, e);
      }
    })
    .filter((e): e is InputSigningError<TNumber> => e !== undefined);

  const signedTransaction = isLastSignature ? txBuilder.build() : txBuilder.buildIncomplete();

  const verifyErrors: InputSigningError<TNumber>[] = signedTransaction.ins
    .map((input, inputIndex) => {
      const unspent = unspents[inputIndex] as Unspent<TNumber>;
      if (isReplayProtectionUnspent<TNumber>(unspent, network)) {
        debug(
          'Skipping input signature %d of %d (unspent from replay protection address which is platform signed only)',
          inputIndex + 1,
          unspents.length
        );
        return;
      }
      if (!isWalletUnspent<TNumber>(unspent)) {
        return InputSigningError.expectedWalletUnspent<TNumber>(inputIndex, unspent);
      }
      try {
        const publicKey = walletSigner.deriveForChainAndIndex(unspent.chain, unspent.index).signer.publicKey;
        if (
          !utxolib.bitgo.verifySignatureWithPublicKey<TNumber>(signedTransaction, inputIndex, prevOutputs, publicKey)
        ) {
          return new InputSigningError(inputIndex, unspent, new Error(`invalid signature`));
        }
      } catch (e) {
        debug('Invalid signature');
        return new InputSigningError<TNumber>(inputIndex, unspent, e);
      }
    })
    .filter((e): e is InputSigningError<TNumber> => e !== undefined);

  if (signErrors.length || verifyErrors.length) {
    throw new TransactionSigningError(signErrors, verifyErrors);
  }

  return signedTransaction;
}
