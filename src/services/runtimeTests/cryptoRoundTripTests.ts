import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
import TrustChainService from '../TrustChainService';
import {canonicalize, canonicalAttributeHashInput} from '../encoding';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {defaultStudentData} from './fixtures';
import {assertDefined, assertEqual, assert} from './assertions';

const ruRequest: PresentationExchangeRequest = {
  type: 'PresentationExchange',
  version: '1.0.0',
  challenge: 'crypto_round_trip_challenge',
  presentation_definition: {
    id: 'ru_access',
    input_descriptors: [{
      id: 'ru',
      name: 'RU',
      purpose: 'RU access',
      constraints: {
        fields: [
          {path: ['$.credentialSubject.status_matricula'], predicate: 'required'},
          {path: ['$.credentialSubject.isencao_ru'], predicate: 'required'},
        ],
        limit_disclosure: 'required',
      },
    }],
  },
};

const cryptoRoundTripTests: RuntimeTestCase[] = [
  {
    id: 'crypto-signature-verify',
    name: 'Ed25519 presentation signature independently verifiable',
    category: 'crypto',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      assertDefined(presentation.proof.jws, 'proof.jws');
      assert(presentation.proof.jws!.length > 0, 'jws non-empty');

      const signedPayload = canonicalize({
        '@context': presentation['@context'],
        challenge: presentation.proof.challenge ?? null,
        disclosed_attributes: presentation.disclosed_attributes ?? {},
        hashed_attributes: (presentation as any).hashed_attributes ?? {},
        holder: presentation.holder,
        type: presentation.type,
        verifiableCredential: presentation.verifiableCredential,
      });

      const holderPublicKey = await StorageService.getHolderPublicKey();
      assertDefined(holderPublicKey, 'holderPublicKey');

      const isValid = await CryptoService.verifySignature(
        signedPayload,
        presentation.proof.jws!,
        holderPublicKey!,
      );
      assert(isValid, 'Signature should verify against canonical payload');
    },
  },
  {
    id: 'crypto-tamper-attributes',
    name: 'Tampered attributes detected via signature',
    category: 'crypto',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const tampered = JSON.parse(JSON.stringify(presentation));
      tampered.disclosed_attributes.isencao_ru = false;

      const tamperedPayload = canonicalize({
        '@context': tampered['@context'],
        challenge: tampered.proof.challenge ?? null,
        disclosed_attributes: tampered.disclosed_attributes ?? {},
        hashed_attributes: (tampered as any).hashed_attributes ?? {},
        holder: tampered.holder,
        type: tampered.type,
        verifiableCredential: tampered.verifiableCredential,
      });

      const holderPublicKey = await StorageService.getHolderPublicKey();
      const isValid = await CryptoService.verifySignature(
        tamperedPayload,
        tampered.proof.jws!,
        holderPublicKey!,
      );
      assert(!isValid, 'Tampered attributes should fail signature check');
    },
  },
  {
    id: 'crypto-tamper-holder',
    name: 'Tampered holder DID detected via signature',
    category: 'crypto',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const tampered = JSON.parse(JSON.stringify(presentation));
      tampered.holder = 'did:key:z6MkATTACKER';

      const tamperedPayload = canonicalize({
        '@context': tampered['@context'],
        challenge: tampered.proof.challenge ?? null,
        disclosed_attributes: tampered.disclosed_attributes ?? {},
        hashed_attributes: (tampered as any).hashed_attributes ?? {},
        holder: tampered.holder,
        type: tampered.type,
        verifiableCredential: tampered.verifiableCredential,
      });

      const holderPublicKey = await StorageService.getHolderPublicKey();
      const isValid = await CryptoService.verifySignature(
        tamperedPayload,
        tampered.proof.jws!,
        holderPublicKey!,
      );
      assert(!isValid, 'Tampered holder DID should fail signature check');
    },
  },
  {
    id: 'crypto-hash-deterministic',
    name: 'Hash obfuscation is deterministic',
    category: 'crypto',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const p1 = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );
      const p2 = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const hashes1 = (p1 as any).hashed_attributes;
      const hashes2 = (p2 as any).hashed_attributes;
      assertDefined(hashes1, 'hashed_attributes p1');
      assertDefined(hashes2, 'hashed_attributes p2');

      for (const key of Object.keys(hashes1)) {
        assertEqual(hashes1[key], hashes2[key], `hash for ${key}`);
      }
    },
  },
  {
    id: 'crypto-hash-independent-verify',
    name: 'Attribute hashes independently verifiable',
    category: 'crypto',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const hashedAttrs = (presentation as any).hashed_attributes;
      assertDefined(hashedAttrs, 'hashed_attributes');
      assertDefined(hashedAttrs.cpf, 'cpf hash');

      const expectedHash = await CryptoService.computeHash(
        canonicalAttributeHashInput('cpf', defaultStudentData.cpf),
        'titular',
      );
      assertEqual(hashedAttrs.cpf, expectedHash, 'cpf hash matches independent computation');
    },
  },
  {
    id: 'crypto-trust-chain-certs',
    name: 'Trust chain certificate signatures verifiable',
    category: 'crypto',
    run: async () => {
      const root = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC Root',
      );
      assertDefined(root.certificate, 'root certificate');

      const rootPayload = canonicalize({
        did: root.did,
        name: root.name,
        parentDid: root.parentDid,
        publicKey: root.publicKey,
      });
      const rootValid = await CryptoService.verifySignature(
        rootPayload,
        root.certificate,
        root.publicKey,
      );
      assert(rootValid, 'Root self-signature should verify');

      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');
      const child = await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:ctc.ufsc.br',
        'CTC',
      );

      const childPayload = canonicalize({
        did: child.did,
        name: child.name,
        parentDid: child.parentDid,
        publicKey: child.publicKey,
      });
      const childValid = await CryptoService.verifySignature(
        childPayload,
        child.certificate,
        root.publicKey,
      );
      assert(childValid, 'Child certificate should verify against root public key');
    },
  },
  {
    id: 'crypto-sign-verify-roundtrip',
    name: 'Sign and verify with stored key pair',
    category: 'crypto',
    run: async () => {
      await DIDService.generateHolderIdentity('key');

      const privateKey = await StorageService.getHolderPrivateKey();
      const publicKey = await StorageService.getHolderPublicKey();
      assertDefined(privateKey, 'privateKey');
      assertDefined(publicKey, 'publicKey');

      const data = 'runtime test message for round-trip';
      const signature = await CryptoService.signData(data, privateKey!, 'titular');
      const valid = await CryptoService.verifySignature(data, signature, publicKey!);
      assert(valid, 'Signature should verify');

      const invalidCheck = await CryptoService.verifySignature('wrong data', signature, publicKey!);
      assert(!invalidCheck, 'Wrong data should fail verification');
    },
  },
];

export default cryptoRoundTripTests;
