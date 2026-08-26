
// import MainLayout from "./layouts/MainLayout";
// import ReceptionPage from "./pages/ReceptionPage";

import "./App.css";
import { useRoutes } from "react-router-dom";
import { routes } from "./config/routes";
// import { ThemeProvider } from "./providers/ThemeProvider";
// import { ModalProvider } from "./providers/ModalProvider";
// import ModalContainer from "./components/modals/ModalContainer";
import { AppProviders } from "./providers/AppProviders";

function App() {
  const element = useRoutes(routes);

  return <AppProviders>
    {/* <UserProvider>{element}</UserProvider> */}
    {element}
  </AppProviders>;
}

export default App;
