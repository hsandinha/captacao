import { Timestamp } from "firebase/firestore"; // Importa o Timestamp do Firebase

export interface DadosCaptacaoImovel {
  tipoDocumento: "imovel"; // campo para diferenciar
  id: string;
  criadoEm: Timestamp;
  dadosPessoais: {
    nome: string;
    telefone: string;
    email: string;
  };
  finalidade: string;
  tipo: string;
  tipoTexto?: string;
  valor?: number | null;
  valorCondominio?: number | null;
  valorIptu?: number | null;
  areaInterna?: number | null;
  areaExterna?: number | null;
  areaLote?: number | null;
  andar?: string;
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  destinacao?: string;
  estadoConservacao?: string;
  anoConstrucao?: number | null;
  temPiscina?: boolean;
  temAcademia?: boolean;
  aceitaPermuta?: boolean;
  aceitaFinanciamento?: boolean;
  ocupado?: boolean;
  endereco: {
    cep: string;
    endereco: string;
    numero: string;
    bairro: string;
    complemento?: string;
    cidade: string;
  };
}

export interface ParametroTipo {
  valor_m2_medio: number;
  ajustes_base: {
    quartos?: number;
    suites?: number;
    vagas?: number;
    area_externa_valor_m2?: number;
    estado_conservacao?: Record<string, number>;
    piscina?: number;
    academia?: number;
  };
}

export interface ParametroBairro {
  tipoDocumento: "parametro"; // campo para diferenciar
  endereco: {
    bairro: string;
    cidade: string;
  };
  tipos: Record<string, ParametroTipo>;
}
