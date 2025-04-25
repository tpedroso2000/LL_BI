import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import './AnaliseCampanhas.css';

// Constantes
const canais = [
  { id: 'balcao',   label: 'Balcão',   color: '#4F81BD' },
  { id: 'mesa',     label: 'Mesa',     color: '#70AD47' },
  { id: 'telefone', label: 'Telefone', color: '#FBBC04' },
  { id: 'olga',     label: 'Olga',     color: '#FF9900' },
  { id: 'ifood',    label: 'iFood',    color: '#FF0000' },
];

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

const NOME_MESES = [
  'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
];

/* Funções auxiliares globais */
function hasTaxService(canalId) {
  return ['telefone', 'olga', 'ifood'].includes(canalId);
}
function linesCount(canalId) {
  return hasTaxService(canalId) ? 5 : 4;
}

/* Funções para formatação */
const yAxisTickFormatter = (value) => value.toLocaleString('pt-BR');
const tooltipFormatter = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CustomTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length > 0) {
    const dataPoint = payload[0].payload;
    const formattedValue =
      metric === 'tickets'
        ? dataPoint.value.toLocaleString('pt-BR')
        : dataPoint.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        <p className="intro">Valor: {formattedValue}</p>
        {typeof dataPoint.variation === 'number' && (
          <p className="desc">
            Variação: {dataPoint.variation >= 0 ? '+' : ''}
            {dataPoint.variation.toFixed(1)}%
          </p>
        )}
      </div>
    );
  }
  return null;
};

function ComparisonTooltip({ active, payload }) {
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
    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: 10, borderRadius: 4 }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{bar1.payload.metric}</p>
        <p style={{ margin: 0 }}>
          {label1}: {val1.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        <p style={{ margin: 0 }}>
          {label2}: {val2.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const labelRadius = outerRadius + 20;
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {(percent * 100).toFixed(1)}%
    </text>
  );
};

