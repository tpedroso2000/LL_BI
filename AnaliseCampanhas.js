import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import './AnaliseCampanhas.css';

// Definição dos canais – os IDs devem corresponder aos sufixos das colunas na sua view
const canais = [
  { id: 'balcao',   label: 'Balcão',   color: '#4F81BD' },
  { id: 'mesa',     label: 'Mesa',     color: '#70AD47' },
  { id: 'telefone', label: 'Telefone', color: '#FBBC04' },
  { id: 'olga',     label: 'Olga',     color: '#FF9900' },
  { id: 'ifood',    label: 'iFood',    color: '#FF0000' },
];

// Array de meses para os filtros e para o gráfico de linhas (sempre todos)
const MESES = [
  { num: 1,  label: 'Janeiro' },
  { num: 2,  label: 'Fevereiro' },
  { num: 3,  label: 'Março' },
  { num: 4,  label: 'Abril' },
  { num: 5,  label: 'Maio' },
  { num: 6,  label: 'Junho' },
  { num: 7,  label: 'Julho' },
  { num: 8,  label: 'Agosto' },
  { num: 9,  label: 'Setembro' },
  { num: 10, label: 'Outubro' },
  { num: 11, label: 'Novembro' },
  { num: 12, label: 'Dezembro' },
];

// Array de nomes dos meses para a tabela
const NOME_MESES = [
  'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
];

/* Função customizada para exibir o label do PieChart fora da fatia */
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const labelRadius = outerRadius + 20; // 20px fora da fatia
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
  return (
    <text 
      x={x} 
      y={y} 
      fill="black" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
    >
      {(percent * 100).toFixed(1)}%
    </text>
  );
};

/* Custom Tooltip para o gráfico de linhas */
const CustomTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length > 0) {
    const dataPoint = payload[0].payload;
    const formattedValue = metric === 'tickets'
      ? dataPoint.value.toLocaleString('pt-BR')
      : dataPoint.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        <p className="intro">Value: {formattedValue}</p>
        {dataPoint.variation !== null && (
          <p className="desc">
            Var: {dataPoint.variation >= 0 ? '+' : ''}{dataPoint.variation.toFixed(1)}%
          </p>
        )}
      </div>
    );
  }
  return null;
};

/* Custom Tooltip para os gráficos de barras */
function ComparisonTooltip({ active, payload, metric }) {
  if (active && payload && payload.length === 2) {
    const [bar1, bar2] = payload;
    const label1 = bar1.name;
    const label2 = bar2.name;
    const val1 = bar1.value;
    const val2 = bar2.value;
    let varPct = null;
    if (val2 !== 0) {
      varPct = ((val1 - val2) / val2) * 100;
    }
    const formattedVal1 = metric === 'tickets'
      ? val1.toLocaleString('pt-BR')
      : val1.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedVal2 = metric === 'tickets'
      ? val2.toLocaleString('pt-BR')
      : val2.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: 10, borderRadius: 4 }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{bar1.payload.metric}</p>
        <p style={{ margin: 0 }}>
          {label1}: {formattedVal1}
        </p>
        <p style={{ margin: 0 }}>
          {label2}: {formattedVal2}
        </p>
        {varPct !== null && (
          <p style={{ margin: 0 }}>
            Variação: {varPct >= 0 ? '+' : ''}{varPct.toFixed(1)}%
          </p>
        )}
      </div>
    );
  }
  return null;
}

