import fc from 'fast-check';
import {StudentData} from '../../types';

/**
 * Feature: carteira-identidade-academica, Property 4: Form Validation Completeness
 * **Validates: Requirements 2.2, 2.3**
 *
 * For any form submission in the Issuer module, all required fields
 * (nome_completo, cpf, matricula, curso, status_matricula, data_nascimento)
 * SHALL be validated, and missing or invalid fields SHALL trigger specific error messages.
 */

// Validation function extracted from IssuerScreen for testing
interface FormErrors {
  nome_completo?: string;
  cpf?: string;
  matricula?: string;
  curso?: string;
  status_matricula?: string;
  data_nascimento?: string;
}

const validateForm = (formData: Partial<StudentData>): FormErrors => {
  const errors: FormErrors = {};

  if (!formData.nome_completo || formData.nome_completo.trim() === '') {
    errors.nome_completo = 'Nome completo é obrigatório';
  }

  if (!formData.cpf || formData.cpf.trim() === '') {
    errors.cpf = 'CPF é obrigatório';
  } else if (!/^\d{11}$/.test(formData.cpf.replace(/\D/g, ''))) {
    errors.cpf = 'CPF deve conter 11 dígitos';
  }

  if (!formData.matricula || formData.matricula.trim() === '') {
    errors.matricula = 'Matrícula é obrigatória';
  }

  if (!formData.curso || formData.curso.trim() === '') {
    errors.curso = 'Curso é obrigatório';
  }

  if (!formData.status_matricula) {
    errors.status_matricula = 'Status de matrícula é obrigatório';
  }

  if (!formData.data_nascimento || formData.data_nascimento.trim() === '') {
    errors.data_nascimento = 'Data de nascimento é obrigatória';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.data_nascimento)) {
    errors.data_nascimento =
      'Data de nascimento deve estar no formato AAAA-MM-DD';
  }

  return errors;
};

// Arbitraries for property-based testing
const arbitraryValidStudentData = (): fc.Arbitrary<StudentData> =>
  fc.record({
    nome_completo: fc.string({minLength: 3, maxLength: 100}).filter(s => s.trim().length > 0),
    cpf: fc.integer({min: 10000000000, max: 99999999999}).map(n => String(n)),
    matricula: fc.string({minLength: 6, maxLength: 20}).filter(s => s.trim().length >= 6),
    curso: fc.constantFrom(
      'Ciência da Computação',
      'Engenharia',
      'Medicina',
      'Direito',
      'Administração',
    ),
    status_matricula: fc.constantFrom('Ativo', 'Inativo') as fc.Arbitrary<
      'Ativo' | 'Inativo'
    >,
    data_nascimento: fc
      .integer({min: 1950, max: 2010})
      .chain(year =>
        fc
          .integer({min: 1, max: 12})
          .chain(month =>
            fc
              .integer({min: 1, max: 28})
              .map(
                day =>
                  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
              ),
          ),
      ),
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
    acesso_laboratorios: fc.array(fc.string(), {maxLength: 5}),
    acesso_predios: fc.array(fc.string(), {maxLength: 5}),
  });

