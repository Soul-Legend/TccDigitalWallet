import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {minimalStudentData} from './fixtures';
import {assertDefined, assertEqual, assertUndefined, assert} from './assertions';

function makeAgeRequest(challenge: string, threshold: number): PresentationExchangeRequest {
  return {
    type: 'PresentationExchange',
    version: '1.0.0',
    challenge,
    presentation_definition: {
      id: 'age_verification',
      input_descriptors: [{
        id: 'age_descriptor',
        name: 'Age Verification',
        purpose: `Verify age >= ${threshold}`,
        constraints: {
          fields: [{
            path: ['$.credentialSubject.data_nascimento'],
            predicate: 'required',
          }],
        },
      }],
    },
    predicates: [{attribute: 'data_nascimento', p_type: '>=', value: threshold}],
  };
}

const ageRangeProofTests: RuntimeTestCase[] = [
  {
    id: 'age-over-18',
    name: 'Age >= 18 passes (born 2000)',
    category: 'zkp',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, data_nascimento: '2000-12-25'},
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const req = makeAgeRequest(`age_${Date.now()}`, 18);
      const consent = await PresentationService.processPEXRequest(req, parsed);
      assertDefined(consent.predicates, 'predicates');
      assertEqual(consent.predicates![0].attribute, 'data_nascimento', 'predicate attr');
      assertEqual(consent.predicates![0].p_type, '>=', 'predicate type');

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        consent.predicates!,
      );
      assertDefined(presentation, 'presentation');
      assertDefined(presentation.zkp_proof, 'zkp_proof');
      assertUndefined(presentation.disclosed_attributes?.data_nascimento, 'birthdate not disclosed');

      const predicateProof = presentation.zkp_proof!.predicates.find(
        p => p.attr_name === 'data_nascimento',
      );
      assertDefined(predicateProof, 'age predicate proof');
      assertEqual(predicateProof!.p_type, '>=', 'predicate p_type');

      const result = await VerificationService.validatePresentation(presentation, req);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);
      assertEqual(result.predicates_satisfied, true, 'predicates satisfied');
    },
  },
  {
    id: 'age-underage',
    name: 'Underage rejected (born 2010)',
    category: 'zkp',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, data_nascimento: '2010-01-01'},
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const req = makeAgeRequest('age_challenge', 18);

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'data_nascimento', p_type: '>=', value: 18}],
      );

      const result = await VerificationService.validatePresentation(presentation, req);
      assert(!result.valid, 'Underage should be invalid');
      assertEqual(result.predicates_satisfied, false, 'predicates not satisfied');
      assertDefined(result.errors, 'errors');
    },
  },
  {
    id: 'age-boundary-18',
    name: 'Exactly 18 years old passes (boundary)',
    category: 'zkp',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const today = new Date();
      const eighteenYearsAgo = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate(),
      );
      const birthdateString = eighteenYearsAgo.toISOString().split('T')[0];

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, data_nascimento: birthdateString},
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const req = makeAgeRequest('age_boundary', 18);

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'data_nascimento', p_type: '>=', value: 18}],
      );

      const result = await VerificationService.validatePresentation(presentation, req);
      assert(result.valid, `Exactly 18 should be valid. Errors: ${result.errors?.join(', ')}`);
      assertEqual(result.predicates_satisfied, true, 'predicates satisfied');
    },
  },
  {
    id: 'age-threshold-30-fail',
    name: 'Age >= 30 fails for 29-year-old',
    category: 'zkp',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const today = new Date();
      const birthdate29 = new Date(
        today.getFullYear() - 29,
        today.getMonth(),
        today.getDate(),
      );
      const birthdateString = birthdate29.toISOString().split('T')[0];

      const token = await CredentialService.issueCredential(
        {...minimalStudentData, data_nascimento: birthdateString},
        holderDID,
        'anoncreds',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);
      const req = makeAgeRequest('age_30', 30);

      const presentation = await PresentationService.createZKPPresentation(
        parsed,
        req,
        [{attribute: 'data_nascimento', p_type: '>=', value: 30}],
      );

      const result = await VerificationService.validatePresentation(presentation, req);
      assert(!result.valid, 'Age >= 30 should fail for 29yo');
      assertEqual(result.predicates_satisfied, false, 'predicates not satisfied');
    },
  },
];

export default ageRangeProofTests;
