import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import './DashboardAlterado.css';

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

function DashboardAlterado() {
  // Estados para seção superior (filtro de meses)
  const [topMonths, setTopMonths] = useState([]);
  // Estados para seção inferior (filtros de canais e métrica)
  const [bottomChannels, setBottomChannels] = useState([]);
  const [bottomMetric, setBottomMetric] = useState("vendas");

  // Busca dos dados
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

  // Funções para a seção superior
  const getTopMonthsToUse = useCallback(() => {
    return topMonths.length ? topMonths : MESES.map(m => m.num);
  }, [topMonths]);

  // Funções para a seção inferior
  const getBottomChannelsToUse = useCallback(() => {
    return bottomChannels.length ? bottomChannels : canais.map(c => c.id);
  }, [bottomChannels]);

  // Funções auxiliares
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

  // Cálculo do total para um registro (usado para KPIs da seção inferior)
  const getTotalMetric = useCallback((rec, metric) => {
    if (!rec) return 0;
    const channels = getBottomChannelsToUse();
    if (metric === 'ticket_medio') {
      let totalVendas = 0, totalTickets = 0;
      channels.forEach(channel => {
        totalVendas += Number(rec[`vendas_${channel}`]) || 0;
        totalTickets += Number(rec[`tickets_${channel}`]) || 0;
      });
      return totalTickets > 0 ? totalVendas / totalTickets : 0;
    }
    let total = 0;
    channels.forEach(channel => {
      total += Number(rec[`${metric}_${channel}`]) || 0;
    });
    return total;
  }, [getBottomChannelsToUse]);

  // Definição da função projectMetric
  const projectMetric = useCallback((rec, metric) => {
    if (!rec) return 0;
    const recordedDays = new Date(rec.ultimo_registro_mes).getDate();
    const totalDays = new Date(rec.ano, rec.mes, 0).getDate();
    const total = getTotalMetric(rec, metric);
    const projected = recordedDays === 0 ? 0 : (total / recordedDays) * totalDays;
    return metric === 'tickets' ? Math.round(projected) : projected;
  }, [getTotalMetric]);

  // Cálculos para a seção superior
  const topKPIs = useMemo(() => {
    const months = getTopMonthsToUse();
    let totalVendas = 0, totalTickets = 0;
    canais.forEach(canal => {
      months.forEach(m => {
        totalVendas += getValor(m, canal.id, 'vendas');
        totalTickets += getValor(m, canal.id, 'tickets');
      });
    });
    return {
      totalVendas,
      totalTickets,
      ticket_medio: totalTickets > 0 ? totalVendas / totalTickets : 0
    };
  }, [getTopMonthsToUse, getValor]);

  const topBarDataVendas = useMemo(() => {
    const months = getTopMonthsToUse();
    return canais.map(canal => {
      let sum = 0;
      months.forEach(m => {
        sum += getValor(m, canal.id, 'vendas');
      });
      return { channel: canal.label, value: sum };
    });
  }, [getTopMonthsToUse, getValor]);

  const topBarDataTickets = useMemo(() => {
    const months = getTopMonthsToUse();
    return canais.map(canal => {
      let sum = 0;
      months.forEach(m => {
        sum += getValor(m, canal.id, 'tickets');
      });
      return { channel: canal.label, value: sum };
    });
  }, [getTopMonthsToUse, getValor]);

  const topBarDataTicketMedio = useMemo(() => {
    const months = getTopMonthsToUse();
    return canais.map(canal => {
      let vendas = 0, tickets = 0;
      months.forEach(m => {
        vendas += getValor(m, canal.id, 'vendas');
        tickets += getValor(m, canal.id, 'tickets');
      });
      return { channel: canal.label, value: tickets > 0 ? vendas / tickets : 0 };
    });
  }, [getTopMonthsToUse, getValor]);

  // Cálculos para a seção inferior
  const bottomKPIs = useMemo(() => {
    const channels = getBottomChannelsToUse();
    let totalVendas = 0, totalTickets = 0;
    MESES.forEach(m => {
      channels.forEach(canalId => {
        totalVendas += getValor(m.num, canalId, 'vendas');
        totalTickets += getValor(m.num, canalId, 'tickets');
      });
    });
    return {
      totalVendas,
      totalTickets,
      ticket_medio: totalTickets > 0 ? totalVendas / totalTickets : 0
    };
  }, [getBottomChannelsToUse, getValor]);

  const bottomChartData = useMemo(() => {
    const channels = getBottomChannelsToUse();
    return MESES.map(m => {
      let value = 0;
      channels.forEach(canalId => {
        if (bottomMetric === 'vendas') {
          value += getValor(m.num, canalId, 'vendas');
        } else if (bottomMetric === 'tickets') {
          value += getValor(m.num, canalId, 'tickets');
        } else if (bottomMetric === 'ticket_medio') {
          let vendas = 0, tickets = 0;
          channels.forEach(canal => {
            vendas += getValor(m.num, canal, 'vendas');
            tickets += getValor(m.num, canal, 'tickets');
          });
          value = tickets > 0 ? vendas / tickets : 0;
        }
      });
      return { name: m.label, value, num: m.num };
    });
  }, [getBottomChannelsToUse, bottomMetric, getValor]);

  // Definir pieData para a seção superior (usando os meses do filtro superior)
  const pieData = useMemo(() => {
    const mesesSelecionados = getTopMonthsToUse();
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
  }, [getTopMonthsToUse, getValor]);

  const currentMonth = new Date().getMonth() + 1;
  const recCurrent = dados.find(item => item.mes === currentMonth);
  const recPrevious = dados.find(item => item.mes === currentMonth - 1);
  const recSameMonth2024 = dados2024.find(item => item.mes === currentMonth);

  const bottomBarDataYearComparison = useMemo(() => {
    if (!recCurrent || !recSameMonth2024) return [];
    return [{
      metric: bottomMetric === 'vendas'
        ? 'Vendas'
        : bottomMetric === 'tickets'
          ? 'Tickets'
          : 'Ticket Médio',
      Atual: projectMetric(recCurrent, bottomMetric),
      AnoAnterior: projectMetric(recSameMonth2024, bottomMetric),
    }];
  }, [recCurrent, recSameMonth2024, bottomMetric, projectMetric]);

  const bottomBarDataMonthComparison = useMemo(() => {
    if (!recCurrent || !recPrevious) return [];
    return [{
      metric: bottomMetric === 'vendas'
        ? 'Vendas'
        : bottomMetric === 'tickets'
          ? 'Tickets'
          : 'Ticket Médio',
      Atual: projectMetric(recCurrent, bottomMetric),
      Anterior: projectMetric(recPrevious, bottomMetric),
    }];
  }, [recCurrent, recPrevious, bottomMetric, projectMetric]);

  const yAxisTickFormatter = value => value.toLocaleString('pt-BR');

  // Handlers
  const handleTopMonthToggle = (mNum) => {
    setTopMonths(prev =>
      prev.includes(mNum) ? prev.filter(num => num !== mNum) : [...prev, mNum]
    );
  };

  const handleBottomChannelToggle = (canalId) => {
    setBottomChannels(prev =>
      prev.includes(canalId) ? prev.filter(id => id !== canalId) : [...prev, canalId]
    );
  };

  const handleBottomMetricChange = (e) => {
    setBottomMetric(e.target.value);
  };

  const getBottomKpiReviewSubtitle = () => {
    const metricLabel = bottomMetric === 'vendas'
      ? 'Vendas'
      : bottomMetric === 'tickets'
        ? 'Tickets'
        : 'Ticket Médio';
    return `Evolução: ${metricLabel}`;
  };

  if (isLoading) return <div>Carregando dados...</div>;
  if (error) return <div>Erro ao carregar dados.</div>;

  return (
    <div className="dashboard-alterado">
      {/* Seção Superior */}
      <div className="top-section">
        <div className="top-left">
          <div className="filter-months">
            <h3>Selecione os Meses</h3>
            <div className="filter-options">
              {MESES.map(m => (
                <label key={m.num} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={topMonths.includes(m.num)}
                    onChange={() => handleTopMonthToggle(m.num)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <div className="top-kpis">
            <div className="kpi-item">
              <span className="kpi-item-label">Vendas</span>
              <span className="kpi-item-value">{fmtMoeda(topKPIs.totalVendas)}</span>
            </div>
            <div className="kpi-item">
              <span className="kpi-item-label">Tickets</span>
              <span className="kpi-item-value">{topKPIs.totalTickets.toLocaleString('pt-BR')}</span>
            </div>
            <div className="kpi-item">
              <span className="kpi-item-label">Ticket Médio</span>
              <span className="kpi-item-value">{fmtMoeda(topKPIs.ticket_medio)}</span>
            </div>
          </div>
          <div className="top-bar-charts">
            <div className="bar-chart-card">
              <h4>Vendas por Canal</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topBarDataVendas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis tickFormatter={yAxisTickFormatter} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4F81BD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bar-chart-card">
              <h4>Tickets por Canal</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topBarDataTickets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis tickFormatter={yAxisTickFormatter} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#70AD47" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bar-chart-card">
              <h4>Ticket Médio por Canal</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topBarDataTicketMedio}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis tickFormatter={yAxisTickFormatter} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FBBC04" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="top-right">
          <h3>Participação no Faturamento</h3>
          <ResponsiveContainer width="100%" height={400}>
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
                  return <Cell key={`cell-${index}`} fill={canal ? canal.color : '#000'} />;
                })}
              </Pie>
              <Tooltip formatter={value => value.toFixed(1) + '%'} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seção Inferior */}
      <div className="bottom-section">
        <div className="bottom-filters">
          <h3>Filtre por Canais e Métrica</h3>
          <div className="filters-options">
            <div className="filters-group">
              <h4>Canais</h4>
              {canais.map(c => (
                <label key={c.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={bottomChannels.includes(c.id)}
                    onChange={() => handleBottomChannelToggle(c.id)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
            <div className="filters-group">
              <h4>Métrica</h4>
              <select value={bottomMetric} onChange={handleBottomMetricChange}>
                <option value="vendas">Vendas</option>
                <option value="tickets">Tickets</option>
                <option value="ticket_medio">Ticket Médio</option>
              </select>
            </div>
          </div>
        </div>
        <div className="bottom-content">
          <div className="bottom-line-chart">
            <h3>{getBottomKpiReviewSubtitle()}</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={bottomChartData} margin={{ left: 50, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={yAxisTickFormatter} />
                <Tooltip content={<CustomTooltip metric={bottomMetric} />} />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#4F81BD" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bottom-comparison">
            <div className="comparison-chart-card">
              <h4>Atual vs. Mesmo Mês (Ano Anterior)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bottomBarDataYearComparison} margin={{ top: 20, right: 20, left: 50, bottom: 20 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis tickFormatter={yAxisTickFormatter} />
                  <Tooltip content={<ComparisonTooltip metric={bottomMetric} />} />
                  <Legend />
                  <Bar dataKey="Atual" name="Atual" fill="#8884d8" barSize={30} />
                  <Bar dataKey="AnoAnterior" name="Ano Anterior" fill="#82ca9d" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="comparison-chart-card">
              <h4>Atual vs. Mês Anterior</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bottomBarDataMonthComparison} margin={{ top: 20, right: 20, left: 50, bottom: 20 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis tickFormatter={yAxisTickFormatter} />
                  <Tooltip content={<ComparisonTooltip metric={bottomMetric} />} />
                  <Legend />
                  <Bar dataKey="Atual" name="Atual" fill="#8884d8" barSize={30} />
                  <Bar dataKey="Anterior" name="Mês Anterior" fill="#82ca9d" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardAlterado;
