import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {defaultStudentData, minimalStudentData} from './fixtures';
import {assertDefined, assert, assertContains} from './assertions';

const laboratoryAccessTests: RuntimeTestCase[] = [
  {
    id: 'lab-grant-access',
    name: 'Lab access granted when student has permission',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {
          ...defaultStudentData,
          acesso_laboratorios: ['Lab 101', 'Lab 202', 'Lab Física Quântica'],
          acesso_predios: ['Prédio A', 'Prédio B'],
        },
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const requestedLab = 'Lab 101';
      const labRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: `lab_${Date.now()}`,
        presentation_definition: {
          id: 'lab_access',
          input_descriptors: [{
            id: 'lab_descriptor',
            name: 'Laboratory Access',
            purpose: `Verify access for ${requestedLab}`,
            constraints: {
              fields: [{
                path: ['$.credentialSubject.acesso_laboratorios'],
                predicate: 'required',
              }],
            },
          }],
        },
        resource_id: requestedLab,
      };

      const consent = await PresentationService.processPEXRequest(labRequest, parsed);
      assertContains(consent.required_attributes, 'acesso_laboratorios', 'required attrs');

      const presentation = await PresentationService.createPresentation(
        parsed,
        labRequest,
        ['acesso_laboratorios'],
      );
      assertDefined(presentation.disclosed_attributes!.acesso_laboratorios, 'labs disclosed');
      assert(
        Array.isArray(presentation.disclosed_attributes!.acesso_laboratorios),
        'labs should be array',
      );

      const result = await VerificationService.validatePresentation(presentation, labRequest);
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);

      const labs = presentation.disclosed_attributes!.acesso_laboratorios as string[];
      assertContains(labs, requestedLab, 'requested lab in array');
    },
  },
  {
    id: 'lab-deny-access',
    name: 'Lab access denied — no permission',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {
          ...minimalStudentData,
          acesso_laboratorios: ['Lab História', 'Lab Arqueologia'],
        },
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const requestedLab = 'Lab Física Quântica';
      const labRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'lab_challenge',
        presentation_definition: {
          id: 'lab_access',
          input_descriptors: [{
            id: 'lab_descriptor',
            name: 'Laboratory Access',
            purpose: `Verify access for ${requestedLab}`,
            constraints: {
              fields: [{
                path: ['$.credentialSubject.acesso_laboratorios'],
                predicate: 'required',
                filter: {
                  type: 'array',
                  contains: {const: requestedLab},
                },
              }],
            },
          }],
        },
        resource_id: requestedLab,
      };

      const presentation = await PresentationService.createPresentation(
        parsed,
        labRequest,
        ['acesso_laboratorios'],
      );

      const result = await VerificationService.validatePresentation(presentation, labRequest);
      assert(!result.valid, 'Should be invalid — no permission');
      assertDefined(result.errors, 'errors');
    },
  },
  {
    id: 'lab-building-access',
    name: 'Building access granted when has permission',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {
          ...minimalStudentData,
          acesso_predios: ['Prédio Engenharia', 'Centro Tecnológico', 'Biblioteca Central'],
        },
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const requestedBuilding = 'Centro Tecnológico';
      const buildingRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'building_challenge',
        presentation_definition: {
          id: 'building_access',
          input_descriptors: [{
            id: 'building_descriptor',
            name: 'Building Access',
            purpose: `Verify access for ${requestedBuilding}`,
            constraints: {
              fields: [{
                path: ['$.credentialSubject.acesso_predios'],
                predicate: 'required',
              }],
            },
          }],
        },
        resource_id: requestedBuilding,
      };

      const presentation = await PresentationService.createPresentation(
        parsed,
        buildingRequest,
        ['acesso_predios'],
      );

      const result = await VerificationService.validatePresentation(
        presentation,
        buildingRequest,
      );
      assert(result.valid, `Should be valid. Errors: ${result.errors?.join(', ')}`);

      const buildings = presentation.disclosed_attributes!.acesso_predios as string[];
      assertContains(buildings, requestedBuilding, 'requested building');
    },
  },
  {
    id: 'lab-empty-arrays',
    name: 'Empty access arrays deny access',
    category: 'verification',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        {
          ...minimalStudentData,
          acesso_laboratorios: [],
          acesso_predios: [],
        },
        holderDID,
        'sd-jwt',
      );
      const parsed = await CredentialService.validateAndParseCredential(token);

      const labRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'empty_lab',
        presentation_definition: {
          id: 'lab_access',
          input_descriptors: [{
            id: 'lab_descriptor',
            name: 'Lab Access',
            purpose: 'Check lab access',
            constraints: {
              fields: [{
                path: ['$.credentialSubject.acesso_laboratorios'],
                predicate: 'required',
                filter: {
                  type: 'array',
                  contains: {const: 'Lab 101'},
                },
              }],
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

      const result = await VerificationService.validatePresentation(presentation, labRequest);
      assert(!result.valid, 'Empty labs should deny access');
    },
  },
];

export default laboratoryAccessTests;