function AnaliseCampanhas2024() {
  // Estados
  const [dados2025, setDados2025] = useState([]);
  const [dados2024, setDados2024] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("vendas");

  // Chamadas de fetch (useEffect sempre será chamada)
  useEffect(() => {
    async function fetchData() {
      try {
        const res2025 = await fetch('http://localhost:3000/api/analise_campanhas');
        const json2025 = await res2025.json();
        setDados2025(json2025.data);
      } catch (error) {
        console.error('Erro ao buscar dados 2025:', error);
      }
      try {
        const res2024 = await fetch('http://localhost:3000/api/analise_campanhas_2024');
        const json2024 = await res2024.json();
        setDados2024(json2024.data);
      } catch (error) {
        console.error('Erro ao buscar dados 2024:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Todos os hooks abaixo são chamados incondicionalmente

  const combinedData = useMemo(() => [...dados2025, ...dados2024], [dados2025, dados2024]);

  const monthOptions = useMemo(() => {
    return Array.from(new Set(combinedData.map(item => `${item.ano}-${item.mes}`)))
      .map(key => {
        const [year, mes] = key.split('-').map(Number);
        const monthLabel = MESES.find(m => m.num === mes)?.label || mes;
        return { key, year, mes, label: `${year} - ${monthLabel}` };
      })
      .sort((a, b) => a.year - b.year || a.mes - b.mes);
  }, [combinedData]);

  const getFilteredData = useCallback(() => {
    if (selectedMonths.length === 0) return combinedData;
    return combinedData.filter(item => selectedMonths.includes(`${item.ano}-${item.mes}`));
  }, [combinedData, selectedMonths]);

  const anosDisponiveis = useMemo(() => {
    return Array.from(new Set(combinedData.map(item => item.ano))).sort();
  }, [combinedData]);
  const anoLabel = anosDisponiveis.join('/');

  const ultimoRegistroDate = useMemo(() => {
    const dates = combinedData
      .map(item => {
        const d = new Date(item.ultimo_registro_mes);
        return isNaN(d.getTime()) ? null : d;
      })
      .filter(d => d !== null);
    if (dates.length === 0) return null;
    return dates.reduce((max, d) => (d > max ? d : max), new Date(0));
  }, [combinedData]);
  const ultimoRegistroFormatted = ultimoRegistroDate ? ultimoRegistroDate.toLocaleDateString('pt-BR') : '---';

  const getValor = useCallback((ano, mes, canal, tipo) => {
    const row = combinedData.find(item => item.ano === ano && item.mes === mes);
    return row ? Number(row[`${tipo}_${canal}`]) || 0 : 0;
  }, [combinedData]);

  const getVariation = useCallback((ano, mes, canal, tipo) => {
    if (mes === 1) return null;
    const atual = getValor(ano, mes, canal, tipo);
    const anterior = getValor(ano, mes - 1, canal, tipo);
    return anterior === 0 ? null : ((atual - anterior) / anterior) * 100;
  }, [getValor]);

  function getTotalAnual(canal, tipo) {
    let total = 0;
    combinedData.forEach(item => {
      total += Number(item[`${tipo}_${canal}`]) || 0;
    });
    return total;
  }

  function fmtMoeda(num) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(num);
  }

  function fmtPct(num) {
    if (num === null) return '';
    const prefix = num >= 0 ? '+' : '';
    return prefix + num.toFixed(1) + '%';
  }

  function getVarClass(varPct, baseClass) {
    return varPct < 0 ? `${baseClass} negative` : baseClass;
  }

  function getChannelsToUse() {
    return selectedChannels.length ? selectedChannels : canais.map(c => c.id);
  }

  const getTotalMetric = useCallback((rec, metric) => {
    const channels = getChannelsToUse();
    if (!rec) return 0;
    if (metric === 'ticket_medio') {
      let totalVendas = 0, totalTickets = 0;
      channels.forEach(channel => {
        totalVendas += Number(rec[`vendas_${channel}`]) || 0;
        totalTickets += Number(rec[`tickets_${channel}`]) || 0;
      });
      return totalTickets > 0 ? totalVendas / totalTickets : 0;
    } else {
      let total = 0;
      channels.forEach(channel => {
        total += Number(rec[`${metric}_${channel}`]) || 0;
      });
      return total;
    }
  }, [getChannelsToUse]);

  const projectMetric = useCallback((rec, metric) => {
    if (!rec) return 0;
    const recordedDays = new Date(rec.ultimo_registro_mes).getDate();
    if (recordedDays === 0) return 0;
    const totalDays = new Date(rec.ano, rec.mes, 0).getDate();
    const total = getTotalMetric(rec, metric);
    return (total / recordedDays) * totalDays;
  }, [getTotalMetric]);

  // KPIs para 2024 e 2025
  const kpis = useMemo(() => {
    const meses = selectedMonths.length ? selectedMonths : monthOptions.map(opt => opt.key);
    let somaVendas = 0, somaTickets = 0;
    combinedData.forEach(item => {
      if (meses.includes(`${item.ano}-${item.mes}`)) {
        getChannelsToUse().forEach(canalId => {
          somaVendas += Number(item[`vendas_${canalId}`]) || 0;
          somaTickets += Number(item[`tickets_${canalId}`]) || 0;
        });
      }
    });
    const tm = somaTickets > 0 ? somaVendas / somaTickets : 0;
    return { totalVendas: somaVendas, totalTickets: somaTickets, ticketMedio: tm };
  }, [selectedMonths, monthOptions, combinedData, selectedChannels]);

  function getKpiReviewSubtitle() {
    const meses = selectedMonths.length ? selectedMonths : monthOptions.map(opt => opt.key);
    const labels = monthOptions.filter(opt => meses.includes(opt.key)).map(opt => opt.label);
    const metricLabel =
      selectedMetric === 'vendas'
        ? 'Vendas'
        : selectedMetric === 'tickets'
        ? 'Tickets'
        : 'Ticket Médio';
    return `for transactions in ${labels.join(', ')} (${metricLabel})`;
  }

  // Gráfico de linhas (timeline)
  const chartData = useMemo(() => {
    const options = selectedMonths.length ? monthOptions.filter(opt => selectedMonths.includes(opt.key)) : monthOptions;
    const data = options.map(opt => {
      const rec = combinedData.find(item => item.ano === opt.year && item.mes === opt.mes);
      const value = rec ? getTotalMetric(rec, selectedMetric) : 0;
      return { name: opt.label, value, ano: opt.year, mes: opt.mes };
    });
    return data.map((d, i) => {
      if (i === 0) return { ...d, variation: null };
      const prev = data[i - 1];
      const variation = prev.value === 0 ? null : ((d.value - prev.value) / prev.value) * 100;
      return { ...d, variation };
    });
  }, [selectedMonths, monthOptions, combinedData, selectedMetric, getTotalMetric]);

  // Gráfico de Pizza: exibe porcentagem com 1 casa decimal e o símbolo "%"
  const pieData = useMemo(() => {
    const filtered = getFilteredData();
    const mesesSelecionados = selectedMonths.length ? selectedMonths : monthOptions.map(opt => opt.key);
    const data = canais.map(canal => {
      let revenue = 0;
      filtered.forEach(item => {
        if (mesesSelecionados.includes(`${item.ano}-${item.mes}`)) {
          revenue += Number(item[`vendas_${canal.id}`]) || 0;
        }
      });
      return { channel: canal.label, revenue };
    });
    const totalRevenue = data.reduce((acc, cur) => acc + cur.revenue, 0);
    return data.map(item => ({
      channel: item.channel,
      revenue: item.revenue,
      percentage: totalRevenue > 0 ? parseFloat(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));
  }, [getFilteredData, selectedMonths, monthOptions]);

  // Dados para gráficos comparativos (usando o mês atual)
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const recCurrent = useMemo(() => combinedData.find(item => item.mes === currentMonth), [combinedData, currentMonth]);
  const recPrevious = useMemo(() => combinedData.find(item => item.mes === currentMonth - 1), [combinedData, currentMonth]);
  const recSameMonth2024 = useMemo(() => dados2024.find(item => item.mes === currentMonth), [dados2024, currentMonth]);

  const bottomBarDataYearComparison = useMemo(() => {
    if (!recCurrent || !recSameMonth2024) return [];
    return [{
      metric: selectedMetric === 'vendas'
        ? 'Vendas'
        : selectedMetric === 'tickets'
        ? 'Tickets'
        : 'Ticket Médio',
      Atual: projectMetric(recCurrent, selectedMetric),
      AnoAnterior: projectMetric(recSameMonth2024, selectedMetric),
    }];
  }, [recCurrent, recSameMonth2024, selectedMetric, projectMetric]);

  const bottomBarDataMonthComparison = useMemo(() => {
    if (!recCurrent || !recPrevious) return [];
    return [{
      metric: selectedMetric === 'vendas'
        ? 'Vendas'
        : selectedMetric === 'tickets'
        ? 'Tickets'
        : 'Ticket Médio',
      Atual: projectMetric(recCurrent, selectedMetric),
      Anterior: projectMetric(recPrevious, selectedMetric),
    }];
  }, [recCurrent, recPrevious, selectedMetric, projectMetric]);

  // Handlers dos filtros
  const handleToggleMonth = (key) => {
    if (selectedMonths.includes(key)) {
      setSelectedMonths(selectedMonths.filter(item => item !== key));
    } else {
      setSelectedMonths([...selectedMonths, key]);
    }
  };

  const handleToggleChannel = (canalId) => {
    if (selectedChannels.includes(canalId)) {
      setSelectedChannels(selectedChannels.filter(id => id !== canalId));
    } else {
      setSelectedChannels([...selectedChannels, canalId]);
    }
  };

  const handleSelectMetric = (metric) => {
    setSelectedMetric(metric);
  };

  return (
    <>
      {/* Faixa vermelha com header */}
      <div className="top-red-bar">
        <div className="analise-campanhas-header">
          <img src="/logo contornado 1080.png" alt="Logo da Empresa" className="analise-campanhas-logo" />
          <div className="analise-campanhas-title-group">
            <h1 className="analise-campanhas-main-title">Relatório Análise de Campanhas</h1>
            <h2 className="analise-campanhas-year-title">{anoLabel} - Campo Limpo</h2>
          </div>
        </div>
      </div>

      {/* Última carga de dados */}
      <div className="last-data-load">
        Última carga de dados: {ultimoRegistroFormatted}
      </div>

      {/* Container para filtros e KPI review (incluindo gráfico de linhas) */}
      <div className="analise-campanhas-container">
        <div className="filtros-e-kpi-review">
          <div className="filters-section">
            <h3>Filtros</h3>
            <div className="filters-options">
              <div className="filters-group">
                <h4>Meses</h4>
                {monthOptions.map(opt => (
                  <label key={opt.key} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(opt.key)}
                      onChange={() => handleToggleMonth(opt.key)}
                    />
                    {opt.label}
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

          {/* KPI review e gráfico de linhas */}
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
                <span className="kpi-item-value">{fmtMoeda(kpis.ticketMedio)}</span>
              </div>
            </div>
            <div className="kpi-review-chart">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData} margin={{ left: 50, right: 20, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={yAxisTickFormatter} />
                    <Tooltip content={<CustomTooltip metric={selectedMetric} />} formatter={tooltipFormatter} />
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

      {/* Gráfico de participação (PieChart) */}
      <div className="analise-campanhas-container">
        <div className="pie-chart-container">
          <h2 className="pie-chart-title">Participação no Faturamento</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="percentage" nameKey="channel" cx="50%" cy="50%" outerRadius={80} label={renderCustomizedLabel}>
                {pieData.map((entry, index) => {
                  const canal = canais.find(c => c.label === entry.channel);
                  return <Cell key={`cell-${index}`} fill={canal ? canal.color : '#000'} />;
                })}
              </Pie>
              <Tooltip formatter={(value) => value.toFixed(1) + '%'} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela do Relatório */}
      <div className="analise-campanhas-container">
        <table className="analise-campanhas-table">
          <thead>
            <tr className="cabecalho">
              <th className="analise-campanhas-th">Canal</th>
              <th className="analise-campanhas-th metrica-col">Métrica</th>
              {MESES.map((m, i) => (
                <React.Fragment key={m.num}>
                  <th className="analise-campanhas-th-right">
                    {NOME_MESES[i]}<br /><span style={{ fontSize: '0.8em' }}>Valor</span>
                  </th>
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
                  ></td>
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
                {['telefone','olga','ifood'].includes(canal.id) && (
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

export default AnaliseCampanhas2024;
