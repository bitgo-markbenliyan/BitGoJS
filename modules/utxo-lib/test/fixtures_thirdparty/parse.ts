/**
 * @prettier
 */
import * as assert from 'assert';
import { getNetworkList, getNetworkName, isBitcoinGold, isMainnet, isZcash } from '../../src/coins';
import { sigHashTestFile, SigHashTestVector, testFixtureArray, txValidTestFile, TxValidVector } from './fixtures';

const Transaction = require('../../src/transaction');

describe('Third-Party Fixtures', function () {
  getNetworkList()
    .filter(isMainnet)
    .forEach((network) => {
      describe(`parse ${getNetworkName(network)}`, function () {
        function roundTripTest(buf: Buffer) {
          const tx = Transaction.fromBuffer(buf, network);
          assert.strictEqual(tx.toBuffer().toString('hex'), buf.toString('hex'));
          assert.strictEqual(tx.clone().toBuffer().toString('hex'), buf.toString('hex'));
          return tx;
        }

        function runCheckHashForSignature([
          rawTransaction,
          script,
          inputIndex,
          hashType,
          signatureHash,
        ]: SigHashTestVector) {
          const usesForkId = (hashType & Transaction.SIGHASH_FORKID) > 0;
          if (isBitcoinGold(network) && usesForkId) {
            // Bitcoin Gold does not test transactions where FORKID is set 🤷
            // https://github.com/BTCGPU/BTCGPU/blob/163928af05/src/test/sighash_tests.cpp#L194-L195
            return;
          }
          const buffer = Buffer.from(rawTransaction, 'hex');
          const transaction = roundTripTest(buffer);
          const hash = transaction.hashForSignatureByNetwork(
            inputIndex,
            Buffer.from(script, 'hex'),
            0,
            hashType,
            transaction.ins[inputIndex].witness?.length > 0
          );
          const refSignatureHash = Buffer.from(signatureHash, 'hex').reverse();
          assert.strict(refSignatureHash.equals(hash));
        }

        testFixtureArray(network, sigHashTestFile, function (vectors: SigHashTestVector[]) {
          if (isZcash(network)) {
            return this.skip();
          }
          vectors.forEach((v) => {
            runCheckHashForSignature(v);
          });
        });

        testFixtureArray(network, txValidTestFile, function (vectors: TxValidVector[]) {
          vectors.forEach((v: TxValidVector, i) => {
            const [inputs, txHex, verifyFlags] = v;
            roundTripTest(Buffer.from(txHex, 'hex'));
          });
        });
      });
    });
});
