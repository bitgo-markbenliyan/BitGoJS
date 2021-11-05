import * as should from 'should';
const { Codes } = require('@bitgo/unspents');

import { TestBitGo } from '../../../lib/test_bitgo';
import { Wallet } from '../../../../src/v2/wallet';
import { Btc } from '../../../../src/v2/coins';
import * as bip32 from 'bip32';
import * as utxolib from '@bitgo/utxo-lib';

describe('BTC:', function () {
  let bitgo;

  before(function () {
    bitgo = new TestBitGo({ env: 'test' });
    bitgo.initializeTestVars();
  });

  describe('Address generation:', function () {
    let testCoin;
    before(function () {
      testCoin = bitgo.coin('tbtc');
    });


    it('should validate pub key', () => {
      const { pub } = testCoin.keychains().create();
      testCoin.isValidPub(pub).should.equal(true);
    });
  });

  describe('transaction signing:', function () {
    let basecoin: Btc;
    let wallet;

    const userKeychain = {
      prv: 'xprv9s21ZrQH143K3xQwj4yx3fHjDieEdqFDweBvFxn28qGvfQGvweUWuUuDRpepDu6opq3jiWHU9h3yYTKk5vvu4ykRuGA4i4Kz1vmFMPLTsoC',
      pub: 'xpub661MyMwAqRbcGSVQq6WxQoETmkUj3Hy5Js7X4MBdhAouYCc5VBnmTHDhH7p9RpeGWjkcwbTVuqib1EdusAntf4VEgQJcVMatBU5thweF2Jz',
      rawPub: '0275442d5a223845f38cbaa5525806571d1811511377ba8ead726426869b0d0400',
      rawPrv: 'a4f46eabfd13859079a98b57056f48b4a7d26166848a0f7126c5b43828427d0b',
    };
    const backupKeychain = {
      prv: 'xprv9s21ZrQH143K3ZijERhwuqfED1hLNWMN6A1ByMs6LtcFw6mexXLcPkRPXGPdMT658HJkaSCktjPNA6iujYdFgUwAVqwhtptvsQfHD2WEizC',
      pub: 'xpub661MyMwAqRbcG3oCLTExGybxm3Xpmy5DTNvnmkGhuE9Eou6oW4erwYjsNYmWrc5YBCZPgpR6hJGpgdFpNwta9zBnta8jL2vAjRF42KB1Xmv',
      rawPub: '0320e7370ace2e0dd974b8bdafa3a672e108ad12ab9c5ffd3786c303b2198e3f23',
      rawPrv: '6f84aa9081fef0b95955ed399fd17bb72c94cec87f3fed92d2e7e9e074f0f00e',
    };
    const bitgoKeychain = {
      prv: 'xprv9s21ZrQH143K2QjFdiB9a12bSjjDEGvVNDuQa7z3mukBFmRfJ2T7Pmvpkvh6VCW4TFNnhotBJ3mkKGFF2T8LTaPnbumk5Hb627NKGzTeXmt',
      pub: 'xpub661MyMwAqRbcEtoijji9w8yKzmZhdjeLjSq1NWPfLFHA8ZkoqZmMwaFJcDMNfRGj2sPgYp5EzguEGjogTtzhejNfKYJyhYuGHYz9kffftpc',
      rawPub: '03a48a6f40b7e6cd4d298072f5bef081054c3353f127f4c9169f02b00081c231c0',
      rawPrv: 'cdf02e682b05dd7bbae28a7606cdba0eccc205f03835fc9c3f93ce8c7bd97671',
    };
    // user pubkey at m/0/0/30/0 is 02e4a64fa7252714d282e150f4def1ebf8090d5ecdd28fb372105575289f5af56a
    // backup pubkey at m/0/0/30/0 is 02fae347fb2d2e058126cf78f39dd147e845052911ee55a65960ab41ebbae9d224
    // bitgo pubkey at m/0/0/30/0 is 0275442d5a223845f38cbaa5525806571d1811511377ba8ead726426869b0d0400

    before(function () {
      basecoin = bitgo.coin('tbtc');
      wallet = new Wallet(bitgo, basecoin, {});
    });

    it('should half-sign and fully sign p2wsh transaction prebuild', async function () {
      const prebuild = {
        txHex: '0100000001d58f82d996dd872012675adadf4606734906b25a413f6e2ee535c0c10aef96020000000000ffffffff028de888000000000017a914c91aa24f65827eecec775037d886f2952b73cbe48740420f000000000017a9149304d18497b9bfe9532778a0f06d9fff3b3befaf87c8b11400',
        txInfo: {
          unspents: [
            {
              chain: 20,
              index: 2,
              witnessScript: '522103d4788cda52f91c1f6c82eb91491ca76108c9c5f0839bc4f02eccc55fedb3311c210391bcef9dcc89570a79ba3c7514e65cd48e766a8868eca2769fa9242fdcc796662102ef3c5ebac4b54df70dea1bb2655126368be10ca0462382fcb730e55cddd2dd6a53ae',
              id: '0296ef0ac1c035e52e6e3f415ab20649730646dfda5a67122087dd96d9828fd5:0',
              address: 'tb1qtxxqmkkdx4n4lcp0nt2cct89uh3h3dlcu940kw9fcqyyq36peh0st94hfp',
              addressType: Codes.UnspentTypeTcomb('p2wsh'),
              value: 10000000,
            },
          ],
        },
      };

      // half-sign with the user key
      const halfSignedTransaction = await wallet.signTransaction({
        txPrebuild: prebuild,
        prv: userKeychain.prv,
      });

      // fully sign transaction
      prebuild.txHex = halfSignedTransaction.txHex;
      const signedTransaction = await wallet.signTransaction({
        txPrebuild: prebuild,
        prv: backupKeychain.prv,
        isLastSignature: true,
      });

      const signedTxHex = '01000000000101d58f82d996dd872012675adadf4606734906b25a413f6e2ee535c0c10aef96020000000000ffffffff028de888000000000017a914c91aa24f65827eecec775037d886f2952b73cbe48740420f000000000017a9149304d18497b9bfe9532778a0f06d9fff3b3befaf870400473044022023d7210ba6d8bbd7a28b8af226f40f7235caab79156f93f9c9969fc459ea7f73022050fbdca788fba3de686b66b3501853695ff9d6f375867470207d233b099576e001483045022100a4d9f100e4054e56a93b8abb99bb67f399090f1918a30722bd01bfc9e38437eb022035e3bf7446380000a514fe0791fc579b553542dc6204c40418ae24f05f3f03b80169522103d4788cda52f91c1f6c82eb91491ca76108c9c5f0839bc4f02eccc55fedb3311c210391bcef9dcc89570a79ba3c7514e65cd48e766a8868eca2769fa9242fdcc796662102ef3c5ebac4b54df70dea1bb2655126368be10ca0462382fcb730e55cddd2dd6a53aec8b11400';

      // broadcast here: https://testnet.smartbit.com.au/tx/5fb17d5ac94f180ba58be7f5a814a6e92a3c31bc00e39604c59c936dcef958bc
      signedTransaction.txHex.should.equal(signedTxHex);

    });

    it('should half-sign and fully sign p2tr transaction prebuild', async function () {
      const prebuild = {
        txHex: '0200000001619d71d14c29d97eb984048ce9277322fb8548303d44b3eb65438a00ada33f4b0000000000ffffffff01282300000000000017a914550623cdd8a5173be2c89c3c41b03b86dde0134a8700000000',
        txInfo: {
          unspents: [
            {
              chain: 30,
              index: 0,
              id: '4b3fa3ad008a4365ebb3443d304885fb227327e98c0484b97ed9294cd1719d61:0',
              address: 'tb1p022ks3y8qlnzgayslcqwfk5u0gsax538rg92nqyhzc4hcft3us8qce0l6w',
              addressType: Codes.UnspentTypeTcomb('p2tr'),
              value: 10000,
            },
          ],
        },
        feeInfo: {
          fee: 1000,
        },
      };

      // half-sign with the user key
      const halfSignedTransaction = await wallet.signTransaction({
        txPrebuild: prebuild,
        prv: userKeychain.prv,
        userKeychain,
        backupKeychain,
        bitgoKeychain,
        taprootRedeemIndex: 1,
      });

      // fully sign transaction
      prebuild.txHex = halfSignedTransaction.txHex;
      const signedTransaction = await wallet.signTransaction({
        txPrebuild: prebuild,
        prv: backupKeychain.prv,
        isLastSignature: true,
        userKeychain,
        backupKeychain,
        bitgoKeychain,
        taprootRedeemIndex: 1,
      });

      const signedTxHex = '02000000000101619d71d14c29d97eb984048ce9277322fb8548303d44b3eb65438a00ada33f4b0000000000ffffffff01282300000000000017a914550623cdd8a5173be2c89c3c41b03b86dde0134a870441f7ced2e03ec21775d5a9ed7e6e30fbeb371da9cf4f7fce1426e28383da38cea2cdab9975a9a3530b0598def493b5b9bc1dc6dd3b56bd1648a3e6c207ac6e86bf0141b672a6b37278d63aa79aae58ee0128d23d6f6ed1badbf27103b1f1b5030038c8bc251eba96a37a89a409cc1f0ef540a935612aa72b0fea7ca77fbb2e657ff54e014420e4a64fa7252714d282e150f4def1ebf8090d5ecdd28fb372105575289f5af56aad20fae347fb2d2e058126cf78f39dd147e845052911ee55a65960ab41ebbae9d224ac61c0d269bcf3972e6646ceaf151bc9f61dfcbbd1f3ead74cea98044f8d5e590cec1bc0001c15a537261350c6a6be87b196e23250750be161681129dbd18554003fda19c8fdbaa5f0504dd258991a24b740bf3f47117576e84010e93fa092b23125ca00000000';

      // broadcast here: https://blockstream.info/testnet/tx/62cd8a14a20a18f8e7fff9dcaaa37f73e9feba3c4b16c20e90c8828ccbcb2fff?expand
      signedTransaction.txHex.should.equal(signedTxHex);
    });

    it('should construct two p2tr addresses, build an unsigned tx spending from both, then half-sign and fully sign transaction', async function () {
      const derivationPathIndexes = [1, 2];
      const keyTriplets = derivationPathIndexes.map(i => [userKeychain, backupKeychain, bitgoKeychain].map(keychain =>
        bip32
            .fromBase58(keychain.pub)
            .derivePath(`m/0/0/30/${i}`).publicKey
      ));
      
      const addrs = keyTriplets.map(keyTriplet => basecoin.createMultiSigAddress('p2tr', 2, keyTriplet));
      addrs[0].address.should.equal('tb1pyfve36k29zuw6gm3fnnqvle8fqr5v5vx90cg6ejq7k9x0kp6h8jqy2fz83');
      addrs[1].address.should.equal('tb1pwxxqpg6q4pm2l830ertvrxfyvps5qe65vdec3ggymumps6nay7vse25fae');

      const txb = utxolib.bitgo.createTransactionBuilderForNetwork(utxolib.networks.testnet);
      const fundingTxs = [
        '729c50091570889b535f3fb79e783f422b9ee9cd05b087a4948aaebf2a20f252',
        'ca0046a165b30a317173bc6831bf255af9d0a55ae985df2104785b0f02aff897',
      ];
      fundingTxs.forEach((fundingTx, i) => {
        txb.addInput(fundingTx, 0, 0xffffffff, addrs[i].outputScript);
      });
      txb.addOutput(Buffer.from('a914550623cdd8a5173be2c89c3c41b03b86dde0134a87', 'hex'), 19000);
      
      const txHex = txb.buildIncomplete().toHex();

      const unspents = fundingTxs.map((fundingTx, i) => ({
        chain: 30,
        index: derivationPathIndexes[i],
        id: `${fundingTx}:${i}`,
        address: addrs[i].address,
        addressType: Codes.UnspentTypeTcomb('p2tr'),
        value: 10000,
      }));
      const prebuild = {
        txHex,
        txInfo: {
          unspents,
        },
      };

      // half-sign with the user key
      const halfSignedTransaction = await wallet.signTransaction({
        txPrebuild: prebuild,
        prv: userKeychain.prv,
        userKeychain,
        backupKeychain,
        bitgoKeychain,
        taprootRedeemIndex: 1,
      });

      // fully sign transaction
      prebuild.txHex = halfSignedTransaction.txHex;
      const signedTransaction = await wallet.signTransaction({
        txPrebuild: prebuild,
        prv: backupKeychain.prv,
        isLastSignature: true,
        userKeychain,
        backupKeychain,
        bitgoKeychain,
        taprootRedeemIndex: 1,
      });

      const signedTxHex = '0100000000010252f2202abfae8a94a487b005cde99e2b423f789eb73f5f539b88701509509c720000000000ffffffff97f8af020f5b780421df85e95aa5d0f95a25bf3168bc7371310ab365a14600ca0000000000ffffffff01384a00000000000017a914550623cdd8a5173be2c89c3c41b03b86dde0134a87044158152bfb5c4205aa7257e4f511c75d6481de41c23e8ea7aab430613bab8478ca2c2c7f889cb89abf744fb5765c25fbb13f0c478eec713ce47e1439f7ad41e47b0141adccd1a05c6a34300b87c3aa7dd2d8f71dcc47f487fe750974847c75a982d077442e158fb529e86439ba1b0e02524c7013a1e4c64230ad36c7602774bb928b70014420176cd31aa06144bf0a172c90aa4457e961663f47d1520d0f47974a439adcc5a7ad205e94c200df9f6d1d1688908279f539cf7bbbc5a5bec5a937cea39a8a56c97f3eac61c0dd86b05745c346bcd5eeb59dbb45b9d43fd94aa32727e43c22d6e5ec941f4a09b2794be8efb16e06d81e002bed65b00ce24613ed1e6d69560b894ef0d003c8f75b3f56e34b2811b73d1d3e08c98efe82da239684a5e6f18db5659737e9986c140441a6fa60ad1d8b541c3e2a9bacb9b217aae6bb98c5c8e6bab7504d5f2590f67def212ef36f0e10d9fa9a8f6a35657322e062f3d352265aa74142899d8c3369f7a501416b53fd2c349201f8134d647d081aac7189364c7b5daa9a72d96a1084ec04bff772cb6857543c3112f83694e391e6818eb26a23ffb9dcc53114ea6d185bfea97c01442056f286eb2195533724d7522125fa21149c67d70e6c12ea994e8e41f6e6cc9614ad20b3ef33138414c0ef29545af49d1d63e27bb93967dc843e41e76bd1f6891c1c79ac61c17150fc8c2c847863cde9e175307e2b1f1e6092a15db77cbdb73eee11285ee26c87ab830cfde3d06638d6ab860d330e65978d16708cd4e5253316706f48da8ff6231c85d1f929271fa58417c31e1924fbefbdb2a1f3c198390ac64405e5fcf17e00000000';

      // broadcast here: https://blockstream.info/testnet/tx/a9736d27287220b83d7e43f93477d4c2902ad7187eeeac0af665020b866c13ec
      signedTransaction.txHex.should.equal(signedTxHex);
    });
  });

  describe('Explain transaction:', () => {

    describe('Signature count:', () => {
      // p2sh, p2wsh, p2shP2wsh does not matter for unsigned inputs, so we will only test one
      const unsignedTx = '0100000002ece0eb669e085aeb13527e3f20873caa2845a9196c5dc23bd3d366da46996c9e0100000000ffffffff471f27cdf9f75a0e610281cb8d7b5caa44cd3a5d7048fabf9acbededdb709a590100000000ffffffff0240420f000000000017a914a364c319fddbc93dafdaa9d006d728961958a03f87eee80a000000000017a914e006ca6b2a68ce7ee9d9e3cbf62af153b8ae3420876e011600';

      const p2shP2wshUnspents = [
        {
          id: 'c1675aebce249a45631e9c9c5093aedfe803099fddde81dec08d7b9ef93cc983:1',
          value: 998214,
        },
        {
          id: '1cd6b605b1ac6e39eb26cdd7ef85699ea1669970a8f3c7be023ab7986a8a22d7:0',
          value: 1000000,
        },
      ];

      const p2wshUnspents = [
        {
          id: '52fcd5cceef2350b7f380a232a41dafc496afd7f186b203c04ad1201549c98b6:0',
          value: 10000000,
        },
      ];

      const txs = {
        p2sh: {
          halfSigned: '0100000001accf0cd2599ea4d6d8b032405f9396fe218c247b661e58cf3e9e4bb3c095426828000000b700483045022100cd5a6a660f56da89f7b27e566406e90282f4120bffef1918518f744a6bb3209f022055774755ee323dae0b555a2f5b8f548c20b905b6a7fe954d1d93e415c71e77060100004c6952210272ed48816a9600b7262388e3ae9d9faf1a14ff773350835c784dde916ce7bfff2103c388215ac5a6400db9ec2a3d69e965f3c30ad6935d729c9cef083124646ae5482102bc24b831b847b501dbcbb383fbc64138043573ad766968e0ee66744e00bf08a353aeffffffff01ce15fa020000000017a9147676db43fea61814cf0e2317b5e9b336054f8a2e87ad600800',
          fullySigned: '0100000001accf0cd2599ea4d6d8b032405f9396fe218c247b661e58cf3e9e4bb3c095426828000000fdfd0000483045022100cd5a6a660f56da89f7b27e566406e90282f4120bffef1918518f744a6bb3209f022055774755ee323dae0b555a2f5b8f548c20b905b6a7fe954d1d93e415c71e77060147304402200476814f5ec0b4ded9b57414395ac7deda570339fb5d71377b9fc896c1d6e78b0220249237943e11062592c32f4f68d8ef03372bf16a83e8846d6effdba0a6ada020014c6952210272ed48816a9600b7262388e3ae9d9faf1a14ff773350835c784dde916ce7bfff2103c388215ac5a6400db9ec2a3d69e965f3c30ad6935d729c9cef083124646ae5482102bc24b831b847b501dbcbb383fbc64138043573ad766968e0ee66744e00bf08a353aeffffffff01ce15fa020000000017a9147676db43fea61814cf0e2317b5e9b336054f8a2e87ad600800',
        },
        p2shP2wsh: {
          halfSigned: '0100000000010283c93cf99e7b8dc0de81dedd9f0903e8dfae93509c9c1e63459a24ceeb5a67c10100000023220020dced90433eee50a13a9a5e3a01d4f011eda3832cfe7078202f435125908a8023ffffffffd7228a6a98b73a02bec7f3a8709966a19e6985efd7cd26eb396eacb105b6d61c0000000023220020d3943e78dc44bbaddb8c5ff3f24956efb3175a019d01b5690841910c219b5f01ffffffff02c9370f000000000017a9142f2ddab3f793ceab164ed186afa4dfec9eb9c9e58740420f000000000017a9145bac3641fa38b9dad47a2a027d3a39e38b476124870500483045022100ec86cfba7d76fa7b9fb39ff56a3b708eee06d1cfefe9266455f16db5b37654c80220219158789c81dac85d04bbb584255c4cd0fdc2dbc3690cc18b29f04a2ffa193201000069522102d31024f6184956b730294a1275383c6d57c8fcfdfebb4870fd91882b1c08a8a821028f4b8d4508169c746a2381155bf7cbfa56eeff237937040597e7be632ff74719210315f8700de6902daa99e4c511b008e5018d8f3b586143183f80ab97db8fde770a53ae0500483045022100e37c1cf55b9f23b4ef0bfb018fb54eaae8a5541635269f06176b4f715151a9d102202b057455a3353ba1e2e32526d55e267e957ba00fe416ac59458bf9c1b5044e690100006952210311322726192eb6cbbec6445514d148722a936d5805360be2faf2f8adc8b5aec42102d2e6cf4c6dcdc8e3e1633e7e64b2e41f5be4a583934adbf1f2372240f41b59ae21023799f2560c321587ae734da2d1faafa7c4931145b4b785a3263fa5aa193a208753ae7f011600',
          fullySigned: '0100000000010283c93cf99e7b8dc0de81dedd9f0903e8dfae93509c9c1e63459a24ceeb5a67c10100000023220020dced90433eee50a13a9a5e3a01d4f011eda3832cfe7078202f435125908a8023ffffffffd7228a6a98b73a02bec7f3a8709966a19e6985efd7cd26eb396eacb105b6d61c0000000023220020d3943e78dc44bbaddb8c5ff3f24956efb3175a019d01b5690841910c219b5f01ffffffff02c9370f000000000017a9142f2ddab3f793ceab164ed186afa4dfec9eb9c9e58740420f000000000017a9145bac3641fa38b9dad47a2a027d3a39e38b476124870400483045022100ec86cfba7d76fa7b9fb39ff56a3b708eee06d1cfefe9266455f16db5b37654c80220219158789c81dac85d04bbb584255c4cd0fdc2dbc3690cc18b29f04a2ffa19320147304402206c6c7760d7acbd595e8649e80e64a67aee8a7b1d16ca9e6b090d31235252fb2902200e2655df8a4f3c230df6e4a1ca881a7b4781963b786479f4ebc02aaa9b6031e90169522102d31024f6184956b730294a1275383c6d57c8fcfdfebb4870fd91882b1c08a8a821028f4b8d4508169c746a2381155bf7cbfa56eeff237937040597e7be632ff74719210315f8700de6902daa99e4c511b008e5018d8f3b586143183f80ab97db8fde770a53ae0400483045022100e37c1cf55b9f23b4ef0bfb018fb54eaae8a5541635269f06176b4f715151a9d102202b057455a3353ba1e2e32526d55e267e957ba00fe416ac59458bf9c1b5044e690148304502210097cab2c37d2335328f169fb0c8420e9abd4dd81dff988ea657707a43512b5df1022075aeeb099e75565e205743419b3b756e34a6f0d68a4e7d0e6f2a482ab70e276e016952210311322726192eb6cbbec6445514d148722a936d5805360be2faf2f8adc8b5aec42102d2e6cf4c6dcdc8e3e1633e7e64b2e41f5be4a583934adbf1f2372240f41b59ae21023799f2560c321587ae734da2d1faafa7c4931145b4b785a3263fa5aa193a208753ae7f011600',
          txInfo: {
            unspents: p2shP2wshUnspents,
          },
        },
        p2wsh: {
          halfSigned: '01000000000101b6989c540112ad043c206b187ffd6a49fcda412a230a387f0b35f2eeccd5fc520000000000ffffffff0222073d000000000017a914d795501e88704dd652de6b9a5cf30ca980ed07d687808d5b0000000000220020a5400adb4650be7a0f333dfd030496bb01ba44754e475532f5596a275dc973b6050047304402201715b6e3acb548ed90bd72b670e311434292666e01c5aa74a9a1b341dc6015780220376fa2d22465d7d2919d0ce2e96065559e4fadd90edea79543ee5f03d0c4828801000069522103f539e7cd897e676f07c55e5d672ae9686db91e626827f083139ca855e80e11832102ef4cbc39ee4abe37198ae095f3d4fef2716af7951f9bb9265aa9b9181e408342210345fb5ab601bad203c6ca6eb5ac5a5b4bf46986834419e6e87684e1e63c6a799e53ae99ac1600',
          fullySigned: '01000000000101b6989c540112ad043c206b187ffd6a49fcda412a230a387f0b35f2eeccd5fc520000000000ffffffff0222073d000000000017a914d795501e88704dd652de6b9a5cf30ca980ed07d687808d5b0000000000220020a5400adb4650be7a0f333dfd030496bb01ba44754e475532f5596a275dc973b6040047304402201715b6e3acb548ed90bd72b670e311434292666e01c5aa74a9a1b341dc6015780220376fa2d22465d7d2919d0ce2e96065559e4fadd90edea79543ee5f03d0c4828801483045022100bee8fa7548d99245b83599b657c310b4f4cc9c463002d4f843d8f8ed663f4df602204955fcd17ef02228e8e49c0d122fd0a77da76700376735625c90385d5ff43c3e0169522103f539e7cd897e676f07c55e5d672ae9686db91e626827f083139ca855e80e11832102ef4cbc39ee4abe37198ae095f3d4fef2716af7951f9bb9265aa9b9181e408342210345fb5ab601bad203c6ca6eb5ac5a5b4bf46986834419e6e87684e1e63c6a799e53ae99ac1600',
          txInfo: {
            unspents: p2wshUnspents,
          },
        },
      };

      let coin: Btc;
      before(() => {
        coin = bitgo.coin('btc');
      });

      describe('failure', () => {
        it('should fail for invalid transaction hexes', async function () {
          await (coin as any).explainTransaction().should.be.rejectedWith('invalid transaction hex, must be a valid hex string');

          await coin.explainTransaction({ txHex: '' }).should.be.rejectedWith('invalid transaction hex, must be a valid hex string');

          await coin.explainTransaction({ txHex: 'nonsense' }).should.be.rejectedWith('invalid transaction hex, must be a valid hex string');

          await (coin as any).explainTransaction({ txHex: 1234 }).should.be.rejectedWith('invalid transaction hex, must be a valid hex string');

          await coin.explainTransaction({ txHex: '1234a' }).should.be.rejectedWith('invalid transaction hex, must be a valid hex string');

          await coin.explainTransaction({ txHex: '1234ab' }).should.be.rejectedWith('failed to parse transaction hex');
        });
      });

      describe('success', () => {
        it('should handle undefined tx info for segwit transactions', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: txs.p2shP2wsh.halfSigned,
          });

          should.exist(signatures);
          signatures.should.equal(0);

          should.exist(inputSignatures);
          inputSignatures.should.have.length(2);
          inputSignatures.should.deepEqual([0, 0]);
        });

        it('should count zero signatures on an unsigned transaction', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: unsignedTx,
          });

          should.exist(signatures);
          signatures.should.equal(0);

          should.exist(inputSignatures);
          inputSignatures.should.have.length(2);
          inputSignatures.should.deepEqual([0, 0]);
        });

        it('should count one signature on a half-signed p2sh transaction', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: txs.p2sh.halfSigned,
          });

          should.exist(signatures);
          signatures.should.equal(1);

          should.exist(inputSignatures);
          inputSignatures.should.have.length(1);
          inputSignatures.should.deepEqual([1]);
        });

        it('should count two signatures on a fully-signed p2sh transaction', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: txs.p2sh.fullySigned,
          });

          should.exist(signatures);
          signatures.should.equal(2);

          should.exist(inputSignatures);
          inputSignatures.should.have.length(1);
          inputSignatures.should.deepEqual([2]);
        });

        it('should count one signature on a half-signed p2shP2wsh transaction', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: txs.p2shP2wsh.halfSigned,
            txInfo: txs.p2shP2wsh.txInfo,
          });

          should.exist(signatures);
          signatures.should.equal(1);

          should.exist(inputSignatures);
          inputSignatures.should.have.length(2);
          inputSignatures.should.deepEqual([1, 1]);
        });

        it('should count two signatures on a fully-signed p2shP2wsh transaction', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: txs.p2shP2wsh.fullySigned,
            txInfo: txs.p2shP2wsh.txInfo,
          });

          should.exist(signatures);
          signatures.should.equal(2);

          should.exist(inputSignatures);
          inputSignatures.should.have.length(2);
          inputSignatures.should.deepEqual([2, 2]);
        });

        it('should count one signature on a half-signed p2wsh transaction', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: txs.p2wsh.halfSigned,
            txInfo: txs.p2wsh.txInfo,
          });

          should.exist(signatures);
          signatures.should.equal(1);

          should.exist(inputSignatures);
        });

        it('should count two signatures on a fully-signed p2wsh transaction', async function () {
          const { signatures, inputSignatures } = await coin.explainTransaction({
            txHex: txs.p2wsh.fullySigned,
            txInfo: txs.p2wsh.txInfo,
          });

          should.exist(signatures);
          signatures.should.equal(2);

          should.exist(inputSignatures);
        });
      });
    });
  });

  describe('Address validation:', () => {
    let coin: Btc;
    before(() => {
      coin = bitgo.coin('tbtc');
    });

    it('should validate a base58 address', () => {
      const validBase58Address = '2Mv1fGp8gHSqsiXYG7WqcYmHZdurDGVtUbn';
      coin.isValidAddress(validBase58Address).should.be.true();
    });

    it('should validate a bech32 address', () => {
      const validBech32Address = 'tb1qtxxqmkkdx4n4lcp0nt2cct89uh3h3dlcu940kw9fcqyyq36peh0st94hfp';
      coin.isValidAddress(validBech32Address).should.be.true();
    });

    it('should validate a bech32m address', () => {
      // https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki#Test_vectors_for_Bech32m
      const validBech32mAddress = 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7';
      coin.isValidAddress(validBech32mAddress).should.be.true();
    });
  });
});
