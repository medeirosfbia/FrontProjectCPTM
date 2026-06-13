export const EFLUENTE_DETAILS_SECTIONS = [
  {
    title: 'Premissas Institucionais',
    fields: [
      { key: 'txNomePjDaContratada', label: 'Nome (Pesso Jurídica) da Contratada' },
      { key: 'txNrContratoContratada', label: 'Nº do Contrato (da Contratada)' },
      { key: 'txNmLocalEscopoContratual', label: 'Local do Escopo Contratual (Pseudônimo)' },
      { key: 'txNomePfDaRepresentante', label: 'Representante (PF) da Contratada e/ou Área Gestora da CPTM' },
      { key: 'txSiglaDeptoMeioAmbiente', label: 'Sigla da Área de Meio Ambiente' },
      { key: 'txNmAreaGestoraCptm', label: 'Nome da Área Gestora CPTM' },
      { key: 'txIdAreaGestoraCptm', label: 'Indentificador da Área Gestora CPTM' },
      { key: 'txSiglaAreaGestoraCptm', label: 'Sigla da Área Gestora CPTM' },
      { key: 'txNomePjDaSupervisora', label: 'Nome (PJ) da Supervisora Ambiental' },
      { key: 'txNomePjExecutora', label: 'Nome da Empresa Executora' },
      { key: 'txNrContratoSupervisora', label: 'Nº do Contrato (da Supervisora)' }
    ]
  },
  {
    title: 'Identificação do Cadastrador',
    fields: [
      { key: 'txAutorPjDoCadastro', label: 'Autor(a) (PJ) do Cadastramento' },
      { key: 'txAutorPfDoCadastro', label: 'Autor(a) (PF) do Cadastramento' },
      { key: 'txNmResponsavelCadastro', label: 'Responsável Técnico - RT pelo Cadastramento' },
      { key: 'txRpResponsavelCadastro', label: 'Registro Profissional (do RT)' },
      { key: 'txDrtResponsavelCadastro', label: 'Documento de Responsabilidade Técnica (do RT)' }
    ]
  },
  {
    title: 'Identificação do Formulário',
    fields: [
      { key: 'txNaturezaDoPga', label: 'Natureza (do PGA)' },
      { key: 'txTipoDeFormulario', label: 'Tipo de Formulário' },
      { key: 'dtDataEmissaoFormulario', label: 'Data de Emissão do Formulário', type: 'date' },
      { key: 'nrNumeroDeFormulario', label: 'Número do Formulário' },
      { key: 'txAutorPfDoFormulario', label: 'Autor(a) (Pessoa Física) do Formulário' },
      { key: 'txNmArquivoFdcRelacionado', label: 'Nome do arquivo FDC relacionado' },
      { key: 'pkCdArquivoFdcRelacionado', label: 'Código do arquivo FDC relacionado' },
      { key: 'txNmArquivoRvtRelacionado', label: 'Nome do arquivo RVT relacionado' },
      { key: 'pkCdElementoDeMonitorRvt', label: 'Código do E.M. no RVT relacionado' },
      { key: 'txNmArquivoDacRelacionado', label: 'Nome do arquivo DAC relacionado' },
      { key: 'pkCdElementoDeMonitorDac', label: 'Código do E.M. na DAC relacionada' },
      { key: 'txNmArquivoCncRelacionado', label: 'Nome do arquivo CNC relacionado' },
      { key: 'pkCdElementoDeMonitorCnc', label: 'Código do E.M. na CNC relacionada' },
      { key: 'pkCdCodigoNoUltimoRra', label: 'Chave Primária no último RRA' },
      { key: 'pkCdCedoc', label: 'Chave Primária - Centro de Documentação' }
    ]
  },
  {
    title: 'Data e Hora',
    fields: [
      { key: 'dtDataDoCadastramento', label: 'Data do Cadastramento', type: 'date' },
      { key: 'hrHoraDoCadastramento', label: 'Hora do Cadastramento' }
    ]
  },
  {
    title: 'Identificação do Efluente',
    fields: [
      { key: 'pkCdMeioAmbienteCptm', label: 'Chave Primária - Meio Ambiente' },
      { key: 'txNrElementoMonitoramento', label: 'Elemento de Monitoramento - Número' },
      { key: 'txNmElementoMonitoramento', label: 'Elemento de Monitoramento - Nome' },
      { key: 'txStatusDoRegistroNoBd', label: 'Status' }
    ]
  },
  {
    title: 'Localização',
    fields: [
      { key: 'txMunicipio', label: 'Nome de Município' },
      { key: 'txLinhaCptm', label: 'Nome da Linha CPTM' },
      { key: 'txEstacaoCptm', label: 'Nome da Estação CPTM' },
      { key: 'txViaCptm', label: 'Número da Via da Linha CPTM' },
      { key: 'txTrechoESentidoCptm', label: 'Trecho e Sentido da Linha CPTM' },
      { key: 'txKmPoste', label: 'Número do Quilômetro e Poste' },
      { key: 'nrLatGrauDecimalWgs84', label: 'Latitude em Graus (Datum: WGS84)' },
      { key: 'nrLongGrauDecimalWgs84', label: 'Longitude em Graus (Datum: WGS84)' },
      { key: 'nrLatMetrosSirgas2000', label: 'Latitude em Metros (Datum: SIRGAS2000)' },
      { key: 'nrLongMetrosSirgas2000', label: 'Longitude em Metros (Datum: SIRGAS2000)' }
    ]
  },
  {
    title: 'Regulamentação Ambiental',
    fields: [
      { key: 'txTipoAtividadeListada', label: 'Tipo de Atividade (Listada)' },
      { key: 'txTipoAtividadeNListada', label: 'Tipo de Atividade (Não Listada)' },
      { key: 'txTipoDraListado', label: 'Tipo de DRA (Listado)' },
      { key: 'txTipoDraNListado', label: 'Tipo de DRA (Não Listado)' },
      { key: 'txIdDra', label: 'Código Identificador do DRA' },
      { key: 'dtValidadeDra', label: 'Data de Validade do DRA', type: 'date' },
      { key: 'txAnaliseCptmAprovacao', label: 'Análise CPTM para Aprovação' },
      { key: 'txOfereceRiscoSistemaCptm', label: 'Oferece Risco ao Sistema CPTM' }
    ]
  },
  {
    title: 'Caracterização',
    fields: [
      { key: 'txTipoAtividadeCptm', label: 'Tipo de Atividade na CPTM' },
      { key: 'txNmLocalAtiv', label: 'Nome Edificação/Local da CPTM' },
      { key: 'txNmLocalAtivComplemento', label: 'Nome Edificação/Local (Complemento)' },
      { key: 'txOrigemEfluente', label: 'Origem do Efluente' },
      { key: 'txFonteGeradora', label: 'Fonte Geradora do Efluente' }
    ]
  },
  {
    title: 'Detalhamento',
    fields: [
      { key: 'nrQuantidadeL', label: 'Quantidade (Litros)' },
      { key: 'txTipoDestinacao', label: 'Tipo de Destinação do Efluente' },
      { key: 'txTipoVeiculo', label: 'Tipo de Veículo' },
      { key: 'txIdVeiculo', label: 'Identificador/Placa do Veículo' },
      { key: 'txIdGuiaRemessa', label: 'Código Identificador da Guia de Remessa' },
      { key: 'nrDistanciaDaViaM', label: 'Distância da Via CPTM (Metros)' },
      { key: 'txObsCadastramento', label: 'Obsevações Gerais: Cadastramento' }
    ]
  }
]
