"use client";

import { useState, useEffect, useCallback } from "react";
import { Award, TrendingUp, Megaphone } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

// Interfaces

export interface DadosCaptacaoImovel {
  tipoDocumento: "imovel";
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
  tipoDocumento: "parametro";
  endereco: {
    bairro: string;
    cidade: string;
  };
  tipos: Record<string, ParametroTipo>;
}

export default function CadastrarImovelPage() {
  const inputClass =
    "w-full bg-white border border-gray-200 rounded-lg h-14 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition";

  // --- ESTADOS DO FORMULÁRIO ---
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [tipo, setTipo] = useState("");
  const [tipoTexto, setTipoTexto] = useState("");
  const [destinacao, setDestinacao] = useState("");
  const [valor, setValor] = useState("");
  const [valorCondominio, setValorCondominio] = useState("");
  const [valorIptu, setValorIptu] = useState("");
  const [areaInterna, setAreaInterna] = useState("");
  const [areaExterna, setAreaExterna] = useState("");
  const [areaLote, setAreaLote] = useState("");
  const [andar, setAndar] = useState("");
  const [quartos, setQuartos] = useState("");
  const [suites, setSuites] = useState("");
  const [banheiros, setBanheiros] = useState("");
  const [vagas, setVagas] = useState("");
  const [aceitaPermuta, setAceitaPermuta] = useState(false);
  const [aceitaFinanciamento, setAceitaFinanciamento] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [estadoConservacao, setEstadoConservacao] = useState("");
  const [temPiscina, setTemPiscina] = useState(false);
  const [temAcademia, setTemAcademia] = useState(false);
  const [anoConstrucao, setAnoConstrucao] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");

  // --- ESTADOS DE CONTROLE ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [valorAluguelEstimado, setValorAluguelEstimado] = useState<
    string | null
  >(null);
  const [erroCalculadora, setErroCalculadora] = useState<string | null>(null);

  // --- ESTADOS PARA DADOS DO FIREBASE ---
  const [parametrosDb, setParametrosDb] = useState<ParametroBairro[]>([]);
  // Removi imoveisDb pois não está sendo usado
  const [loadingParametros, setLoadingParametros] = useState(true);

  // --- CARREGAR DADOS DO FIREBASE ---
  useEffect(() => {
    const fetchDados = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "captacao"));
        const docsData = querySnapshot.docs.map((doc) => doc.data());

        const parametros = docsData.filter(
          (doc): doc is ParametroBairro => doc.tipoDocumento === "parametro"
        );

        setParametrosDb(parametros);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErroCalculadora(
          "Não foi possível carregar os dados para a calculadora. Tente novamente mais tarde."
        );
      } finally {
        setLoadingParametros(false);
      }
    };

    fetchDados();
  }, []);

  // --- FUNÇÃO DE CÁLCULO DA ESTIMATIVA ---
  const calculateAluguel = useCallback(() => {
    setValorAluguelEstimado(null);
    setErroCalculadora(null);

    const area = parseFloat(areaInterna);
    const areaEx = parseFloat(areaExterna || "0");
    const numQuartos = parseInt(quartos || "0");
    const numSuites = parseInt(suites || "0");
    const numVagas = parseInt(vagas || "0");

    if (!tipo || !bairro || isNaN(area) || area <= 0) {
      return;
    }

    if (loadingParametros) return;

    const cidadeReferencia = "Belo Horizonte";

    const paramsBairro = parametrosDb.find(
      (p) =>
        p.endereco.bairro.toLowerCase() === bairro.toLowerCase() &&
        p.endereco.cidade.toLowerCase() === cidadeReferencia.toLowerCase()
    );

    if (!paramsBairro) {
      setErroCalculadora(
        `Não temos dados de aluguel para o bairro '${bairro}' em ${cidadeReferencia}.`
      );
      return;
    }

    const paramsTipo = paramsBairro.tipos[tipo];
    if (!paramsTipo) {
      setErroCalculadora(
        `Não temos dados de aluguel para o tipo de imóvel '${tipo}' no bairro '${bairro}'.`
      );
      return;
    }

    const valorBase = area * paramsTipo.valor_m2_medio;
    let ajustes = 0;

    if (numQuartos > 0 && paramsTipo.ajustes_base.quartos !== undefined) {
      ajustes += numQuartos * paramsTipo.ajustes_base.quartos;
    }
    if (numSuites > 0 && paramsTipo.ajustes_base.suites !== undefined) {
      ajustes += numSuites * paramsTipo.ajustes_base.suites;
    }
    if (numVagas > 0 && paramsTipo.ajustes_base.vagas !== undefined) {
      ajustes += numVagas * paramsTipo.ajustes_base.vagas;
    }
    if (
      tipo === "casa-residencial" &&
      paramsTipo.ajustes_base.area_externa_valor_m2 !== undefined
    ) {
      ajustes += areaEx * paramsTipo.ajustes_base.area_externa_valor_m2;
    }
    if (estadoConservacao && paramsTipo.ajustes_base.estado_conservacao) {
      const fator =
        paramsTipo.ajustes_base.estado_conservacao[
          estadoConservacao as keyof typeof paramsTipo.ajustes_base.estado_conservacao
        ];
      if (fator) {
        ajustes += valorBase * fator;
      }
    }
    if (temPiscina && paramsTipo.ajustes_base.piscina !== undefined) {
      ajustes += paramsTipo.ajustes_base.piscina;
    }
    if (temAcademia && paramsTipo.ajustes_base.academia !== undefined) {
      ajustes += paramsTipo.ajustes_base.academia;
    }
    if (anoConstrucao) {
      const anoAtual = new Date().getFullYear();
      const anoConst = parseInt(anoConstrucao);
      if (!isNaN(anoConst) && anoConst > 1900 && anoConst <= anoAtual) {
        const idade = anoAtual - anoConst;
        if (idade < 5) ajustes += 0.05 * valorBase;
        else if (idade > 30) ajustes -= 0.1 * valorBase;
      }
    }

    let aluguelEstimado = valorBase + ajustes;
    if (aluguelEstimado < 0) aluguelEstimado = 0;

    const margemErro = 0.1;
    const valorMin = aluguelEstimado * (1 - margemErro);
    const valorMax = aluguelEstimado * (1 + margemErro);

    setValorAluguelEstimado(
      `R$ ${valorMin.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} a R$ ${valorMax.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    );
  }, [
    tipo,
    bairro,
    areaInterna,
    areaExterna,
    quartos,
    suites,
    vagas,
    estadoConservacao,
    temPiscina,
    temAcademia,
    anoConstrucao,
    parametrosDb,
    loadingParametros,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateAluguel();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [calculateAluguel]);

  // --- ENVIO DO FORMULÁRIO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const captacaoRef = collection(db, "captacao");
      const q = query(captacaoRef, orderBy("id", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      let lastNum = 0;
      querySnapshot.forEach((doc) => {
        const idStr = doc.data().id as string;
        const num = parseInt(idStr.split("-")[1]);
        if (!isNaN(num) && num > lastNum) lastNum = num;
      });

      const newNum = lastNum + 1;
      const newId = `cap-${newNum.toString().padStart(2, "0")}`;

      const dataToSave: DadosCaptacaoImovel = {
        tipoDocumento: "imovel",
        id: newId,
        dadosPessoais: {
          nome,
          telefone,
          email,
        },
        finalidade,
        tipo,
        tipoTexto,
        destinacao,
        valor: valor ? parseFloat(valor) : null,
        valorCondominio: valorCondominio ? parseFloat(valorCondominio) : null,
        valorIptu: valorIptu ? parseFloat(valorIptu) : null,
        areaInterna: areaInterna ? parseFloat(areaInterna) : null,
        areaExterna: areaExterna ? parseFloat(areaExterna) : null,
        areaLote: areaLote ? parseFloat(areaLote) : null,
        andar,
        quartos: quartos ? parseInt(quartos) : null,
        suites: suites ? parseInt(suites) : null,
        banheiros: banheiros ? parseInt(banheiros) : null,
        vagas: vagas ? parseInt(vagas) : null,
        aceitaPermuta,
        aceitaFinanciamento,
        ocupado,
        estadoConservacao: estadoConservacao || undefined,
        anoConstrucao: anoConstrucao ? parseInt(anoConstrucao) : null,
        temPiscina,
        temAcademia,
        endereco: {
          cep,
          endereco,
          numero,
          bairro,
          complemento,
          cidade,
        },
        criadoEm: Timestamp.now(),
      };

      await setDoc(doc(db, "captacao", newId), dataToSave);

      setSubmitSuccess(true);
      // Limpar formulário
      setNome("");
      setTelefone("");
      setEmail("");
      setFinalidade("");
      setTipo("");
      setTipoTexto("");
      setDestinacao("");
      setValor("");
      setValorCondominio("");
      setValorIptu("");
      setAreaInterna("");
      setAreaExterna("");
      setAreaLote("");
      setAndar("");
      setQuartos("");
      setSuites("");
      setBanheiros("");
      setVagas("");
      setAceitaPermuta(false);
      setAceitaFinanciamento(false);
      setOcupado(false);
      setEstadoConservacao("");
      setTemPiscina(false);
      setTemAcademia(false);
      setAnoConstrucao("");
      setCep("");
      setEndereco("");
      setNumero("");
      setBairro("");
      setComplemento("");
      setCidade("");
      setValorAluguelEstimado(null);
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
      setSubmitError("Erro ao salvar imóvel. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZAÇÃO ---
  return (
    <main className="bg-gray-50 min-h-screen py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full">
          {/* Coluna Esquerda: Benefícios */}
          <div className="flex flex-col justify-start h-full">
            <h2 className="text-5xl font-extrabold text-gray-800 mb-4 leading-tight">
              Ajudamos você a vender seu imóvel de forma rápida e fácil
            </h2>
            <p className="text-xl text-gray-500 mb-10">
              Publique nos portais do mercado imobiliário.
            </p>
            <div className="space-y-8 mb-16">
              {[
                "Preencha o formulário com as informações do seu imóvel.",
                "Seu contato e as informações serão direcionados para um captador especialista da nossa imobiliária.",
                "Nosso captador fará contato para agendar a visita de avaliação do seu imóvel e da documentação imobiliária.",
              ].map((txt, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="text-4xl font-extrabold text-blue-600 mr-6">{`0${
                    idx + 1
                  }`}</span>
                  <p className="text-lg text-gray-700">{txt}</p>
                </div>
              ))}
            </div>
            <hr className="my-8" />
            <h2 className="text-2xl font-bold text-gray-800 mb-8">
              Benefícios que oferecemos para você
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-100 mb-4">
                  <Award size={44} className="text-blue-600" />
                </div>
                <p className="text-base text-gray-600 text-center">
                  Qualidade no atendimento com cliente em potencial
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-100 mb-4">
                  <TrendingUp size={44} className="text-blue-600" />
                </div>
                <p className="text-base text-gray-600 text-center">
                  Aumento em suas vendas com a melhor segmentação
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-100 mb-4">
                  <Megaphone size={44} className="text-blue-600" />
                </div>
                <p className="text-base text-gray-600 text-center">
                  Maior visibilidade em seus anúncios
                </p>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Formulário */}
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full mx-auto flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              Preencha o formulário e anuncie seu imóvel conosco!
            </h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Dados Pessoais */}
              <fieldset>
                <legend className="text-lg font-semibold text-gray-700 mb-3">
                  Dados Pessoais
                </legend>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    className={inputClass}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    placeholder="*TELEFONE"
                    className={inputClass}
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    placeholder="E-MAIL"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </fieldset>
              <hr className="my-8 border-t border-gray-200" />

              {/* Dados do Imóvel */}
              <fieldset>
                <legend className="text-lg font-semibold text-gray-700 mb-3">
                  Dados do Imóvel
                </legend>

                <div className="mb-4">
                  <select
                    className={inputClass}
                    value={finalidade}
                    onChange={(e) => setFinalidade(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      *Selecione a finalidade
                    </option>
                    <option value="vender">Alugar/Vender</option>
                    <option value="alugar">Alugar</option>
                  </select>
                </div>

                <div className="mb-4">
                  <select
                    className={inputClass}
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione o tipo
                    </option>
                    <option value="apartamento">Apartamento</option>
                    <option value="apto-area-privativa">
                      Apto Área Privativa
                    </option>
                    <option value="casa-condominio">Casa Condomínio</option>
                    <option value="casa-residencial">Casa Residencial</option>
                    <option value="cobertura">Cobertura</option>
                    <option value="hotel">Flat/Hotel/Apart</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <select
                    className={inputClass}
                    value={destinacao}
                    onChange={(e) => setDestinacao(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Destinação
                    </option>
                    <option value="residencial">Residencial</option>
                    <option value="comercial">Comercial</option>
                    <option value="residencial-comercial">
                      Residencial e Comercial
                    </option>
                  </select>
                  <input
                    type="number"
                    placeholder="Valor de Venda (se aplicável)"
                    className={inputClass}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Valor do Condomínio"
                    className={inputClass}
                    value={valorCondominio}
                    onChange={(e) => setValorCondominio(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Valor do IPTU"
                    className={inputClass}
                    value={valorIptu}
                    onChange={(e) => setValorIptu(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Área interna (m²)"
                    className={inputClass}
                    value={areaInterna}
                    onChange={(e) => setAreaInterna(e.target.value)}
                    required
                  />
                  {tipo === "casa-residencial" && (
                    <input
                      type="number"
                      placeholder="Área externa (m²)"
                      className={inputClass}
                      value={areaExterna}
                      onChange={(e) => setAreaExterna(e.target.value)}
                    />
                  )}
                  {tipo !== "casa-residencial" && <div></div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Área Lote"
                    className={inputClass}
                    value={areaLote}
                    onChange={(e) => setAreaLote(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Andar (se apartamento)"
                    className={inputClass}
                    value={andar}
                    onChange={(e) => setAndar(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Quartos"
                    className={inputClass}
                    value={quartos}
                    onChange={(e) => setQuartos(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Suítes"
                    className={inputClass}
                    value={suites}
                    onChange={(e) => setSuites(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Banheiros"
                    className={inputClass}
                    value={banheiros}
                    onChange={(e) => setBanheiros(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Vagas de Garagem"
                    className={inputClass}
                    value={vagas}
                    onChange={(e) => setVagas(e.target.value)}
                  />
                </div>

                {/* Campos da calculadora */}
                <div className="mb-4">
                  <select
                    className={inputClass}
                    value={estadoConservacao}
                    onChange={(e) => setEstadoConservacao(e.target.value)}
                  >
                    <option value="">Estado de Conservação</option>
                    <option value="excelente">Excelente</option>
                    <option value="bom">Bom</option>
                    <option value="regular">Regular</option>
                    <option value="reformar">Precisa de Reforma</option>
                  </select>
                </div>

                <div className="mb-4">
                  <input
                    type="number"
                    placeholder="Ano de Construção (Ex: 2010)"
                    className={inputClass}
                    value={anoConstrucao}
                    onChange={(e) => setAnoConstrucao(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear().toString()}
                  />
                </div>

                {tipo === "apartamento" && (
                  <div className="flex flex-wrap gap-6 mt-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={temPiscina}
                        onChange={(e) => setTemPiscina(e.target.checked)}
                      />
                      <span className="text-gray-700">
                        Tem Piscina no Condomínio
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={temAcademia}
                        onChange={(e) => setTemAcademia(e.target.checked)}
                      />
                      <span className="text-gray-700">
                        Tem Academia no Condomínio
                      </span>
                    </label>
                  </div>
                )}
              </fieldset>
              <hr className="my-8 border-t border-gray-200" />

              {/* Estimativa de Aluguel */}
              {(valorAluguelEstimado || erroCalculadora) && (
                <div className="bg-blue-50 p-6 rounded-lg mb-6 text-center">
                  <h3 className="text-xl font-bold text-blue-800 mb-4">
                    Estimativa de Aluguel
                  </h3>
                  {loadingParametros ? (
                    <p className="text-gray-600">
                      Carregando dados para o cálculo...
                    </p>
                  ) : erroCalculadora ? (
                    <p className="text-red-600">{erroCalculadora}</p>
                  ) : (
                    valorAluguelEstimado && (
                      <>
                        <p className="text-lg font-semibold text-blue-800">
                          Valor de Aluguel Estimado:
                        </p>
                        <p className="text-4xl font-bold text-blue-600 mt-2">
                          {valorAluguelEstimado}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Esta é uma estimativa com base em dados de mercado. O
                          valor final pode variar. Para uma avaliação precisa,
                          entre em contato conosco.
                        </p>
                      </>
                    )
                  )}
                </div>
              )}
              <hr className="my-8 border-t border-gray-200" />

              {/* Condições do Imóvel */}
              <fieldset>
                <legend className="text-lg font-semibold text-gray-700 mb-3">
                  Condições do Imóvel
                </legend>
                <div className="flex flex-wrap gap-6 mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={aceitaPermuta}
                      onChange={(e) => setAceitaPermuta(e.target.checked)}
                    />
                    <span className="text-gray-700">Aceita Permuta</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={aceitaFinanciamento}
                      onChange={(e) => setAceitaFinanciamento(e.target.checked)}
                    />
                    <span className="text-gray-700">Aceita Financiamento</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={ocupado}
                      onChange={(e) => setOcupado(e.target.checked)}
                    />
                    <span className="text-gray-700">Imóvel Ocupado</span>
                  </label>
                </div>
              </fieldset>
              <hr className="my-8 border-t border-gray-200" />

              {/* Endereço */}
              <fieldset>
                <legend className="text-lg font-semibold text-gray-700 mb-3">
                  Endereço
                </legend>

                <div className="grid grid-cols-6 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="CEP"
                    className="col-span-2 bg-white border border-gray-200 rounded-lg h-14 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Endereço"
                    className="col-span-3 bg-white border border-gray-200 rounded-lg h-14 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Número"
                    className="col-span-1 bg-white border border-gray-200 rounded-lg h-14 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Bairro"
                    className="col-span-1 bg-white border border-gray-200 rounded-lg h-14 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Complemento"
                    className="col-span-1 bg-white border border-gray-200 rounded-lg h-14 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Cidade"
                    className="col-span-1 bg-white border border-gray-200 rounded-lg h-14 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </div>
              </fieldset>

              {/* Submissão */}
              <div className="border-t pt-6">
                {submitError && (
                  <p className="text-red-600 mb-4 text-center">{submitError}</p>
                )}
                {submitSuccess && (
                  <p className="text-green-600 mb-4 text-center">
                    Imóvel cadastrado com sucesso!
                  </p>
                )}
                <p className="text-xs text-gray-500 mb-4 text-center">
                  Ao informar meus dados, eu concordo com a{" "}
                  <Link href="/politica-de-privacidade" className="underline">
                    Política de Privacidade
                  </Link>
                  .
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors text-lg tracking-wider disabled:opacity-50"
                >
                  {isSubmitting ? "Enviando..." : "ANUNCIAR IMÓVEL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
