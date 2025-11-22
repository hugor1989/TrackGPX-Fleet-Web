

import './global.css';

//import App from "./src/App";
//export default App;
// NO importes otro App.tsx desde src
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginPage from "./src/pages/Login";
import DashboardPage from "./src/pages/Dashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Dashboard" component={DashboardPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}