

import './global.css';

//import App from "./src/App";
//export default App;
// NO importes otro App.tsx desde src
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardPage from './src/screens/Dashboard';
import ActivateDeviceScreen from './src/screens/devices/ActivateDeviceScreen';
import CompanyInfoScreen from './src/screens/company/CompanyInfoScreen';
import TeamScreen from './src/screens/company/TeamScreen';
import AddMemberScreen from './src/screens/company/AddMemberScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardPage} />
        <Stack.Screen name="ActivateDevice" component={ActivateDeviceScreen} />
        <Stack.Screen name="CompanyInfo" component={CompanyInfoScreen} />
        <Stack.Screen name="TeamScreen" component={TeamScreen} />
        <Stack.Screen name="AddMemberScreen" component={AddMemberScreen} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}