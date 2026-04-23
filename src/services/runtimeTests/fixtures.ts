import type {StudentData} from '../../types';

/**
 * Reusable student data fixtures for runtime tests.
 */
export const defaultStudentData: StudentData = {
  nome_completo: 'Maria Santos',
  cpf: '98765432100',
  matricula: '2024001',
  curso: 'Engenharia de Software',
  status_matricula: 'Ativo',
  data_nascimento: '2000-05-15',
  alojamento_indigena: false,
  auxilio_creche: false,
  auxilio_moradia: true,
  bolsa_estudantil: true,
  bolsa_permanencia_mec: false,
  paiq: false,
  moradia_estudantil: false,
  isencao_ru: true,
  isencao_esporte: false,
  isencao_idiomas: false,
  acesso_laboratorios: ['Lab 101', 'Lab 202'],
  acesso_predios: ['Prédio A', 'Prédio B'],
};

export const minimalStudentData: StudentData = {
  nome_completo: 'Test User',
  cpf: '12345678900',
  matricula: '123456',
  curso: 'Test Course',
  status_matricula: 'Ativo',
  data_nascimento: '2000-01-01',
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
