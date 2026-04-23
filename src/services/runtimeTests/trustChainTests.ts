import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import TrustChainService from '../TrustChainService';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {defaultStudentData} from './fixtures';
import {assertDefined, assertEqual, assert, assertUndefined} from './assertions';

const ruPexRequest: PresentationExchangeRequest = {
  type: 'PresentationExchange',
  version: '1.0.0',
  challenge: 'challenge_trust_e2e',
  presentation_definition: {
    id: 'ru_access',
    input_descriptors: [{
      id: 'ru_descriptor',
      name: 'RU Access',
      purpose: 'Verify RU access eligibility',
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

const trustChainTests: RuntimeTestCase[] = [
  {
    id: 'trust-2level-chain',
    name: '2-level trust chain (root → department)',
    category: 'trust-chain',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      const {did: issuerDID} = await DIDService.generateIssuerIdentity('cagr.ufsc.br');
      assertEqual(issuerDID, 'did:web:cagr.ufsc.br', 'issuerDID');

      const root = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC - Âncora Raiz',
      );
      assert(root.parentDid === null, 'root has no parent');

      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');
      assertDefined(rootKey, 'rootKey');

      const child = await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        issuerDID,
        'CAGR - Coordenadoria Acadêmica',
      );
      assertEqual(child.parentDid, 'did:web:ufsc.br', 'child parent');

      const chainResult = await TrustChainService.verifyTrustChain(issuerDID);
      assert(chainResult.trusted, 'chain should be trusted');
      assertEqual(chainResult.chain.length, 2, 'chain length');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruPexRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);
      assertEqual(result.trust_chain_valid, true, 'trust chain valid');
    },
  },
  {
    id: 'trust-3level-chain',
    name: '3-level trust chain (root → center → department)',
    category: 'trust-chain',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      const {did: issuerDID} = await DIDService.generateIssuerIdentity('ine.ufsc.br');
      assertEqual(issuerDID, 'did:web:ine.ufsc.br', 'issuerDID');

      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC Root');
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:ctc.ufsc.br',
        'CTC - Centro Tecnológico',
      );
      const ctcKey = await TrustChainService.getIssuerPrivateKey('did:web:ctc.ufsc.br');

      await TrustChainService.registerChildIssuer(
        'did:web:ctc.ufsc.br',
        ctcKey!,
        issuerDID,
        'INE - Departamento de Informática',
      );

      const chainResult = await TrustChainService.verifyTrustChain(issuerDID);
      assert(chainResult.trusted, 'chain should be trusted');
      assertEqual(chainResult.chain.length, 3, 'chain length');
      assertEqual(chainResult.chain[0].did, issuerDID, 'chain[0] leaf');
      assertEqual(chainResult.chain[1].did, 'did:web:ctc.ufsc.br', 'chain[1] intermediate');
      assertEqual(chainResult.chain[2].did, 'did:web:ufsc.br', 'chain[2] root');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruPexRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);
      assertEqual(result.trust_chain_valid, true, 'trust chain valid');
    },
  },
  {
    id: 'trust-untrusted-issuer',
    name: 'Untrusted issuer rejected when chain is configured',
    category: 'trust-chain',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('evil-university.com');

      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC Root');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruPexRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
      assert(!result.valid, 'Untrusted issuer should fail');
      assertEqual(result.trust_chain_valid, false, 'trust chain invalid');
      assertDefined(result.errors, 'errors');
    },
  },
  {
    id: 'trust-no-chain-backwards-compat',
    name: 'No trust chain — backwards compatible',
    category: 'trust-chain',
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
        ruPexRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);
      assertUndefined(result.trust_chain_valid, 'trust_chain_valid should be undefined');
    },
  },
  {
    id: 'trust-root-as-issuer',
    name: 'Root issuer itself issues valid credential',
    category: 'trust-chain',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      const {did: issuerDID} = await DIDService.generateIssuerIdentity('ufsc.br');

      await TrustChainService.initializeRootIssuer(issuerDID, 'UFSC Root');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruPexRequest,
        ['status_matricula', 'isencao_ru'],
      );

      const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);
      assertEqual(result.trust_chain_valid, true, 'trust chain valid');
    },
  },
];

export default trustChainTests;
