import PresentationService from '../PresentationService';
import {PresentationExchangeRequest, VerifiableCredential} from '../../types';

describe('PresentationService - Simple Tests', () => {
  describe('validatePEXFormat', () => {
    it('should validate a valid PEX request', () => {
      const validRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test-challenge-123',
        presentation_definition: {
          id: 'test-def-1',
          input_descriptors: [
            {
              id: 'desc-1',
              name: 'Student Credential',
              purpose: 'Verify student status',
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.nome_completo'],
                    predicate: 'required',
                  },
                ],
              },
            },
          ],
        },
      };

      const result = PresentationService.validatePEXFormat(validRequest);
      expect(result).toBeDefined();
      expect(result.type).toBe('PresentationExchange');
      expect(result.challenge).toBe('test-challenge-123');
    });

    it('should validate a PEX request from JSON string', () => {
      const validRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test-challenge-456',
        presentation_definition: {
          id: 'test-def-2',
          input_descriptors: [
            {
              id: 'desc-2',
              name: 'Test',
              purpose: 'Test',
              constraints: {
                fields: [],
              },
            },
          ],
        },
      };

      const result = PresentationService.validatePEXFormat(
        JSON.stringify(validRequest),
      );
      expect(result).toBeDefined();
      expect(result.challenge).toBe('test-challenge-456');
    });

    it('should reject invalid JSON string', () => {
      expect(() => {
        PresentationService.validatePEXFormat('invalid json {');
      }).toThrow('Formato JSON inválido');
    });

    it('should reject request with wrong type', () => {
      const invalidRequest = {
        type: 'InvalidType',
        version: '1.0.0',
        challenge: 'test',
        presentation_definition: {
          id: 'test',
          input_descriptors: [],
        },
      };

      expect(() => {
        PresentationService.validatePEXFormat(invalidRequest as any);
      }).toThrow('Tipo de requisição inválido');
    });

    it('should reject request without challenge', () => {
      const invalidRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        presentation_definition: {
          id: 'test',
          input_descriptors: [],
        },
      };

      expect(() => {
        PresentationService.validatePEXFormat(invalidRequest as any);
      }).toThrow('Campo challenge ausente');
    });

    it('should reject request without presentation_definition', () => {
      const invalidRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test',
      };

      expect(() => {
        PresentationService.validatePEXFormat(invalidRequest as any);
      }).toThrow('Campo presentation_definition ausente');
    });
  });

  describe('extractRequestedAttributes', () => {
    it('should extract required attributes', () => {
      const request: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test',
        presentation_definition: {
          id: 'test',
          input_descriptors: [
            {
              id: 'desc-1',
              name: 'Test',
              purpose: 'Test',
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.nome_completo'],
                    predicate: 'required',
                  },
                  {
                    path: ['$.credentialSubject.cpf'],
                    predicate: 'required',
                  },
                ],
              },
            },
          ],
        },
      };

      const result = PresentationService.extractRequestedAttributes(request);
      expect(result.required).toContain('nome_completo');
      expect(result.required).toContain('cpf');
      expect(result.optional).toHaveLength(0);
      expect(result.all).toHaveLength(2);
    });

    it('should extract optional attributes', () => {
      const request: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test',
        presentation_definition: {
          id: 'test',
          input_descriptors: [
            {
              id: 'desc-1',
              name: 'Test',
              purpose: 'Test',
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.nome_completo'],
                    predicate: 'required',
                  },
                  {
                    path: ['$.credentialSubject.curso'],
                    predicate: 'preferred',
                  },
                ],
              },
            },
          ],
        },
      };

      const result = PresentationService.extractRequestedAttributes(request);
      expect(result.required).toContain('nome_completo');
      expect(result.optional).toContain('curso');
      expect(result.all).toHaveLength(2);
    });

    it('should handle attributes without predicate as required', () => {
      const request: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test',
        presentation_definition: {
          id: 'test',
          input_descriptors: [
            {
              id: 'desc-1',
              name: 'Test',
              purpose: 'Test',
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.matricula'],
                  },
                ],
              },
            },
          ],
        },
      };

      const result = PresentationService.extractRequestedAttributes(request);
      expect(result.required).toContain('matricula');
      expect(result.optional).toHaveLength(0);
    });

    it('should handle empty descriptors', () => {
      const request: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test',
        presentation_definition: {
          id: 'test',
          input_descriptors: [],
        },
      };

      const result = PresentationService.extractRequestedAttributes(request);
      expect(result.required).toHaveLength(0);
      expect(result.optional).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });
  });

  describe('processPEXRequest', () => {
    const mockCredential: VerifiableCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'AcademicIDCredential'],
      issuer: 'did:web:ufsc.br',
      issuanceDate: '2024-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:key:z6Mk...',
        nome_completo: 'João Silva',
        cpf: '12345678900',
        matricula: '123456',
        curso: 'Ciência da Computação',
        status_matricula: 'Ativo',
        data_nascimento: '2000-01-01',
        alojamento_indigena: false,
        auxilio_creche: false,
        auxilio_moradia: false,
        bolsa_estudantil: true,
        bolsa_permanencia_mec: false,
        paiq: false,
        moradia_estudantil: false,
        isencao_ru: true,
        isencao_esporte: false,
        isencao_idiomas: false,
        acesso_laboratorios: ['Lab1', 'Lab2'],
        acesso_predios: ['Predio A'],
      },
      proof: {
        type: 'JsonWebSignature2020',
        created: '2024-01-01T00:00:00Z',
        verificationMethod: 'did:web:ufsc.br#key-1',
        proofPurpose: 'assertionMethod',
        jws: 'test-signature',
      },
    };

    it('should process a valid PEX request and generate consent data', async () => {
      const request: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test-challenge',
        presentation_definition: {
          id: 'test-def',
          input_descriptors: [
            {
              id: 'desc-1',
              name: 'Student Info',
              purpose: 'Verify student',
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.nome_completo'],
                    predicate: 'required',
                  },
                  {
                    path: ['$.credentialSubject.curso'],
                    predicate: 'preferred',
                  },
                ],
              },
            },
          ],
        },
      };

      const consentData = await PresentationService.processPEXRequest(
        request,
        mockCredential,
      );

      expect(consentData).toBeDefined();
      expect(consentData.required_attributes).toContain('nome_completo');
      expect(consentData.optional_attributes).toContain('curso');
      expect(consentData.requested_attributes).toHaveLength(2);
    });

    it('should process PEX request with predicates', async () => {
      const request: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test-challenge',
        presentation_definition: {
          id: 'test-def',
          input_descriptors: [
            {
              id: 'desc-1',
              name: 'Age Verification',
              purpose: 'Verify age',
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.status_matricula'],
                    predicate: 'required',
                  },
                ],
              },
            },
          ],
        },
        predicates: [
          {
            attribute: 'data_nascimento',
            p_type: '>=',
            value: 18,
          },
        ],
      };

      const consentData = await PresentationService.processPEXRequest(
        request,
        mockCredential,
      );

      expect(consentData).toBeDefined();
      expect(consentData.predicates).toBeDefined();
      expect(consentData.predicates).toHaveLength(1);
      expect(consentData.predicates![0].attribute).toBe('data_nascimento');
    });
  });
});
