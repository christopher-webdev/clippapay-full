import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 403;

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// JWT Token Parser
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Store token securely
const storeToken = async (token: string) => {
  try {
    // Store in SecureStore for security (mobile only)
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync('userToken', token);
    }
    
    // Also store in AsyncStorage for easier access
    await AsyncStorage.setItem('userToken', token);
    
    // Store basic user info
    const decoded = parseJwt(token);
    if (decoded) {
      await AsyncStorage.setItem('userInfo', JSON.stringify({
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        id: decoded.id
      }));
    }
    
    console.log('Token stored successfully');
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

// Check if user is already logged in
export const checkExistingSession = async () => {
  try {
    let token = null;
    
    if (Platform.OS !== 'web') {
      token = await SecureStore.getItemAsync('userToken');
    }
    
    if (!token) {
      token = await AsyncStorage.getItem('userToken');
    }
    
    if (token) {
      // Verify token is still valid
      const decoded = parseJwt(token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        return {
          loggedIn: true,
          token,
          userInfo: decoded
        };
      } else {
        // Token expired, clear it
        await clearSession();
      }
    }
    return { loggedIn: false };
  } catch (error) {
    console.error('Error checking session:', error);
    return { loggedIn: false };
  }
};

// Clear session data
export const clearSession = async () => {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync('userToken');
    }
    await AsyncStorage.multiRemove(['userToken', 'userInfo']);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

export default function LoginMobileScreen() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (key: keyof typeof credentials, value: string) => {
    setCredentials({ ...credentials, [key]: value });
    if (error) setError(null);
  };

  const togglePassword = () => setShowPassword(prev => !prev);
  const toggleRememberMe = () => setRememberMe(prev => !prev);

  const login = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email.toLowerCase(),
          password: credentials.password,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.notVerified) {
          setStep('otp');
          setError(data.error || 'Account not verified.');
          return;
        }
        throw new Error(data.error || data.message || 'Login failed');
      }

      // Store the token securely
      if (data.token) {
        await storeToken(data.token);
        
        // Navigate based on role
        const decoded = parseJwt(data.token);
        const role = decoded?.role;
        
        if (role === 'clipper') {
          router.replace('/(dashboard_clipper)/clipper_dashboard');
        } else if (role === 'advertiser') {
          router.replace('/(dashboard_advertiser)/advertiser_dashboard');
        } else {
          router.replace('/(auth)/onboarding_1');
        }
      } else {
        throw new Error('No authentication token received');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email.toLowerCase(),
          otp,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // Retry login after verification
      await login();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot_password');
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <LinearGradient 
          colors={['rgba(93,45,230,0.7)', 'rgba(214,207,141,0.5)', 'rgba(52,211,153,0.1)']} 
          style={styles.gradient}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Logo/Icon */}
            <View style={styles.logoContainer}>
              <View style={styles.iconWrapper}>
                <Image 
                  source={require('../../assets/images/icon.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeText}>Welcome Back</Text>
            </View>

            {/* New User Prompt */}
            <View style={styles.newUserContainer}>
              <Text style={styles.newUserText}>New to Clippapay?</Text>
              <TouchableOpacity onPress={handleSignup}>
                <Text style={styles.signupText}>Signup for free</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login Form */}
            {step === 'login' ? (
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={credentials.email}
                    onChangeText={(text) => handleChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter your password"
                      placeholderTextColor="#999"
                      value={credentials.password}
                      onChangeText={(text) => handleChange('password', text)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity 
                      style={styles.passwordToggle}
                      onPress={togglePassword}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Remember Me & Forgot Password */}
                <View style={styles.rememberForgotContainer}>
                  <TouchableOpacity 
                    style={styles.rememberContainer}
                    onPress={toggleRememberMe}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.rememberText}>Remember me</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={login}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#0F2027', '#203A43', '#2C5364']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.loginButtonText}>
                      {loading ? 'Logging in...' : 'Login'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              /* OTP Verification Form */
              <View style={styles.formContainer}>
                <Text style={styles.otpTitle}>Verify Your Account</Text>
                <Text style={styles.otpSubtitle}>
                  Enter the OTP sent to {credentials.email}
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>6-digit OTP</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="000000"
                    placeholderTextColor="#999"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={submitOtp}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#16a34a', '#059669']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.loginButtonText}>
                      {loading ? 'Verifying...' : 'Verify & Login'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep('login')}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>← Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Section */}
            <View style={styles.bottomContainer}>
              <Text style={styles.bottomText}>
                By continuing, you agree to our{' '}
                <Text style={styles.linkText} onPress={() => {}}>Terms of Service</Text> and{' '}
                <Text style={styles.linkText} onPress={() => {}}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24 * scale,
    paddingTop: 20 * scale,
    paddingBottom: 40 * scale,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30 * scale,
    marginTop: 10 * scale,
  },
  iconWrapper: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconImage: {
    width: 70 * scale,
    height: 70 * scale,
    borderRadius: 35 * scale,
  },
  welcomeText: {
    fontSize: 28 * scale,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  newUserContainer: {
    alignItems: 'center',
    marginBottom: 25 * scale,
  },
  newUserText: {
    fontSize: 20 * scale,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8 * scale,
  },
  signupText: {
    fontSize: 16 * scale,
    fontWeight: '700',
    color: '#9c77db',
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8 * scale,
    padding: 12 * scale,
    marginBottom: 20 * scale,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14 * scale,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20 * scale,
  },
  inputLabel: {
    fontSize: 14 * scale,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8 * scale,
  },
  input: {
    width: '100%',
    height: 56 * scale,
    backgroundColor: '#fff',
    borderRadius: 10 * scale,
    paddingHorizontal: 16 * scale,
    fontSize: 16 * scale,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50 * scale,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16 * scale,
    top: 18 * scale,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30 * scale,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20 * scale,
    height: 20 * scale,
    borderRadius: 4 * scale,
    borderWidth: 2,
    borderColor: '#7C3AED',
    marginRight: 8 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
  },
  rememberText: {
    fontSize: 14 * scale,
    color: '#fff',
  },
  forgotText: {
    fontSize: 14 * scale,
    color: '#9c77db',
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    height: 56 * scale,
    borderRadius: 10 * scale,
    overflow: 'hidden',
    marginBottom: 20 * scale,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16 * scale,
    fontWeight: '700',
  },
  otpTitle: {
    fontSize: 24 * scale,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8 * scale,
  },
  otpSubtitle: {
    fontSize: 14 * scale,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 30 * scale,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 20 * scale,
    letterSpacing: 4 * scale,
  },
  backButton: {
    marginTop: 20 * scale,
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 14 * scale,
    color: '#7C3AED',
    fontWeight: '600',
  },
  bottomContainer: {
    marginTop: 40 * scale,
    paddingHorizontal: 20 * scale,
  },
  bottomText: {
    fontSize: 12 * scale,
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 16 * scale,
  },
  linkText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});