// App.js 
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import AnaliseCampanhas from './AnaliseCampanhas';
import DashboardAlterado from './DashboardAlterado';
import AnaliseCampanhas2024 from './AnaliseCampanhas2024';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<AnaliseCampanhas />} />
      <Route path="/dashboar-alteradod" element={<DashboardAlterado />} />
      <Route path="/dashboard-2024" element={<AnaliseCampanhas2024 />} />     
    </Routes>
  );
}

export default App;
