// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="launch" />
      <Stack.Screen name="onboarding_1" />
      <Stack.Screen name="onboarding_2" />
      <Stack.Screen name="onboarding_3" />
      <Stack.Screen name="onboarding_4" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}