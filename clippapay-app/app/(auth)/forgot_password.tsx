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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 403;

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState(1); // 1: Email, 2: Reset, 3: Success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const sendResetCode = async () => {
    // Basic email validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');
      
      setMessage(data.message || 'Reset code sent to your email');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    // Validation
    if (!code.trim()) {
      setError('Please enter the reset code');
      return;
    }
    
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          code: code.trim(),
          newPassword 
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      
      setMessage(data.message || 'Password reset successfully');
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/login');
  };

  const handleGoToSignup = () => {
    router.replace('/signup');
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code');
      
      setMessage('New reset code sent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <LinearGradient 
          colors={['rgba(93,45,230,0.7)', 'rgba(214,207,141,0.5)', 'rgba(52,211,153,0.1)']} 
          style={styles.gradient}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToLogin}
            >
              <Ionicons name="arrow-back" size={24 * scale} color="#fff" />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>

            {/* Logo/Icon */}
            <View style={styles.logoContainer}>
              <View style={styles.iconContainer}>
                <Image 
                  source={require('../../assets/images/icon.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                {step === 1 
                  ? 'Enter your email to get a reset code' 
                  : step === 2 
                  ? 'Enter the code and new password' 
                  : 'Password reset successful!'}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20 * scale} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Success Message */}
            {message ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={20 * scale} color="#16a34a" />
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            {/* Step 1: Email Input */}
            {step === 1 && (
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your registered email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, loading && styles.buttonDisabled]}
                  onPress={sendResetCode}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <Ionicons name="reload" size={20 * scale} color="#fff" style={styles.loadingIcon} />
                        <Text style={styles.buttonText}>Sending...</Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Send Reset Code</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Reset Code and New Password */}
            {step === 2 && (
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Reset Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit code from email"
                    placeholderTextColor="#999"
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.replace(/\D/g, '').slice(0, 6));
                      if (error) setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    style={styles.resendLink}
                    onPress={handleResendCode}
                    disabled={loading}
                  >
                    <Text style={styles.resendText}>
                      {loading ? 'Resending...' : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter new password"
                      placeholderTextColor="#999"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (error) setError('');
                      }}
                      secureTextEntry={!showNewPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity 
                      style={styles.passwordToggle}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Ionicons 
                        name={showNewPassword ? "eye-off" : "eye"} 
                        size={20 * scale} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.passwordHint}>
                    Must be at least 8 characters long
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Confirm new password"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (error) setError('');
                      }}
                      secureTextEntry={!showConfirmPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity 
                      style={styles.passwordToggle}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons 
                        name={showConfirmPassword ? "eye-off" : "eye"} 
                        size={20 * scale} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, loading && styles.buttonDisabled]}
                  onPress={resetPassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#16a34a', '#059669']}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <Ionicons name="reload" size={20 * scale} color="#fff" style={styles.loadingIcon} />
                        <Text style={styles.buttonText}>Resetting...</Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Reset Password</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <View style={styles.successStepContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={80 * scale} color="#16a34a" />
                </View>
                <Text style={styles.successTitle}>Password Reset Successfully!</Text>
                <Text style={styles.successMessage}>
                  Your password has been reset. You can now log in with your new password.
                </Text>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleBackToLogin}
                >
                  <LinearGradient
                    colors={['#0F2027', '#203A43', '#2C5364']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>Go to Login</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Signup Prompt */}
            {step === 1 && (
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account?</Text>
                <TouchableOpacity onPress={handleGoToSignup}>
                  <Text style={styles.signupLink}>Sign up for free</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Having trouble? Contact{' '}
                <Text style={styles.supportLink}>reach@clippapay.com</Text>
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
    padding: 24 * scale,
    paddingTop: Platform.OS === 'ios' ? 40 * scale : 20 * scale,
    paddingBottom: 40 * scale,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30 * scale,
  },
  backButtonText: {
    fontSize: 16 * scale,
    color: '#fff',
    marginLeft: 8 * scale,
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40 * scale,
  },
  iconContainer: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    // backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16 * scale,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 8,
    // elevation: 8,
  },
  iconImage: {
    width: 60 * scale,
    height: 60 * scale,
    borderRadius: 30 * scale,
  },
  title: {
    fontSize: 28 * scale,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8 * scale,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16 * scale,
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 22 * scale,
    paddingHorizontal: 20 * scale,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 8 * scale,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 8 * scale,
    padding: 12 * scale,
    marginBottom: 20 * scale,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14 * scale,
    marginLeft: 8 * scale,
    flex: 1,
  },
  formContainer: {
    width: '100%',
    marginBottom: 30 * scale,
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
    width: 354 * scale,
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
  },
  passwordInput: {
    paddingRight: 50 * scale,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16 * scale,
    top: 18 * scale,
  },
  passwordHint: {
    fontSize: 12 * scale,
    color: '#9ca3af',
    marginTop: 4 * scale,
    fontStyle: 'italic',
  },
  resendLink: {
    marginTop: 8 * scale,
    alignSelf: 'flex-end',
  },
  resendText: {
    fontSize: 14 * scale,
    color: '#a98fd7',
    fontWeight: '600',
  },
  actionButton: {
    width: 354 * scale,
    height: 56 * scale,
    borderRadius: 10 * scale,
    overflow: 'hidden',
    marginTop: 10 * scale,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    marginRight: 8 * scale,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16 * scale,
    fontWeight: '700',
  },
  successStepContainer: {
    alignItems: 'center',
    marginVertical: 40 * scale,
  },
  successIconContainer: {
    marginBottom: 24 * scale,
  },
  successTitle: {
    fontSize: 24 * scale,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12 * scale,
  },
  successMessage: {
    fontSize: 16 * scale,
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 22 * scale,
    marginBottom: 40 * scale,
    paddingHorizontal: 20 * scale,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20 * scale,
    marginBottom: 40 * scale,
  },
  signupText: {
    fontSize: 14 * scale,
    color: '#fff',
    marginRight: 4 * scale,
  },
  signupLink: {
    fontSize: 14 * scale,
    color: '#7C3AED',
    fontWeight: '700',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20 * scale,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 12 * scale,
    color: '#9ca3af',
    textAlign: 'center',
  },
  supportLink: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});