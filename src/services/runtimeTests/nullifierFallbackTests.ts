import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import StorageService from '../StorageService';
import {generateNullifier} from '../PresentationHelpers';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {minimalStudentData} from './fixtures';
import {assertDefined, assertEqual, assert, assertMatch} from './assertions';

/**
 * P0 — Nullifier fallback path when ZK circuit is unavailable.
 */
const nullifierFallbackTests: RuntimeTestCase[] = [
  {
    id: 'nullifier-fallback-hash',
    name: 'Nullifier uses SHA-256 composite hash when circuit unavailable',
    category: 'zkp',
    run: async () => {
      await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const privateKey = await StorageService.getHolderPrivateKey();
      assertDefined(privateKey, 'privateKey');

      const electionId = `fallback_${Date.now()}`;

      // generateNullifier tries ZK circuit first, falls back to compositeHash
      const nullifier = await generateNullifier(privateKey!, electionId);
      assertDefined(nullifier, 'nullifier');
      assert(nullifier.length > 0, 'nullifier non-empty');
      // SHA-256 hex output is 64 chars
      assertMatch(nullifier, /^[0-9a-f]{64}$/, 'nullifier format');

      // Deterministic: same inputs → same output
      const nullifier2 = await generateNullifier(privateKey!, electionId);
      assertEqual(nullifier, nullifier2, 'deterministic fallback nullifier');

      // Different election → different nullifier
      const nullifier3 = await generateNullifier(privateKey!, 'other_election');
      assert(nullifier !== nullifier3, 'different election → different nullifier');
    },
  },
  {
    id: 'nullifier-fallback-election-flow',
    name: 'Full election flow works with fallback nullifier',
    category: 'zkp',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        minimalStudentData,
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const electionId = `fallback_flow_${Date.now()}`;
      const req: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'fallback_challenge',
        presentation_definition: {
          id: 'election',
          input_descriptors: [{
            id: 'elig',
            name: 'Eligibility',
            purpose: 'Verify eligibility',
            constraints: {
              fields: [{
                path: ['$.credentialSubject.status_matricula'],
                predicate: 'required',
              }],
            },
          }],
        },
        election_id: electionId,
        predicates: [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      };

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
      );

      assertDefined(presentation.nullifier, 'nullifier present');
      assert(presentation.nullifier!.length > 0, 'nullifier non-empty');

      // First vote succeeds
      const first = await VerificationService.validatePresentation(presentation, req);
      assert(first.valid, `First vote should pass. Errors: ${first.errors?.join(', ')}`);
      assertEqual(first.nullifier_check, 'new', 'first vote is new');

      // Second vote fails (duplicate)
      const second = await VerificationService.validatePresentation(presentation, req);
      assert(!second.valid, 'Duplicate vote should fail');
      assertEqual(second.nullifier_check, 'duplicate', 'duplicate detected');
    },
  },
];

export default nullifierFallbackTests;