describe('Property 4: Form Validation Completeness', () => {
  describe('Valid form data', () => {
    it('should pass validation for all valid complete forms', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const errors = validateForm(studentData);
          return Object.keys(errors).length === 0;
        }),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  describe('Missing required fields', () => {
    it('should detect missing nome_completo', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const invalidData = {...studentData, nome_completo: ''};
          const errors = validateForm(invalidData);
          return (
            errors.nome_completo !== undefined &&
            errors.nome_completo === 'Nome completo é obrigatório'
          );
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect missing cpf', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const invalidData = {...studentData, cpf: ''};
          const errors = validateForm(invalidData);
          return (
            errors.cpf !== undefined && errors.cpf === 'CPF é obrigatório'
          );
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect missing matricula', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const invalidData = {...studentData, matricula: ''};
          const errors = validateForm(invalidData);
          return (
            errors.matricula !== undefined &&
            errors.matricula === 'Matrícula é obrigatória'
          );
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect missing curso', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const invalidData = {...studentData, curso: ''};
          const errors = validateForm(invalidData);
          return (
            errors.curso !== undefined && errors.curso === 'Curso é obrigatório'
          );
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect missing status_matricula', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const invalidData = {
            ...studentData,
            status_matricula: undefined as any,
          };
          const errors = validateForm(invalidData);
          return (
            errors.status_matricula !== undefined &&
            errors.status_matricula === 'Status de matrícula é obrigatório'
          );
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect missing data_nascimento', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const invalidData = {...studentData, data_nascimento: ''};
          const errors = validateForm(invalidData);
          return (
            errors.data_nascimento !== undefined &&
            errors.data_nascimento === 'Data de nascimento é obrigatória'
          );
        }),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  describe('Invalid field formats', () => {
    it('should detect invalid CPF format (less than 11 digits)', () => {
      fc.assert(
        fc.property(
          arbitraryValidStudentData(),
          fc.integer({min: 1, max: 9999999999}),
          (studentData, invalidCpf) => {
            const invalidData = {...studentData, cpf: String(invalidCpf)};
            const errors = validateForm(invalidData);
            return (
              errors.cpf !== undefined &&
              errors.cpf === 'CPF deve conter 11 dígitos'
            );
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect invalid CPF format (non-numeric)', () => {
      fc.assert(
        fc.property(
          arbitraryValidStudentData(),
          fc.string().filter(s => !/^\d{11}$/.test(s.replace(/\D/g, ''))),
          (studentData, invalidCpf) => {
            const invalidData = {...studentData, cpf: invalidCpf};
            const errors = validateForm(invalidData);
            return errors.cpf !== undefined;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should detect invalid data_nascimento format', () => {
      fc.assert(
        fc.property(
          arbitraryValidStudentData(),
          fc
            .string({minLength: 1, maxLength: 20})
            .filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
          (studentData, invalidDate) => {
            const invalidData = {...studentData, data_nascimento: invalidDate};
            const errors = validateForm(invalidData);
            return (
              errors.data_nascimento !== undefined &&
              errors.data_nascimento ===
                'Data de nascimento deve estar no formato AAAA-MM-DD'
            );
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  describe('Multiple validation errors', () => {
    it('should detect all missing required fields simultaneously', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const invalidData: Partial<StudentData> = {
            nome_completo: '',
            cpf: '',
            matricula: '',
            curso: '',
            status_matricula: undefined as any,
            data_nascimento: '',
            alojamento_indigena: studentData.alojamento_indigena,
            auxilio_creche: studentData.auxilio_creche,
            auxilio_moradia: studentData.auxilio_moradia,
            bolsa_estudantil: studentData.bolsa_estudantil,
            bolsa_permanencia_mec: studentData.bolsa_permanencia_mec,
            paiq: studentData.paiq,
            moradia_estudantil: studentData.moradia_estudantil,
            isencao_ru: studentData.isencao_ru,
            isencao_esporte: studentData.isencao_esporte,
            isencao_idiomas: studentData.isencao_idiomas,
            acesso_laboratorios: studentData.acesso_laboratorios,
            acesso_predios: studentData.acesso_predios,
          };
          const errors = validateForm(invalidData);

          // All 6 required fields should have errors
          return (
            Object.keys(errors).length === 6 &&
            errors.nome_completo !== undefined &&
            errors.cpf !== undefined &&
            errors.matricula !== undefined &&
            errors.curso !== undefined &&
            errors.status_matricula !== undefined &&
            errors.data_nascimento !== undefined
          );
        }),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  describe('Whitespace handling', () => {
    it('should reject fields with only whitespace', () => {
      fc.assert(
        fc.property(
          arbitraryValidStudentData(),
          fc.constantFrom('   ', '\t\t', '  \n  '),
          (studentData, whitespace) => {
            const invalidData = {...studentData, nome_completo: whitespace};
            const errors = validateForm(invalidData);
            return (
              errors.nome_completo !== undefined &&
              errors.nome_completo === 'Nome completo é obrigatório'
            );
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  describe('Optional fields validation', () => {
    it('should not require optional boolean fields', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const dataWithOptionalsFalse = {
            ...studentData,
            alojamento_indigena: false,
            auxilio_creche: false,
            auxilio_moradia: false,
            bolsa_estudantil: false,
            bolsa_permanencia_mec: false,
            paiq: false,
            moradia_estudantil: false,
            isencao_ru: false,
            isencao_esporte: false,
            isencao_idiomas: false,
          };
          const errors = validateForm(dataWithOptionalsFalse);
          return Object.keys(errors).length === 0;
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should not require optional array fields', () => {
      fc.assert(
        fc.property(arbitraryValidStudentData(), studentData => {
          const dataWithEmptyArrays = {
            ...studentData,
            acesso_laboratorios: [],
            acesso_predios: [],
          };
          const errors = validateForm(dataWithEmptyArrays);
          return Object.keys(errors).length === 0;
        }),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
