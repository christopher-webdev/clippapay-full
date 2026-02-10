// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="launch" />
      <Stack.Screen name="onboarding_1" />
      <Stack.Screen name="onboarding_2" />
      <Stack.Screen name="onboarding_3" />
      <Stack.Screen name="onboarding_4" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
    </Stack>
    </>
  );
}