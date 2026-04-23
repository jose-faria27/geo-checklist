import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Checklist from "./pages/Checklist";
import Novos from "./pages/Novos";
import AdminEditar from "./pages/AdminEditar";
import Ordens from "./pages/Ordens";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/:id" element={<Novos />} />
        <Route path="/admin" element={<AdminEditar />} />
        <Route path="/ordens" element={<Ordens />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
