import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {defaultStudentData, minimalStudentData} from './fixtures';
import {
  assertDefined,
  assertEqual,
  assertUndefined,
  assert,
  assertContains,
} from './assertions';

const ruSelectiveDisclosureTests: RuntimeTestCase[] = [
  {
    id: 'ru-grant-access',
    name: 'RU access granted with selective disclosure',
    category: 'presentation',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const ruRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: `ru_${Date.now()}`,
        presentation_definition: {
          id: 'ru_access',
          input_descriptors: [{
            id: 'ru_descriptor',
            name: 'RU Access Verification',
            purpose: 'Verify student status and RU exemption',
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

      const consent = await PresentationService.processPEXRequest(ruRequest, parsed);
      assertContains(consent.required_attributes, 'status_matricula', 'required attrs');
      assertContains(consent.required_attributes, 'isencao_ru', 'required attrs');

      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      assertEqual(presentation.disclosed_attributes!.status_matricula, 'Ativo', 'status');
      assertEqual(presentation.disclosed_attributes!.isencao_ru, true, 'isencao_ru');
      assertUndefined(presentation.disclosed_attributes!.nome_completo, 'nome hidden');
      assertUndefined(presentation.disclosed_attributes!.cpf, 'cpf hidden');
      assertUndefined(presentation.disclosed_attributes!.data_nascimento, 'birthdate hidden');
      assertUndefined(presentation.disclosed_attributes!.matricula, 'matricula hidden');

      const result = await VerificationService.validatePresentation(presentation, ruRequest);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);
    },
  },
  {
    id: 'ru-deny-no-exemption',
    name: 'RU access denied — no exemption',
    category: 'presentation',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, isencao_ru: false},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const ruRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'ru_challenge',
        presentation_definition: {
          id: 'ru_access',
          input_descriptors: [{
            id: 'ru_descriptor',
            name: 'RU Access',
            purpose: 'Verify RU access',
            constraints: {
              fields: [
                {path: ['$.credentialSubject.status_matricula'], predicate: 'required'},
                {
                  path: ['$.credentialSubject.isencao_ru'],
                  predicate: 'required',
                  filter: {type: 'boolean', const: true},
                },
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
      assertEqual(presentation.disclosed_attributes!.isencao_ru, false, 'isencao_ru is false');

      const result = await VerificationService.validatePresentation(presentation, ruRequest);
      assert(!result.valid, 'Should be invalid — no RU exemption');
      assertDefined(result.errors, 'errors');
    },
  },
  {
    id: 'ru-deny-inactive',
    name: 'RU access denied — inactive student',
    category: 'presentation',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, status_matricula: 'Inativo', isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const ruRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'ru_challenge',
        presentation_definition: {
          id: 'ru_access',
          input_descriptors: [{
            id: 'ru',
            name: 'RU',
            purpose: 'Verify RU',
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.status_matricula'],
                  predicate: 'required',
                  filter: {type: 'string', const: 'Ativo'},
                },
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
      assertEqual(presentation.disclosed_attributes!.status_matricula, 'Inativo', 'status');

      const result = await VerificationService.validatePresentation(presentation, ruRequest);
      assert(!result.valid, 'Should be invalid — inactive student');
      assertDefined(result.errors, 'errors');
    },
  },
  {
    id: 'ru-optional-attrs',
    name: 'Optional attribute selection in PEX request',
    category: 'presentation',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const ruRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'ru_challenge',
        presentation_definition: {
          id: 'ru_access',
          input_descriptors: [{
            id: 'ru',
            name: 'RU',
            purpose: 'Verify RU',
            constraints: {
              fields: [
                {path: ['$.credentialSubject.status_matricula'], predicate: 'required'},
                {path: ['$.credentialSubject.isencao_ru'], predicate: 'required'},
                {path: ['$.credentialSubject.curso'], predicate: 'preferred'},
                {path: ['$.credentialSubject.bolsa_estudantil'], predicate: 'preferred'},
              ],
              limit_disclosure: 'required',
            },
          }],
        },
      };

      const consent = await PresentationService.processPEXRequest(ruRequest, parsed);
      assertEqual(consent.required_attributes.length, 2, 'required count');
      assertEqual(consent.optional_attributes.length, 2, 'optional count');
      assertContains(consent.optional_attributes, 'curso', 'optional curso');
      assertContains(consent.optional_attributes, 'bolsa_estudantil', 'optional bolsa');

      // Disclose required + curso only
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru', 'curso'],
      );

      assertDefined(presentation.disclosed_attributes!.curso, 'curso disclosed');
      assertUndefined(presentation.disclosed_attributes!.bolsa_estudantil, 'bolsa not disclosed');

      const result = await VerificationService.validatePresentation(presentation, ruRequest);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);
    },
  },
];

export default ruSelectiveDisclosureTests;
