import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { c } from '../lib/theme';

export default function RootLayout() {
  const [ready] = useFonts({
    Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('../../assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('../../assets/fonts/Inter_700Bold.ttf'),
    Outfit_500Medium: require('../../assets/fonts/Outfit_500Medium.ttf'),
    Outfit_600SemiBold: require('../../assets/fonts/Outfit_600SemiBold.ttf'),
    Outfit_700Bold: require('../../assets/fonts/Outfit_700Bold.ttf'),
  });
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.blue}/></View>;
  return <SafeAreaProvider><StatusBar style="dark"/><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} /></SafeAreaProvider>;
}
