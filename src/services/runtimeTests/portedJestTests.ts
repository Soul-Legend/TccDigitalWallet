import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import CryptoService from '../CryptoService';
import TrustChainService from '../TrustChainService';
import {canonicalize} from '../encoding';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {defaultStudentData, minimalStudentData} from './fixtures';
import {
  assertDefined,
  assertEqual,
  assert,
  assertUndefined,
  assertContains,
} from './assertions';

/**
 * P2 — Tests ported from Jest E2E suites that have no runtime equivalent.
 */
const portedJestTests: RuntimeTestCase[] = [
  // ── From E2E.age-range-proof: ≥21, ≥25 thresholds ────────────
  {
    id: 'age-threshold-21-pass',
    name: 'Age >= 21 passes for 29-year-old',
    category: 'zkp',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const today = new Date();
      const birthdate29 = new Date(today.getFullYear() - 29, today.getMonth(), today.getDate());
      const birthdateStr = birthdate29.toISOString().split('T')[0];

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, data_nascimento: birthdateStr},
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const req: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'age_21_test',
        presentation_definition: {
          id: 'age_verification',
          input_descriptors: [{
            id: 'age_desc',
            name: 'Age >= 21',
            purpose: 'Verify age >= 21',
            constraints: {
              fields: [{path: ['$.credentialSubject.data_nascimento'], predicate: 'required'}],
            },
          }],
        },
        predicates: [{attribute: 'data_nascimento', p_type: '>=', value: 21}],
      };

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'data_nascimento', p_type: '>=', value: 21}],
      );
      const result = await VerificationService.validatePresentation(presentation, req);
      assert(result.valid, `Age >= 21 should pass for 29yo. Errors: ${result.errors?.join(', ')}`);
      assertEqual(result.predicates_satisfied, true, 'predicates satisfied');
    },
  },
  {
    id: 'age-threshold-25-pass',
    name: 'Age >= 25 passes for 29-year-old',
    category: 'zkp',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const today = new Date();
      const birthdate29 = new Date(today.getFullYear() - 29, today.getMonth(), today.getDate());
      const birthdateStr = birthdate29.toISOString().split('T')[0];

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, data_nascimento: birthdateStr},
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const req: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'age_25_test',
        presentation_definition: {
          id: 'age_verification',
          input_descriptors: [{
            id: 'age_desc',
            name: 'Age >= 25',
            purpose: 'Verify age >= 25',
            constraints: {
              fields: [{path: ['$.credentialSubject.data_nascimento'], predicate: 'required'}],
            },
          }],
        },
        predicates: [{attribute: 'data_nascimento', p_type: '>=', value: 25}],
      };

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'data_nascimento', p_type: '>=', value: 25}],
      );
      const result = await VerificationService.validatePresentation(presentation, req);
      assert(result.valid, `Age >= 25 should pass for 29yo. Errors: ${result.errors?.join(', ')}`);
    },
  },

  // ── From E2E.crypto-round-trip: tampered certificate detection ─
  {
    id: 'crypto-tampered-cert',
    name: 'Tampered certificate payload detected',
    category: 'crypto',
    run: async () => {
      const root = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC Root',
      );
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      const child = await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:ctc.ufsc.br',
        'CTC',
      );

      // Tamper with the child's name
      const tamperedPayload = canonicalize({
        did: child.did,
        name: 'TAMPERED NAME',
        parentDid: child.parentDid,
        publicKey: child.publicKey,
      });

      const isValid = await CryptoService.verifySignature(
        tamperedPayload,
        child.certificate,
        root.publicKey,
      );
      assert(!isValid, 'Tampered certificate name should fail verification');
    },
  },

  // ── From E2E.laboratory-access: privacy check ─────────────────
  {
    id: 'lab-privacy-check',
    name: 'Lab access flow does not disclose PII (CPF, nome, curso, status)',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {
          ...defaultStudentData,
          acesso_laboratorios: ['Lab 101'],
        },
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const labRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'lab_privacy',
        presentation_definition: {
          id: 'lab_access',
          input_descriptors: [{
            id: 'lab',
            name: 'Lab',
            purpose: 'Lab access',
            constraints: {
              fields: [{path: ['$.credentialSubject.acesso_laboratorios'], predicate: 'required'}],
              limit_disclosure: 'required',
            },
          }],
        },
        resource_id: 'Lab 101',
      };

      const presentation = await PresentationService.createPresentation(
        parsed,
        labRequest,
        ['acesso_laboratorios'],
      );

      assertUndefined(presentation.disclosed_attributes!.cpf, 'cpf must not be disclosed');
      assertUndefined(presentation.disclosed_attributes!.nome_completo, 'nome must not be disclosed');
      assertUndefined(presentation.disclosed_attributes!.curso, 'curso must not be disclosed');
      assertUndefined(presentation.disclosed_attributes!.status_matricula, 'status must not be disclosed');
      assertDefined(presentation.disclosed_attributes!.acesso_laboratorios, 'labs disclosed');
    },
  },

  // ── From E2E.laboratory-access: multiple labs iteration ───────
  {
    id: 'lab-multiple-iteration',
    name: 'Multiple individual lab access checks',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const labs = ['Lab 101', 'Lab 202', 'Lab Física Quântica', 'Lab Química'];
      const token = await CredentialService.issueCredential(
        {...defaultStudentData, acesso_laboratorios: labs},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      for (const lab of labs) {
        const req: PresentationExchangeRequest = {
          type: 'PresentationExchange',
          version: '1.0.0',
          challenge: `lab_iter_${Date.now()}`,
          presentation_definition: {
            id: 'lab_access',
            input_descriptors: [{
              id: 'lab',
              name: 'Lab',
              purpose: `Access ${lab}`,
              constraints: {
                fields: [{path: ['$.credentialSubject.acesso_laboratorios'], predicate: 'required'}],
              },
            }],
          },
          resource_id: lab,
        };

        const presentation = await PresentationService.createPresentation(
          parsed,
          req,
          ['acesso_laboratorios'],
        );
        const result = await VerificationService.validatePresentation(presentation, req);
        assert(result.valid, `Should have access to ${lab}. Errors: ${result.errors?.join(', ')}`);

        const disclosed = presentation.disclosed_attributes!.acesso_laboratorios as string[];
        assertContains(disclosed, lab, `${lab} in disclosed`);
      }
    },
  },

  // ── From E2E.complete-flow: RU tamper detection (separate test) ─
  {
    id: 'ru-tamper-detection',
    name: 'RU selective disclosure detects attribute tampering',
    category: 'presentation',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: false},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const ruRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'tamper_test',
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

      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      // Tamper: flip isencao_ru to true
      const tampered = JSON.parse(JSON.stringify(presentation));
      tampered.disclosed_attributes.isencao_ru = true;

      const result = await VerificationService.validatePresentation(tampered, ruRequest);
      assert(!result.valid, 'Tampered RU presentation should be invalid');
    },
  },
];

export default portedJestTests;
