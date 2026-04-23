import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import StorageService from '../StorageService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import {useAppStore} from '../../stores/useAppStore';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {defaultStudentData} from './fixtures';
import {
  assertDefined,
  assertMatch,
  assertEqual,
  assertUndefined,
  assert,
  assertRejects,
} from './assertions';

const completeFlowTests: RuntimeTestCase[] = [
  {
    id: 'flow-full-sdjwt',
    name: 'Full SD-JWT flow: identity → issue → store → present → verify',
    category: 'integration',
    run: async () => {
      // Step 1: Generate identities
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      assertDefined(holderDID, 'holderDID');
      assertMatch(holderDID, /^did:key:/, 'holderDID format');

      const {did: issuerDID} = await DIDService.generateIssuerIdentity('ufsc.br');
      assertDefined(issuerDID, 'issuerDID');

      // Step 2: Issue credential
      const credentialToken = await CredentialService.issueCredential(
        defaultStudentData,
        holderDID,
        'sd-jwt',
      );
      assertDefined(credentialToken, 'credentialToken');
      assertEqual(credentialToken.split('.').length, 3, 'JWT parts count');

      // Step 3: Store credential
      await StorageService.storeCredential(credentialToken);
      const stored = await StorageService.getCredentials();
      assertEqual(stored.length, 1, 'stored credentials count');

      // Step 4: Parse credential
      const parsed = await CredentialService.validateAndParseCredential(credentialToken);
      assertDefined(parsed, 'parsedCredential');
      assertEqual(parsed.issuer, issuerDID, 'credential issuer');
      assertEqual(parsed.credentialSubject.id, holderDID, 'credential subject');
      assertEqual(parsed.credentialSubject.nome_completo, 'Maria Santos', 'nome_completo');

      // Step 5: Build PEX request
      const pexRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: `challenge_${Date.now()}`,
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

      // Step 6: Process consent + create presentation
      const consentData = await PresentationService.processPEXRequest(pexRequest, parsed);
      assertDefined(consentData, 'consentData');
      assert(
        consentData.required_attributes.includes('status_matricula'),
        'consent should require status_matricula',
      );

      const presentation = await PresentationService.createPresentation(
        parsed,
        pexRequest,
        ['status_matricula', 'isencao_ru'],
      );
      assertDefined(presentation, 'presentation');
      assertEqual(presentation.holder, holderDID, 'presentation holder');
      assertEqual(presentation.disclosed_attributes!.status_matricula, 'Ativo', 'disclosed status');
      assertEqual(presentation.disclosed_attributes!.isencao_ru, true, 'disclosed isencao_ru');
      assertUndefined(presentation.disclosed_attributes!.cpf, 'cpf should not be disclosed');
      assertUndefined(presentation.disclosed_attributes!.nome_completo, 'nome should not be disclosed');

      // Step 7: Verify presentation
      const result = await VerificationService.validatePresentation(presentation, pexRequest);
      assertDefined(result, 'validationResult');
      assert(result.valid, `Presentation should be valid. Errors: ${result.errors?.join(', ')}`);

      // Step 8: Verify logs were created
      const logs = useAppStore.getState().logs;
      assert(logs.length > 0, 'Logs should have been created');
      assert(
        logs.some(l => l.operation === 'key_generation'),
        'Should have key_generation log',
      );
      assert(
        logs.some(l => l.operation === 'credential_issuance'),
        'Should have credential_issuance log',
      );
    },
  },
  {
    id: 'flow-multiple-credentials',
    name: 'Store and manage multiple credentials',
    category: 'integration',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const cred1 = await CredentialService.issueCredential(
        {...defaultStudentData, nome_completo: 'João Silva', cpf: '11111111111'},
        holderDID,
        'sd-jwt',
      );
      const cred2 = await CredentialService.issueCredential(
        {...defaultStudentData, nome_completo: 'Ana Costa', cpf: '22222222222'},
        holderDID,
        'sd-jwt',
      );

      await StorageService.storeCredential(cred1);
      await StorageService.storeCredential(cred2);

      let stored = await StorageService.getCredentials();
      assertEqual(stored.length, 2, 'stored credentials count');

      const parsed1 = await CredentialService.validateAndParseCredential(cred1);
      const parsed2 = await CredentialService.validateAndParseCredential(cred2);
      assertEqual(parsed1.credentialSubject.nome_completo, 'João Silva', 'cred1 name');
      assertEqual(parsed2.credentialSubject.nome_completo, 'Ana Costa', 'cred2 name');

      await StorageService.deleteCredential(0);
      stored = await StorageService.getCredentials();
      assertEqual(stored.length, 1, 'remaining credentials');

      const remaining = await CredentialService.validateAndParseCredential(stored[0]);
      assertEqual(remaining.credentialSubject.nome_completo, 'Ana Costa', 'remaining name');
    },
  },
  {
    id: 'flow-invalid-credential',
    name: 'Reject invalid credential format',
    category: 'integration',
    run: async () => {
      await assertRejects(
        () => CredentialService.validateAndParseCredential('invalid.jwt.token'),
        'invalid credential should throw',
      );
    },
  },
  {
    id: 'flow-tampered-presentation',
    name: 'Detect tampered presentation data',
    category: 'integration',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...defaultStudentData, isencao_ru: true},
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const pexRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test-challenge',
        presentation_definition: {
          id: 'ru_access',
          input_descriptors: [{
            id: 'ru',
            name: 'RU',
            purpose: 'test',
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
        pexRequest,
        ['status_matricula', 'isencao_ru'],
      );

      // Tamper with disclosed attributes
      const tampered = JSON.parse(JSON.stringify(presentation));
      tampered.disclosed_attributes.isencao_ru = false;

      const result = await VerificationService.validatePresentation(tampered, pexRequest);
      assert(!result.valid, 'Tampered presentation should be invalid');
    },
  },
];

export default completeFlowTests;
