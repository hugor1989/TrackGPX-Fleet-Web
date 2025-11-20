import 'nativewind';
import '../global.css';
import { NavigationContainer } from '@react-navigation/native';
import RootRouter from './router';

export default function App() {
  return (
    <NavigationContainer>
      <RootRouter />
    </NavigationContainer>
  );
}
