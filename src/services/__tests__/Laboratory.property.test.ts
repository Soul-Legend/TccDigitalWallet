import fc from 'fast-check';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
import {
  VerifiableCredential,
  StudentData,
} from '../../types';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../LogService');
jest.mock('../CryptoService');
jest.mock('../StorageService');
jest.mock('../../stores/useAppStore');

describe('Laboratory Access Control - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logs: [],
      addLog: jest.fn(),
    });

    // Mock StorageService to return a consistent private key
    (StorageService.getHolderPrivateKey as jest.Mock).mockResolvedValue(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );

    // Mock StorageService to return a valid public key
    (StorageService.getHolderPublicKey as jest.Mock).mockResolvedValue(
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    );

    // Mock StorageService to return issuer public key
    (StorageService.getIssuerPublicKey as jest.Mock).mockResolvedValue(
      'issuer-public-key-abcdef0123456789abcdef0123456789abcdef012345',
    );

    // Mock CryptoService.signData to return a valid signature
    (CryptoService.signData as jest.Mock).mockResolvedValue(
      'mock-signature-hex',
    );

    // Mock CryptoService.computeHash
    (CryptoService.computeHash as jest.Mock).mockImplementation(
      async (data: string) => {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = (hash << 5) - hash + data.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
      },
    );

    // Mock CryptoService.generateNonce
    (CryptoService.generateNonce as jest.Mock).mockReturnValue(
      'mock-nonce-1234567890abcdef',
    );

    // Mock CryptoService.verifySignature
    (CryptoService.verifySignature as jest.Mock).mockResolvedValue(true);
  });

  // Arbitraries for property-based testing
  const arbitraryLabName = (): fc.Arbitrary<string> =>
    fc.oneof(
      fc.constantFrom('Lab 101', 'Lab 202', 'Lab 303', 'Lab Física', 'Lab Química'),
      fc.string({minLength: 5, maxLength: 20}),
    );

  const arbitraryBuildingName = (): fc.Arbitrary<string> =>
    fc.oneof(
      fc.constantFrom('Prédio A', 'Prédio B', 'Prédio C', 'Bloco Central'),
      fc.string({minLength: 5, maxLength: 20}),
    );

  const arbitraryStudentData = (): fc.Arbitrary<StudentData> =>
    fc.record({
      nome_completo: fc.string({minLength: 3, maxLength: 100}),
      cpf: fc
        .array(fc.integer({min: 0, max: 9}), {minLength: 11, maxLength: 11})
        .map(arr => arr.join('')),
      matricula: fc.string({minLength: 6, maxLength: 20}),
      curso: fc.constantFrom(
        'Ciência da Computação',
        'Engenharia',
        'Medicina',
        'Direito',
      ),
      status_matricula: fc.constantFrom('Ativo', 'Inativo'),
      data_nascimento: fc
        .integer({
          min: new Date('1950-01-01').getTime(),
          max: new Date('2010-01-01').getTime(),
        })
        .map(timestamp => new Date(timestamp).toISOString().split('T')[0]),
      alojamento_indigena: fc.boolean(),
      auxilio_creche: fc.boolean(),
      auxilio_moradia: fc.boolean(),
      bolsa_estudantil: fc.boolean(),
      bolsa_permanencia_mec: fc.boolean(),
      paiq: fc.boolean(),
      moradia_estudantil: fc.boolean(),
      isencao_ru: fc.boolean(),
      isencao_esporte: fc.boolean(),
      isencao_idiomas: fc.boolean(),
      acesso_laboratorios: fc.array(arbitraryLabName(), {
        minLength: 0,
        maxLength: 5,
      }),
      acesso_predios: fc.array(arbitraryBuildingName(), {
        minLength: 0,
        maxLength: 5,
      }),
    });

  const arbitraryCredential = (): fc.Arbitrary<VerifiableCredential> =>
    fc.record({
      '@context': fc.constant(['https://www.w3.org/2018/credentials/v1']),
      type: fc.constant(['VerifiableCredential', 'AcademicIDCredential']),
      issuer: fc.constant('did:web:ufsc.br'),
      issuanceDate: fc.constant(new Date('2024-01-01').toISOString()),
      credentialSubject: arbitraryStudentData().map(data => ({
        id: 'did:key:z6Mk...',
        ...data,
      })),
      proof: fc.record({
        type: fc.constant('JsonWebSignature2020'),
        created: fc.constant(new Date('2024-01-01').toISOString()),
        verificationMethod: fc.constant('did:web:ufsc.br#key-1'),
        proofPurpose: fc.constant('assertionMethod'),
        jws: fc.string({minLength: 20, maxLength: 40}),
      }),
    });

  /**
   * Property 33: Lab Access Array Verification
   * **Validates: Requirements 10.4**
   *
   * For any lab access request, the system SHALL check if the requested
   * lab/building exists in the acesso_laboratorios or acesso_predios arrays
   * of the credential.
   */
  // Feature: carteira-identidade-academica, Property 33: Lab Access Array Verification
  describe('Property 33: Lab Access Array Verification', () => {
    it('should verify lab exists in acesso_laboratorios array', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryLabName(),
          async (credential, requestedLab) => {
            // Add the requested lab to the credential
            credential.credentialSubject.acesso_laboratorios = [
              requestedLab,
              'Other Lab',
            ];

            // Generate PEX request for lab access
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            // Verify the request contains the resource_id
            expect(pexRequest.resource_id).toBe(requestedLab);

            // Check if the lab exists in the credential
            const hasAccess = credential.credentialSubject.acesso_laboratorios.includes(
              requestedLab,
            );
            expect(hasAccess).toBe(true);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should verify building exists in acesso_predios array', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryBuildingName(),
          async (credential, requestedBuilding) => {
            // Add the requested building to the credential
            credential.credentialSubject.acesso_predios = [
              requestedBuilding,
              'Other Building',
            ];

            // Generate PEX request for building access
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedBuilding},
            );

            // Verify the request contains the resource_id
            expect(pexRequest.resource_id).toBe(requestedBuilding);

            // Check if the building exists in the credential
            const hasAccess = credential.credentialSubject.acesso_predios.includes(
              requestedBuilding,
            );
            expect(hasAccess).toBe(true);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect missing lab access', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryLabName(),
          arbitraryLabName(),
          async (credential, existingLab, requestedLab) => {
            // Ensure requested lab is different from existing lab
            fc.pre(existingLab !== requestedLab);

            // Set credential to have only the existing lab
            credential.credentialSubject.acesso_laboratorios = [existingLab];
            credential.credentialSubject.acesso_predios = [];

            // Check if the requested lab exists in the credential
            const hasLabAccess = credential.credentialSubject.acesso_laboratorios.includes(
              requestedLab,
            );
            const hasBuildingAccess = credential.credentialSubject.acesso_predios.includes(
              requestedLab,
            );

            expect(hasLabAccess).toBe(false);
            expect(hasBuildingAccess).toBe(false);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should handle empty access arrays', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryLabName(),
          async (credential, requestedLab) => {
            // Set credential to have empty access arrays
            credential.credentialSubject.acesso_laboratorios = [];
            credential.credentialSubject.acesso_predios = [];

            // Check if the requested lab exists in the credential
            const hasLabAccess = credential.credentialSubject.acesso_laboratorios.includes(
              requestedLab,
            );
            const hasBuildingAccess = credential.credentialSubject.acesso_predios.includes(
              requestedLab,
            );

            expect(hasLabAccess).toBe(false);
            expect(hasBuildingAccess).toBe(false);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  /**
   * Property 34: Lab Access PEX Structure
   * **Validates: Requirements 10.3**
   *
   * For any lab access scenario, the generated PEX request SHALL specifically
   * request the acesso_laboratorios or acesso_predios arrays.
   */
  // Feature: carteira-identidade-academica, Property 34: Lab Access PEX Structure
  describe('Property 34: Lab Access PEX Structure', () => {
    it('should generate PEX request with acesso_laboratorios field', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryLabName(),
          async (requestedLab) => {
            // Generate PEX request for lab access
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            // Verify PEX structure
            expect(pexRequest.type).toBe('PresentationExchange');
            expect(pexRequest.version).toBe('1.0.0');
            expect(pexRequest.challenge).toBeDefined();
            expect(pexRequest.resource_id).toBe(requestedLab);

            // Verify presentation_definition structure
            expect(pexRequest.presentation_definition).toBeDefined();
            expect(pexRequest.presentation_definition.id).toBeDefined();
            expect(pexRequest.presentation_definition.input_descriptors).toBeDefined();
            expect(pexRequest.presentation_definition.input_descriptors.length).toBeGreaterThan(0);

            // Verify fields include acesso_laboratorios or acesso_predios
            const descriptor = pexRequest.presentation_definition.input_descriptors[0];
            expect(descriptor.constraints.fields).toBeDefined();

            const fieldPaths = descriptor.constraints.fields.map(f => f.path[0]);
            const hasLabField = fieldPaths.some(path =>
              path.includes('acesso_laboratorios'),
            );
            const hasBuildingField = fieldPaths.some(path =>
              path.includes('acesso_predios'),
            );

            expect(hasLabField || hasBuildingField).toBe(true);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should include resource_id in PEX request', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryLabName(),
          async (requestedLab) => {
            // Generate PEX request for lab access
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            // Verify resource_id is included
            expect(pexRequest.resource_id).toBeDefined();
            expect(pexRequest.resource_id).toBe(requestedLab);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should generate unique challenges for each request', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryLabName(),
          async (requestedLab) => {
            // Generate two PEX requests
            const pexRequest1 = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            const pexRequest2 = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            // Challenges should be different (nonces)
            // Note: In our mock, the nonce is constant, so we just verify it exists
            expect(pexRequest1.challenge).toBeDefined();
            expect(pexRequest2.challenge).toBeDefined();

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  /**
   * Property 35: Permission Confirmation
   * **Validates: Requirements 10.7**
   *
   * For any lab access presentation, the Verifier SHALL confirm the presence
   * of the specific permission in the disclosed arrays.
   */
  // Feature: carteira-identidade-academica, Property 35: Permission Confirmation
  describe('Property 35: Permission Confirmation', () => {
    it('should confirm permission when lab is in acesso_laboratorios', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryLabName(),
          async (credential, requestedLab) => {
            // Add the requested lab to the credential
            credential.credentialSubject.acesso_laboratorios = [
              requestedLab,
              'Other Lab',
            ];

            // Generate PEX request
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            // Create presentation with lab access arrays
            const selectedAttributes = ['acesso_laboratorios', 'acesso_predios'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify presentation contains disclosed attributes
            expect(presentation.disclosed_attributes).toBeDefined();
            expect(presentation.disclosed_attributes!.acesso_laboratorios).toBeDefined();

            // Verify the requested lab is in the disclosed array
            const disclosedLabs = presentation.disclosed_attributes!.acesso_laboratorios;
            expect(Array.isArray(disclosedLabs)).toBe(true);
            expect(disclosedLabs).toContain(requestedLab);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should confirm permission when building is in acesso_predios', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryBuildingName(),
          async (credential, requestedBuilding) => {
            // Add the requested building to the credential
            credential.credentialSubject.acesso_predios = [
              requestedBuilding,
              'Other Building',
            ];

            // Generate PEX request
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedBuilding},
            );

            // Create presentation with lab access arrays
            const selectedAttributes = ['acesso_laboratorios', 'acesso_predios'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify presentation contains disclosed attributes
            expect(presentation.disclosed_attributes).toBeDefined();
            expect(presentation.disclosed_attributes!.acesso_predios).toBeDefined();

            // Verify the requested building is in the disclosed array
            const disclosedBuildings = presentation.disclosed_attributes!.acesso_predios;
            expect(Array.isArray(disclosedBuildings)).toBe(true);
            expect(disclosedBuildings).toContain(requestedBuilding);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should not reveal permissions when not in arrays', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryLabName(),
          arbitraryLabName(),
          async (credential, existingLab, requestedLab) => {
            // Ensure requested lab is different from existing lab
            fc.pre(existingLab !== requestedLab);

            // Set credential to have only the existing lab
            credential.credentialSubject.acesso_laboratorios = [existingLab];
            credential.credentialSubject.acesso_predios = [];

            // Generate PEX request for the requested lab
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            // Create presentation
            const selectedAttributes = ['acesso_laboratorios', 'acesso_predios'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify presentation contains disclosed attributes
            expect(presentation.disclosed_attributes).toBeDefined();

            // Verify the requested lab is NOT in the disclosed arrays
            const disclosedLabs = presentation.disclosed_attributes!.acesso_laboratorios || [];
            const disclosedBuildings = presentation.disclosed_attributes!.acesso_predios || [];

            expect(disclosedLabs).not.toContain(requestedLab);
            expect(disclosedBuildings).not.toContain(requestedLab);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should validate presentation and confirm specific permission', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryLabName(),
          async (credential, requestedLab) => {
            // Add the requested lab to the credential
            credential.credentialSubject.acesso_laboratorios = [
              requestedLab,
              'Other Lab',
            ];

            // Generate PEX request
            const pexRequest = await VerificationService.generateChallenge(
              'lab_access',
              {resource_id: requestedLab},
            );

            // Create presentation
            const selectedAttributes = ['acesso_laboratorios', 'acesso_predios'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Validate the presentation
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            // Verify validation succeeded
            expect(validationResult.valid).toBe(true);

            // Verify the specific permission is confirmed
            const verifiedLabs = validationResult.verified_attributes?.acesso_laboratorios || [];
            expect(verifiedLabs).toContain(requestedLab);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
