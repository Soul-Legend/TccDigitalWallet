import DIDService from '../DIDService';
import StorageService from '../StorageService';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {assertDefined, assertMatch, assertEqual} from './assertions';

const identityTests: RuntimeTestCase[] = [
  {
    id: 'identity-did-key',
    name: 'Generate did:key holder identity',
    category: 'identity',
    run: async () => {
      const {did, publicKey} = await DIDService.generateHolderIdentity('key');
      assertDefined(did, 'holderDID');
      assertMatch(did, /^did:key:/, 'holderDID format');
      assertDefined(publicKey, 'holderPublicKey');
      assertMatch(publicKey, /^[0-9a-f]{64}$/, 'publicKey hex format');

      const storedDID = await StorageService.getHolderDID();
      assertEqual(storedDID, did, 'stored holderDID');
    },
  },
  {
    id: 'identity-did-web',
    name: 'Generate did:web issuer identity',
    category: 'identity',
    run: async () => {
      const {did, publicKey} = await DIDService.generateIssuerIdentity('ufsc.br');
      assertDefined(did, 'issuerDID');
      assertMatch(did, /^did:web:ufsc\.br/, 'issuerDID format');
      assertDefined(publicKey, 'issuerPublicKey');
      assertMatch(publicKey, /^[0-9a-f]{64}$/, 'issuerPublicKey hex');
    },
  },
  {
    id: 'identity-key-storage',
    name: 'Key pairs stored and retrievable',
    category: 'identity',
    run: async () => {
      const {publicKey} = await DIDService.generateHolderIdentity('key');

      const storedPK = await StorageService.getHolderPublicKey();
      assertEqual(storedPK, publicKey, 'stored publicKey');

      const storedPrivate = await StorageService.getHolderPrivateKey();
      assertDefined(storedPrivate, 'stored privateKey');
      assertEqual(storedPrivate!.length, 64, 'privateKey length');
    },
  },
  {
    id: 'identity-unique-keys',
    name: 'Holder and issuer have unique keys',
    category: 'identity',
    run: async () => {
      const {publicKey: holderPK} = await DIDService.generateHolderIdentity('key');
      const {publicKey: issuerPK} = await DIDService.generateIssuerIdentity('ufsc.br');

      if (holderPK === issuerPK) {
        throw new Error('Holder and issuer public keys must be different');
      }
    },
  },
];

export default identityTests;
