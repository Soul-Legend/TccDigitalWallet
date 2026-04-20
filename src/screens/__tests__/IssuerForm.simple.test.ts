import {StudentData} from '../../types';

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

describe('IssuerForm Validation - Simple Tests', () => {
  it('should pass validation for valid complete form', () => {
    const validData: StudentData = {
      nome_completo: 'João Silva',
      cpf: '12345678901',
      matricula: '202301234',
      curso: 'Ciência da Computação',
      status_matricula: 'Ativo',
      data_nascimento: '2000-01-15',
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
      acesso_laboratorios: [],
      acesso_predios: [],
    };

    const errors = validateForm(validData);
    expect(Object.keys(errors).length).toBe(0);
  });

  it('should detect missing nome_completo', () => {
    const invalidData: Partial<StudentData> = {
      nome_completo: '',
      cpf: '12345678901',
      matricula: '202301234',
      curso: 'Ciência da Computação',
      status_matricula: 'Ativo',
      data_nascimento: '2000-01-15',
    };

    const errors = validateForm(invalidData);
    expect(errors.nome_completo).toBe('Nome completo é obrigatório');
  });

  it('should detect missing cpf', () => {
    const invalidData: Partial<StudentData> = {
      nome_completo: 'João Silva',
      cpf: '',
      matricula: '202301234',
      curso: 'Ciência da Computação',
      status_matricula: 'Ativo',
      data_nascimento: '2000-01-15',
    };

    const errors = validateForm(invalidData);
    expect(errors.cpf).toBe('CPF é obrigatório');
  });

  it('should detect invalid CPF format', () => {
    const invalidData: Partial<StudentData> = {
      nome_completo: 'João Silva',
      cpf: '123',
      matricula: '202301234',
      curso: 'Ciência da Computação',
      status_matricula: 'Ativo',
      data_nascimento: '2000-01-15',
    };

    const errors = validateForm(invalidData);
    expect(errors.cpf).toBe('CPF deve conter 11 dígitos');
  });

  it('should detect all missing required fields', () => {
    const invalidData: Partial<StudentData> = {
      nome_completo: '',
      cpf: '',
      matricula: '',
      curso: '',
      status_matricula: undefined,
      data_nascimento: '',
    };

    const errors = validateForm(invalidData);
    expect(Object.keys(errors).length).toBe(6);
    expect(errors.nome_completo).toBeDefined();
    expect(errors.cpf).toBeDefined();
    expect(errors.matricula).toBeDefined();
    expect(errors.curso).toBeDefined();
    expect(errors.status_matricula).toBeDefined();
    expect(errors.data_nascimento).toBeDefined();
  });
});
