/**
 * @prettier
 */
import * as utxolib from '@bitgo/utxo-lib';
import * as coins from '../../../../../src/v2/coins';
import { BitGo } from '../../../../../src';
import { TestBitGo } from '../../../../lib/test_bitgo';

const AbstractUtxoCoin = coins.AbstractUtxoCoin as unknown as ObjectConstructor;

function getPrototypeChain(c: ObjectConstructor): ObjectConstructor[] {
  if (!c) {
    return [];
  }
  return [c, ...getPrototypeChain(Object.getPrototypeOf(c))];
}

function hasAbstractUtxoCoinPrototype(c: ObjectConstructor): boolean {
  return getPrototypeChain(c).includes(AbstractUtxoCoin);
}

const defaultBitGo = new TestBitGo({ env: 'mock' });

function getUtxoCoins(bitgo: BitGo = defaultBitGo): coins.AbstractUtxoCoin[] {
  return Object.values(coins)
    .map((c) => c as unknown as ObjectConstructor)
    .filter((cls) => hasAbstractUtxoCoinPrototype(cls) && cls !== AbstractUtxoCoin)
    .map((cls) => {
      try {
        return new cls(bitgo) as coins.AbstractUtxoCoin;
      } catch (e) {
        throw new Error(`error creating ${cls.name}: ${e}`);
      }
    })
    .sort((a, b) => a.getChain().localeCompare(b.getChain()));
}

export const utxoCoins = getUtxoCoins();

export function getUtxoCoinForNetwork(n: utxolib.Network): coins.AbstractUtxoCoin {
  for (const c of utxoCoins) {
    if (c.network === n) {
      return c;
    }
  }
  throw new Error(`no coin for network ${utxolib.coins.getNetworkName(n)}`);
}
