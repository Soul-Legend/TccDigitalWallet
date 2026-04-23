import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {minimalStudentData} from './fixtures';
import {assertDefined, assertEqual, assert} from './assertions';

const electionsTests: RuntimeTestCase[] = [
  {
    id: 'election-full-flow',
    name: 'Election flow with nullifier + duplicate prevention',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        minimalStudentData,
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const electionId = `eleicao_${Date.now()}`;
      const electionRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: `election_${Date.now()}`,
        presentation_definition: {
          id: 'election_eligibility',
          input_descriptors: [{
            id: 'election_desc',
            name: 'Election Eligibility',
            purpose: 'Verify voter eligibility',
            constraints: {
              fields: [{
                path: ['$.credentialSubject.status_matricula'],
                predicate: 'required',
                filter: {type: 'string', const: 'Ativo'},
              }],
            },
          }],
        },
        election_id: electionId,
        predicates: [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      };

      const consent = await PresentationService.processPEXRequest(electionRequest, parsed);
      assertDefined(consent.predicates, 'predicates');
      assert(consent.predicates!.length > 0, 'predicates non-empty');

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        electionRequest,
        consent.predicates!,
      );
      assertDefined(presentation, 'presentation');
      assertEqual(presentation.holder, holderDID, 'holder');
      assertDefined(presentation.nullifier, 'nullifier');
      assert(presentation.nullifier!.length > 0, 'nullifier non-empty');
      assertDefined(presentation.zkp_proof, 'zkp_proof');

      // First validation — should succeed
      const first = await VerificationService.validatePresentation(presentation, electionRequest);
      assert(first.valid, `First vote should be valid. Errors: ${first.errors?.join(', ')}`);
      assertEqual(first.predicates_satisfied, true, 'predicates satisfied');
      assertEqual(first.nullifier_check, 'new', 'nullifier is new');

      // Second validation — duplicate vote detected
      const second = await VerificationService.validatePresentation(presentation, electionRequest);
      assert(!second.valid, 'Second vote should be invalid');
      assertEqual(second.nullifier_check, 'duplicate', 'nullifier is duplicate');
      assertDefined(second.errors, 'errors');
    },
  },
  {
    id: 'election-deterministic-nullifier',
    name: 'Deterministic nullifiers for same credential+election',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        minimalStudentData,
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const req: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test',
        presentation_definition: {
          id: 'test',
          input_descriptors: [{
            id: 'test',
            name: 'Test',
            purpose: 'Test',
            constraints: {
              fields: [{path: ['$.credentialSubject.status_matricula'], predicate: 'required'}],
            },
          }],
        },
        election_id: 'test_election_123',
        predicates: [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      };

      const p1 = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      );
      const p2 = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      );

      assertEqual(p1.nullifier, p2.nullifier, 'nullifiers should match');
    },
  },
  {
    id: 'election-different-elections',
    name: 'Different elections produce different nullifiers',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        minimalStudentData,
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const makeReq = (electionId: string, challenge: string): PresentationExchangeRequest => ({
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge,
        presentation_definition: {
          id: 'election',
          input_descriptors: [{
            id: 'desc',
            name: 'Election',
            purpose: 'Test',
            constraints: {
              fields: [{path: ['$.credentialSubject.status_matricula'], predicate: 'required'}],
            },
          }],
        },
        election_id: electionId,
        predicates: [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      });

      const req1 = makeReq('election_reitoria', 'c1');
      const req2 = makeReq('election_diretorio', 'c2');

      const p1 = await PresentationService.createZKPPresentation(
        parsed,
        req1,
        [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      );
      const p2 = await PresentationService.createZKPPresentation(
        parsed,
        req2,
        [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      );

      if (p1.nullifier === p2.nullifier) {
        throw new Error('Different elections must produce different nullifiers');
      }

      const v1 = await VerificationService.validatePresentation(p1, req1);
      const v2 = await VerificationService.validatePresentation(p2, req2);
      assert(v1.valid, `Election 1 should be valid. Errors: ${v1.errors?.join(', ')}`);
      assertEqual(v1.nullifier_check, 'new', 'election1 nullifier');
      assert(v2.valid, `Election 2 should be valid. Errors: ${v2.errors?.join(', ')}`);
      assertEqual(v2.nullifier_check, 'new', 'election2 nullifier');
    },
  },
  {
    id: 'election-inactive-rejected',
    name: 'Inactive student rejected from voting',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, status_matricula: 'Inativo'},
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const req: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test',
        presentation_definition: {
          id: 'election',
          input_descriptors: [{
            id: 'elig',
            name: 'Eligibility',
            purpose: 'Check eligibility',
            constraints: {
              fields: [{
                path: ['$.credentialSubject.status_matricula'],
                predicate: 'required',
                filter: {type: 'string', const: 'Ativo'},
              }],
            },
          }],
        },
        election_id: 'test_election',
        predicates: [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      };

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      );

      const result = await VerificationService.validatePresentation(presentation, req);
      assert(!result.valid, 'Inactive student should be rejected');
      assertEqual(result.predicates_satisfied, false, 'predicates not satisfied');
      assertDefined(result.errors, 'errors');
    },
  },
];

export default electionsTests;
