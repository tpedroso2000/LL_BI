import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    // Redireciona para o dashboard de campanhas
    navigate("/dashboard");
  };

  return (
    <>
      <div className="top-red-bar">
        <img src="/logo contornado 1080.png" alt="Logo da Empresa" className="home-logo" />
        <h1 className="home-title">Bem-vindo!</h1>
        {/* Elemento vazio para equilibrar o grid */}
        <div className="home-spacer"></div>
      </div>
      <div className="home-container">
        <p>Escolha qual dashboard você deseja acessar:</p>
        <div className="dashboard-options">
          <div className="dashboard-card" onClick={handleDashboardClick}>
            <h2 className="dashboard-card-title">Dashboard de Campanhas</h2>
            <p className="dashboard-card-description">
              Visualize e analise campanhas, vendas e tickets.
            </p>
          </div>
          {/* Adicione outros cards conforme necessário */}
        </div>
      </div>
    </>
  );
}

export default Home;