function AnaliseCampanhas() {
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("vendas");

  const fetchCampaignData = async () => {
    const [res2025, res2024] = await Promise.all([
      fetch('http://localhost:3000/api/analise_campanhas'),
      fetch('http://localhost:3000/api/analise_campanhas_2024')
    ]);
    if (!res2025.ok || !res2024.ok) {
      throw new Error("Erro na requisição dos dados");
    }
    const json2025 = await res2025.json();
    const json2024 = await res2024.json();
    return { dados2025: json2025.data, dados2024: json2024.data };
  };

  const { data: campaignData, isLoading, error } = useQuery({
    queryKey: ['campaignData'],
    queryFn: fetchCampaignData,
    staleTime: 300000,
  });

  const dados = campaignData?.dados2025 || [];
  const dados2024 = campaignData?.dados2024 || [];
  const ano = dados[0]?.ano || '----';

  const getUltimaDataRegistro = (dataArr) => {
    if (!dataArr || dataArr.length === 0) return null;
    const maxDate = dataArr.reduce((acc, item) => {
      const dt = new Date(item.ultimo_registro_mes);
      return dt > acc ? dt : acc;
    }, new Date(0));
    return maxDate.getTime() === 0 ? null : maxDate;
  };

  const ultimaData = getUltimaDataRegistro(dados);

  const getMonthsToUse = useCallback(() => {
    return selectedMonths.length ? selectedMonths : MESES.map(m => m.num);
  }, [selectedMonths]);

  const getChannelsToUse = useCallback(() => {
    return selectedChannels.length ? selectedChannels : canais.map(c => c.id);
  }, [selectedChannels]);

  function hasTaxService(canalId) {
    return ['telefone', 'olga', 'ifood'].includes(canalId);
  }
  function linesCount(canalId) {
    return hasTaxService(canalId) ? 5 : 4;
  }
  const getValor = useCallback((mes, canal, tipo) => {
    const row = dados.find(item => item.mes === mes);
    return row ? Number(row[`${tipo}_${canal}`]) || 0 : 0;
  }, [dados]);

  const getVariation = useCallback((mes, canal, tipo) => {
    if (mes === 1) return null;
    const atual = getValor(mes, canal, tipo);
    const anterior = getValor(mes - 1, canal, tipo);
    return anterior === 0 ? null : ((atual - anterior) / anterior) * 100;
  }, [getValor]);

  function getTotalAnual(canal, tipo) {
    return MESES.reduce((acc, m) => acc + getValor(m.num, canal, tipo), 0);
  }
  function fmtMoeda(num) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(num);
  }
  function fmtPct(num) {
    if (num === null) return '';
    return (num >= 0 ? '+' : '') + num.toFixed(1) + '%';
  }
  function getVarClass(varPct, baseClass) {
    return varPct < 0 ? `${baseClass} negative` : baseClass;
  }

  // Cálculo do total para um registro
  const getTotalMetric = useCallback((rec, metric) => {
    if (!rec) return 0;
    const channelsToUse = getChannelsToUse();
    if (metric === 'ticket_medio') {
      let totalVendas = 0, totalTickets = 0;
      channelsToUse.forEach(channel => {
        totalVendas += Number(rec[`vendas_${channel}`]) || 0;
        totalTickets += Number(rec[`tickets_${channel}`]) || 0;
      });
      return totalTickets > 0 ? totalVendas / totalTickets : 0;
    }
    let total = 0;
    channelsToUse.forEach(channel => {
      total += Number(rec[`${metric}_${channel}`]) || 0;
    });
    return total;
  }, [getChannelsToUse]);

  const projectMetric = useCallback((rec, metric) => {
    if (!rec) return 0;
    const recordedDays = new Date(rec.ultimo_registro_mes).getDate();
    const totalDays = new Date(rec.ano, rec.mes, 0).getDate();
    const total = getTotalMetric(rec, metric);
    const projected = recordedDays === 0 ? 0 : (total / recordedDays) * totalDays;
    // Para "tickets", arredondamos para inteiro.
    return metric === 'tickets' ? Math.round(projected) : projected;
  }, [getTotalMetric]);

  // Gráfico de linhas (usa todos os meses)
  const chartData = useMemo(() => {
    const channelsToUse = getChannelsToUse();
    const data = MESES.map(m => {
      let metricValue = 0;
      channelsToUse.forEach(canalId => {
        if (selectedMetric === 'vendas') {
          metricValue += getValor(m.num, canalId, 'vendas');
        } else if (selectedMetric === 'tickets') {
          metricValue += getValor(m.num, canalId, 'tickets');
        } else if (selectedMetric === 'ticket_medio') {
          let somaVendas = 0, somaTickets = 0;
          channelsToUse.forEach(canal => {
            somaVendas += getValor(m.num, canal, 'vendas');
            somaTickets += getValor(m.num, canal, 'tickets');
          });
          metricValue = somaTickets > 0 ? somaVendas / somaTickets : 0;
        }
      });
      return { name: m.label, value: metricValue, num: m.num };
    });
    return data.map((d, index) => {
      if (index === 0) return { ...d, variation: null };
      const prev = data[index - 1];
      const variation = prev.value === 0 ? null : ((d.value - prev.value) / prev.value) * 100;
      return { ...d, variation };
    });
  }, [MESES, getChannelsToUse, selectedMetric, getValor]);

  // PieChart e KPIs usam os meses filtrados
  const pieData = useMemo(() => {
    const mesesSelecionados = getMonthsToUse();
    if (!mesesSelecionados.length) return [];
    const data = canais.map(canal => {
      let revenue = 0;
      mesesSelecionados.forEach(mNum => {
        revenue += getValor(mNum, canal.id, 'vendas');
      });
      return { channel: canal.label, revenue };
    });
    const totalRevenue = data.reduce((acc, cur) => acc + cur.revenue, 0);
    return data.map(item => ({
      channel: item.channel,
      revenue: item.revenue,
      percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
    }));
  }, [canais, getMonthsToUse, getValor]);

  const kpis = useMemo(() => {
    const mesesSelecionados = getMonthsToUse();
    const channelsToUse = getChannelsToUse();
    if (!mesesSelecionados.length || !channelsToUse.length) {
      return { totalVendas: 0, totalTickets: 0, ticket_medio: 0 };
    }
    let somaVendas = 0, somaTickets = 0;
    mesesSelecionados.forEach(mNum => {
      channelsToUse.forEach(canalId => {
        somaVendas += getValor(mNum, canalId, 'vendas');
        somaTickets += getValor(mNum, canalId, 'tickets');
      });
    });
    return {
      totalVendas: somaVendas,
      totalTickets: somaTickets,
      ticket_medio: somaTickets > 0 ? somaVendas / somaTickets : 0
    };
  }, [getMonthsToUse, getChannelsToUse, getValor]);

  const currentMonth = new Date().getMonth() + 1;
  const recCurrent = dados.find(item => item.mes === currentMonth);
  const recPrevious = dados.find(item => item.mes === currentMonth - 1);
  const recSameMonth2024 = dados2024.find(item => item.mes === currentMonth);

  const barDataYearComparison = useMemo(() => {
    if (!recCurrent || !recSameMonth2024) return [];
    return [{
      metric: selectedMetric === 'vendas'
        ? 'Vendas'
        : selectedMetric === 'tickets'
          ? 'Tickets'
          : 'Ticket Médio',
      Atual: projectMetric(recCurrent, selectedMetric),
      AnoAnterior: projectMetric(recSameMonth2024, selectedMetric)
    }];
  }, [recCurrent, recSameMonth2024, selectedMetric, projectMetric]);

  const barDataMonthComparison = useMemo(() => {
    if (!recCurrent || !recPrevious) return [];
    return [{
      metric: selectedMetric === 'vendas'
        ? 'Vendas'
        : selectedMetric === 'tickets'
          ? 'Tickets'
          : 'Ticket Médio',
      Atual: projectMetric(recCurrent, selectedMetric),
      Anterior: projectMetric(recPrevious, selectedMetric)
    }];
  }, [recCurrent, recPrevious, selectedMetric, projectMetric]);

  const yAxisTickFormatter = value => value.toLocaleString('pt-BR');
  const tooltipFormatter = value => value.toLocaleString('pt-BR');

  // Handlers
  function handleToggleMonth(mNum) {
    setSelectedMonths(prev =>
      prev.includes(mNum) ? prev.filter(num => num !== mNum) : [...prev, mNum]
    );
  }
  function handleToggleChannel(canalId) {
    setSelectedChannels(prev =>
      prev.includes(canalId) ? prev.filter(id => id !== canalId) : [...prev, canalId]
    );
  }
  function handleSelectMetric(metric) {
    setSelectedMetric(metric);
  }
  function getKpiReviewSubtitle() {
    const mesesSelecionados = getMonthsToUse();
    const monthsLabels = mesesSelecionados.map(mNum => {
      const monthInfo = MESES.find(m => m.num === mNum);
      return monthInfo ? monthInfo.label : `Mês ${mNum}`;
    });
    const metricLabel = selectedMetric === 'vendas'
      ? 'Vendas'
      : selectedMetric === 'tickets'
        ? 'Tickets'
        : 'Ticket Médio';
    return `for transactions in ${monthsLabels.join(', ')} ${ano} (${metricLabel})`;
  }

  if (isLoading) return <div>Carregando dados...</div>;
  if (error) return <div>Erro ao carregar dados.</div>;

  return (
    <>
      {/* Cabeçalho */}
      {/* Cabeçalho */}
      <div className="top-red-bar">
        <img
          src="/logo contornado 1080.png"
          alt="Logo da Empresa"
          className="analise-campanhas-logo"
        />
        <div className="analise-campanhas-title-group">
          <h1 className="analise-campanhas-main-title">
            Relatório Análise de Campanhas
          </h1>
          <h2 className="analise-campanhas-year-title">{ano}</h2>
        </div>
        <div className="header-spacer"></div>
      </div>

      {/* Última carga de dados */}
      <div className="last-data-load">
        Última carga de dados: {ultimaData ? ultimaData.toLocaleDateString('pt-BR') : '---'}
      </div>

      {/* Filtros e KPI Review */}
      <div className="analise-campanhas-container">
        <div className="filtros-e-kpi-review">
          <div className="filters-section">
            <h3>Filtros</h3>
            <div className="filters-options">
              <div className="filters-group">
                <h4>Meses</h4>
                {MESES.map(m => (
                  <label key={m.num} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(m.num)}
                      onChange={() => handleToggleMonth(m.num)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
              <div className="filters-group">
                <h4>Canais</h4>
                {canais.map(c => (
                  <label key={c.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(c.id)}
                      onChange={() => handleToggleChannel(c.id)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <div className="filters-group">
                <h4>Métrica</h4>
                <select value={selectedMetric} onChange={(e) => handleSelectMetric(e.target.value)}>
                  <option value="vendas">Vendas</option>
                  <option value="tickets">Tickets</option>
                  <option value="ticket_medio">Ticket Médio</option>
                </select>
              </div>
            </div>
          </div>

          <div className="kpi-review-section">
            <h2 className="kpi-review-title">KPI review</h2>
            <div className="kpi-review-subtitle">{getKpiReviewSubtitle()}</div>
            <div className="kpi-items-row">
              <div className="kpi-item">
                <span className="kpi-item-label">Vendas</span>
                <span className="kpi-item-value">{fmtMoeda(kpis.totalVendas)}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-item-label">Tickets</span>
                <span className="kpi-item-value">{kpis.totalTickets.toLocaleString('pt-BR')}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-item-label">Ticket Médio</span>
                <span className="kpi-item-value">{fmtMoeda(kpis.ticket_medio)}</span>
              </div>
            </div>
            <div className="kpi-review-chart">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData} margin={{ left: 50, right: 20, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={yAxisTickFormatter} />
                    <Tooltip content={<CustomTooltip metric={selectedMetric} />} />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="line-chart-placeholder" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cards com os gráficos comparativos */}
      <div className="analise-campanhas-container charts-comparison-container">
        <div className="chart-card">
          <h2 className="chart-card-title">Participação no Faturamento</h2>
          <div className="chart-card-inner">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="percentage"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  labelLine
                  label={renderCustomizedLabel}
                >
                  {pieData.map((entry, index) => {
                    const canal = canais.find(c => c.label === entry.channel);
                    return (
                      <Cell key={`cell-${index}`} fill={canal ? canal.color : '#000'} />
                    );
                  })}
                </Pie>
                <Tooltip formatter={value => value.toFixed(1) + '%'} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h2 className="chart-card-title">Atual vs. Mesmo Mês (Ano Anterior)</h2>
          <div className="chart-card-inner">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barDataYearComparison}
                margin={{ top: 20, right: 20, left: 50, bottom: 20 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis tickFormatter={yAxisTickFormatter} />
                <Tooltip content={<ComparisonTooltip metric={selectedMetric} />} />
                <Legend />
                <Bar dataKey="Atual" name="Atual" fill="#8884d8" barSize={30} />
                <Bar dataKey="AnoAnterior" name="Ano Anterior" fill="#82ca9d" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h2 className="chart-card-title">Atual vs. Mês Anterior</h2>
          <div className="chart-card-inner">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barDataMonthComparison}
                margin={{ top: 20, right: 20, left: 50, bottom: 20 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis tickFormatter={yAxisTickFormatter} />
                <Tooltip content={<ComparisonTooltip metric={selectedMetric} />} />
                <Legend />
                <Bar dataKey="Atual" name="Atual" fill="#8884d8" barSize={30} />
                <Bar dataKey="Anterior" name="Mês Anterior" fill="#82ca9d" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela do Relatório */}
      <div className="analise-campanhas-container section-spacing">
        <table className="analise-campanhas-table">
          <thead>
            <tr className="cabecalho">
              <th className="analise-campanhas-th">Canal</th>
              <th className="analise-campanhas-th metrica-col">Métrica</th>
              {MESES.map((m, i) => (
                <React.Fragment key={m.num}>
                  <th className="analise-campanhas-th-right">{NOME_MESES[i]}</th>
                  <th className="analise-campanhas-th-right">%</th>
                </React.Fragment>
              ))}
              <th className="analise-campanhas-th-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {canais.map(canal => (
              <React.Fragment key={canal.id}>
                <tr>
                  <td
                    colSpan={2 + MESES.length * 2 + 1}
                    className="analise-campanhas-faixa-canal"
                    style={{ backgroundColor: canal.color }}
                  />
                </tr>
                <tr style={{ backgroundColor: canal.color, color: '#fff' }}>
                  <td rowSpan={linesCount(canal.id)} className="analise-campanhas-canal-label">
                    {canal.label.toUpperCase()}
                  </td>
                  <td className="analise-campanhas-metrica-label">Vendas</td>
                  {MESES.map(m => {
                    const valor = getValor(m.num, canal.id, 'vendas');
                    const varPct = getVariation(m.num, canal.id, 'vendas');
                    return (
                      <React.Fragment key={m.num}>
                        <td className="analise-campanhas-celula-valor">{fmtMoeda(valor)}</td>
                        <td className={getVarClass(varPct, 'analise-campanhas-celula-var')}>{fmtPct(varPct)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="analise-campanhas-celula-valor analise-campanhas-total">
                    {fmtMoeda(getTotalAnual(canal.id, 'vendas'))}
                  </td>
                </tr>
                <tr style={{ backgroundColor: canal.color, color: '#fff' }}>
                  <td className="analise-campanhas-metrica-label">Tickets</td>
                  {MESES.map(m => {
                    const valor = getValor(m.num, canal.id, 'tickets');
                    const varPct = getVariation(m.num, canal.id, 'tickets');
                    return (
                      <React.Fragment key={m.num}>
                        <td className="analise-campanhas-celula-valor">{valor.toLocaleString('pt-BR')}</td>
                        <td className={getVarClass(varPct, 'analise-campanhas-celula-var')}>{fmtPct(varPct)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="analise-campanhas-celula-valor analise-campanhas-total">
                    {getTotalAnual(canal.id, 'tickets').toLocaleString('pt-BR')}
                  </td>
                </tr>
                <tr style={{ backgroundColor: canal.color, color: '#fff' }}>
                  <td className="analise-campanhas-metrica-label">Ticket Médio</td>
                  {MESES.map(m => {
                    const t = getValor(m.num, canal.id, 'tickets');
                    const v = getValor(m.num, canal.id, 'vendas');
                    const tm = t > 0 ? v / t : 0;
                    let varPct = null;
                    if (m.num > 1) {
                      const tAnt = getValor(m.num - 1, canal.id, 'tickets');
                      const vAnt = getValor(m.num - 1, canal.id, 'vendas');
                      const tmAnt = tAnt > 0 ? vAnt / tAnt : 0;
                      varPct = tmAnt === 0 ? null : ((tm - tmAnt) / tmAnt) * 100;
                    }
                    return (
                      <React.Fragment key={m.num}>
                        <td className="analise-campanhas-celula-valor">{fmtMoeda(tm)}</td>
                        <td className={getVarClass(varPct, 'analise-campanhas-celula-var')}>{fmtPct(varPct)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="analise-campanhas-celula-valor analise-campanhas-total">
                    {(() => {
                      const totalT = getTotalAnual(canal.id, 'tickets');
                      const totalV = getTotalAnual(canal.id, 'vendas');
                      const tmAnual = totalT > 0 ? totalV / totalT : 0;
                      return fmtMoeda(tmAnual);
                    })()}
                  </td>
                </tr>
                {['telefone', 'olga', 'ifood'].includes(canal.id) && (
                  <tr style={{ backgroundColor: canal.color, color: '#fff' }}>
                    <td className="analise-campanhas-metrica-label">Tx Serviço</td>
                    {MESES.map(m => {
                      const valor = getValor(m.num, canal.id, 'txserv');
                      const varPct = getVariation(m.num, canal.id, 'txserv');
                      return (
                        <React.Fragment key={m.num}>
                          <td className="analise-campanhas-celula-valor">{valor ? fmtMoeda(valor) : '-'}</td>
                          <td className={getVarClass(valor ? varPct : null, 'analise-campanhas-celula-var')}>
                            {valor ? fmtPct(varPct) : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="analise-campanhas-celula-valor analise-campanhas-total">
                      {fmtMoeda(MESES.reduce((acc, mm) => acc + getValor(mm.num, canal.id, 'txserv'), 0))}
                    </td>
                  </tr>
                )}
                <tr className="analise-campanhas-linha-total">
                  <td className="analise-campanhas-metrica-label">Total</td>
                  {MESES.map(m => {
                    const totalMes = hasTaxService(canal.id)
                      ? getValor(m.num, canal.id, 'vendas') + getValor(m.num, canal.id, 'txserv')
                      : getValor(m.num, canal.id, 'vendas');
                    let varPct = null;
                    if (m.num > 1) {
                      const totalAnterior = hasTaxService(canal.id)
                        ? getValor(m.num - 1, canal.id, 'vendas') + getValor(m.num - 1, canal.id, 'txserv')
                        : getValor(m.num - 1, canal.id, 'vendas');
                      varPct = totalAnterior === 0 ? null : ((totalMes - totalAnterior) / totalAnterior) * 100;
                    }
                    return (
                      <React.Fragment key={m.num}>
                        <td className="analise-campanhas-celula-valor">{fmtMoeda(totalMes)}</td>
                        <td className={getVarClass(varPct, 'analise-campanhas-celula-var')}>{fmtPct(varPct)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="analise-campanhas-celula-valor analise-campanhas-total">
                    {fmtMoeda(MESES.reduce((acc, mm) => {
                      const vendas = getValor(mm.num, canal.id, 'vendas');
                      const txserv = hasTaxService(canal.id) ? getValor(mm.num, canal.id, 'txserv') : 0;
                      return acc + (vendas + txserv);
                    }, 0))}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default AnaliseCampanhas;
