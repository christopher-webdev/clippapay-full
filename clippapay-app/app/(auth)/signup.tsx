// SignupScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 403;
const API_BASE = 'https://api.clippapay.com/api';

type Step = 'form' | 'otp' | 'telegram';

const CREATOR_TYPES = [
  "Streamer (Twitch, Kick, YouTube Live, etc.)",
  "YouTuber (long-form or Shorts)",
  "TikTok Creator",
  "Instagram Influencer / Content Creator",
  "Podcaster",
  "Musical Artiste (singer, rapper, producer)",
  "Dancer / Choreographer",
  "Comedian / Skit Creator",
  "Actor / Actress",
  "Motivational Speaker",
  "Religious Leader / Spiritual Coach",
  "Event Host / MC",
  "Public Figure / Media Personality",
  "Entrepreneur / Business Owner / Brand",
  "Other (please specify)",
];

/* ✅ PURE JS BASE64 — NO LIBRARIES, NO BUFFER */
const base64Encode = (input: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input;
  let output = '';

  for (let block = 0, charCode, i = 0, map = chars;
       str.charAt(i | 0) || (map = '=', i % 1);
       output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))) {

    charCode = str.charCodeAt(i += 3/4);

    if (charCode > 0xFF) {
      throw new Error('Invalid character');
    }

    block = (block << 8) | charCode;
  }

  return output;
};

// Custom Checkbox Component
const Checkbox = ({ checked, onPress, label }) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkboxIcon}>✓</Text>}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const SignupScreen = () => {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [showCreatorTypes, setShowCreatorTypes] = useState(false);
  const [hasJoinedTelegram, setHasJoinedTelegram] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    role: 'clipper' as 'clipper' | 'advertiser',
    email: '',
    password: '',
    confirm: '',
    phone: '',
    firstName: '',
    lastName: '',
    contactName: '',
    company: '',
    creatorTypes: [] as string[],
    otherCreatorType: '',
  });

  const update = (key: string, value: string) =>
    setFormData({ ...formData, [key]: value });

  const toggleCreatorType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      creatorTypes: prev.creatorTypes.includes(type)
        ? prev.creatorTypes.filter((t) => t !== type)
        : [...prev.creatorTypes, type],
    }));
  };

  const handleSignup = async () => {
    setError(null);
    
    // Validation
    if (formData.password !== formData.confirm)
      return setError('Passwords do not match');
    
    // For advertisers, require at least one creator type
    if (formData.role === 'advertiser') {
      const finalCreatorTypes = formData.creatorTypes.includes("Other (please specify)")
        ? [...formData.creatorTypes.filter((t) => t !== "Other (please specify)"), formData.otherCreatorType]
        : formData.creatorTypes;
      
      if (finalCreatorTypes.length === 0) {
        return setError('Please select at least one creator type');
      }
      
      // Validate other creator type field if selected
      if (formData.creatorTypes.includes("Other (please specify)") && !formData.otherCreatorType.trim()) {
        return setError('Please specify your other creator type');
      }
    }

    try {
      setLoading(true);
      
      const finalCreatorTypes = formData.creatorTypes.includes("Other (please specify)")
        ? [...formData.creatorTypes.filter((t) => t !== "Other (please specify)"), formData.otherCreatorType]
        : formData.creatorTypes;
      
      const signupData = {
        ...formData,
        creatorTypes: finalCreatorTypes,
        otherCreatorType: formData.otherCreatorType || "",
      };

      console.log('Sending signup data:', signupData);

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const data = await res.json();
      console.log('Signup response:', data);
      
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      setMessage('OTP sent to your email');
      setStep('otp');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setLoading(true);
      console.log('Verifying OTP for:', formData.email);
      
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await res.json();
      console.log('OTP response:', data);
      
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      console.log('OTP verified successfully, user role:', formData.role);
      
      if (formData.role === 'clipper') {
        // Navigate to Telegram step
        console.log('Navigating to telegram step');
        setStep('telegram');
      } else {
        // Navigate to advertiser dashboard
        console.log('Navigating to advertiser dashboard');
        router.replace('/advertiser_dashboard');
      }

    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    setTelegramChecking(true);
    
    // Simulate a short delay for better UX
    setTimeout(() => {
      setTelegramChecking(false);
      setHasJoinedTelegram(true);
      // Navigate to clipper dashboard
      router.replace('/clipper_dashboard');
    }, 1000);
  };

  const encodedPhone = base64Encode(formData.phone);

  // Dismiss error message
  const dismissError = () => setError(null);
  const dismissMessage = () => setMessage(null);

  return (
    <SafeAreaView style={[styles.safe, styles.container]}>     
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <LinearGradient colors={['rgba(93,45,230,0.7)','rgba(214,207,141,0.5)','rgba(52,211,153,0.1)']} style={styles.gradient}>
          
          {/* Error Message Overlay */}
          {error && (
            <View style={styles.errorOverlay}>
              <View style={styles.errorModal}>
                <View style={styles.errorHeader}>
                  <Text style={styles.errorTitle}>Error</Text>
                  <TouchableOpacity onPress={dismissError} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.errorModalText}>{error}</Text>
                <TouchableOpacity onPress={dismissError} style={styles.errorOkButton}>
                  <Text style={styles.errorOkButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Success Message Overlay */}
          {message && (
            <View style={styles.messageOverlay}>
              <View style={styles.messageModal}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageTitle}>Success</Text>
                  <TouchableOpacity onPress={dismissMessage} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.messageModalText}>{message}</Text>
                <TouchableOpacity onPress={dismissMessage} style={styles.messageOkButton}>
                  <Text style={styles.messageOkButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 'form' && (
              <View style={styles.formContainer}>
                <Text style={styles.title}>Join ClippaPay</Text>

                <View style={styles.roleContainer}>
                  <TouchableOpacity 
                    style={[styles.roleButton, formData.role==='clipper'&&styles.roleButtonActive]} 
                    onPress={()=>update('role','clipper')}
                  >
                    <Text style={styles.roleText}>Clipper & Creators</Text>
                    <Text style={styles.roleSubText}>Make UGCs & Earn per view</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.roleButton, formData.role==='advertiser'&&styles.roleButtonActive]} 
                    onPress={()=>update('role','advertiser')}
                  >
                    <Text style={styles.roleText}>Advertiser</Text>
                    <Text style={styles.roleSubText}>Run campaigns</Text>
                  </TouchableOpacity>
                </View>

                <TextInput 
                  style={styles.input} 
                  placeholder="Email" 
                  placeholderTextColor="#666"
                  onChangeText={t=>update('email',t)} 
                  value={formData.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                {/* Password with show/hide toggle */}
                <View style={styles.passwordContainer}>
                  <TextInput 
                    style={[styles.input, styles.passwordInput]} 
                    placeholder="Password" 
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    onChangeText={t=>update('password',t)} 
                    value={formData.password}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password with show/hide toggle */}
                <View style={styles.passwordContainer}>
                  <TextInput 
                    style={[styles.input, styles.passwordInput]} 
                    placeholder="Confirm Password" 
                    placeholderTextColor="#666"
                    secureTextEntry={!showConfirmPassword}
                    onChangeText={t=>update('confirm',t)} 
                    value={formData.confirm}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                <TextInput 
                  style={styles.input} 
                  placeholder="Phone (+234...)" 
                  placeholderTextColor="#666"
                  onChangeText={t=>update('phone',t)} 
                  value={formData.phone}
                  keyboardType="phone-pad"
                />

                {formData.role==='clipper' ? (
                  <>
                    <TextInput 
                      style={styles.input} 
                      placeholder="First Name" 
                      placeholderTextColor="#666"
                      onChangeText={t=>update('firstName',t)} 
                      value={formData.firstName}
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Last Name" 
                      placeholderTextColor="#666"
                      onChangeText={t=>update('lastName',t)} 
                      value={formData.lastName}
                    />
                  </>
                ) : (
                  <>
                    <TextInput 
                      style={styles.input} 
                      placeholder="Contact Person Name" 
                      placeholderTextColor="#666"
                      onChangeText={t=>update('contactName',t)} 
                      value={formData.contactName}
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Company / Brand (optional)" 
                      placeholderTextColor="#666"
                      onChangeText={t=>update('company',t)} 
                      value={formData.company}
                    />
                    
                    {/* Creator Types Selection - FIXED: Remove FlatList inside ScrollView */}
                    <TouchableOpacity 
                      style={styles.creatorTypesButton}
                      onPress={() => setShowCreatorTypes(!showCreatorTypes)}
                    >
                      <Text style={styles.creatorTypesButtonText}>
                        {formData.creatorTypes.length > 0 
                          ? `${formData.creatorTypes.length} creator type(s) selected` 
                          : 'Select creator types (required)'}
                      </Text>
                      <Text style={styles.creatorTypesButtonArrow}>
                        {showCreatorTypes ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {showCreatorTypes && (
                      <View style={styles.creatorTypesDropdown}>
                        <Text style={styles.creatorTypesLabel}>Preferred Creator Types (select all that apply):</Text>
                        {/* ✅ FIXED: Replaced FlatList with ScrollView for non-virtualized list */}
                        <ScrollView 
                          style={styles.creatorTypesList}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          {CREATOR_TYPES.map((item) => (
                            <Checkbox
                              key={item}
                              checked={formData.creatorTypes.includes(item)}
                              onPress={() => toggleCreatorType(item)}
                              label={item}
                            />
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {formData.creatorTypes.includes("Other (please specify)") && (
                      <TextInput
                        style={styles.input}
                        placeholder="Specify other creator type..."
                        placeholderTextColor="#666"
                        onChangeText={t => update('otherCreatorType', t)}
                        value={formData.otherCreatorType}
                      />
                    )}
                  </>
                )}

                <TouchableOpacity style={styles.nextButton} onPress={handleSignup}>
                  <LinearGradient colors={['#0F2027','#2C5364']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>{loading?'Creating...':'Continue →'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {step==='otp' && (
              <View style={styles.otpContainer}>
                <Text style={styles.title}>Verify Email</Text>
                <Text style={styles.subtitle}>Code sent to: {formData.email}</Text>
                <TextInput 
                  style={[styles.input, styles.otpInput]} 
                  placeholder="000000" 
                  placeholderTextColor="#666"
                  keyboardType="number-pad" 
                  maxLength={6} 
                  onChangeText={t=>setOtp(t.replace(/\D/g,''))}
                  value={otp}
                />
                <TouchableOpacity style={styles.nextButton} onPress={handleVerifyOtp}>
                  <LinearGradient colors={['#16a34a','#059669']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>{loading?'Verifying...':'Verify Email'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {step==='telegram' && (
              <View style={styles.telegramContainer}>
                <Text style={styles.title}>Final Step</Text>
                <Text style={styles.subtitle}>Join Telegram to activate account</Text>
                
                <Text style={styles.telegramNote}>
                  You are signed up as a <Text style={{fontWeight: 'bold'}}>Clipper</Text>. 
                  Please join our Telegram channel to get campaign updates.
                </Text>
                
                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={()=>Linking.openURL(`https://t.me/clippapay?start=${encodedPhone}`)}
                >
                  <LinearGradient colors={['#2563eb','#1d4ed8']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>Open Telegram</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.nextButton,{marginTop:16*scale}]} 
                  onPress={handleGoToDashboard}
                  disabled={telegramChecking}
                >
                  <LinearGradient colors={['#16a34a','#059669']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>
                      {telegramChecking ? 'Taking you to Dashboard...' : 'I\'ve Joined → Go to Dashboard'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.telegramNote}>
                  Note: You can always join later from your dashboard.
                </Text>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  container:{flex:1},
  gradient:{flex:1},
  scrollContent:{
    padding:24*scale,
    paddingTop: Platform.OS === 'ios' ? 60*scale : 80*scale, // ✅ Adjust for iOS status bar
    paddingBottom: 40*scale,
  },
  safe: {
    flex: 1,
    backgroundColor: '#000000',
  },
  formContainer: {
    flex: 1,
  },
  otpContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  telegramContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title:{
    fontSize:30*scale,
    fontWeight:'700',
    marginBottom:20*scale,
    textAlign:'center',
    color: '#000', // ✅ Ensure text is visible on iOS
  },
  subtitle:{
    textAlign:'center',
    marginBottom:20*scale,
    color:'#666',
  },
  input:{
    backgroundColor:'#fff',
    borderRadius:10,
    padding:14*scale,
    marginBottom:14*scale,
    borderWidth:1,
    borderColor:'#ddd',
    fontSize:16*scale,
    color: '#000', // ✅ FIXED: Explicit black text color for iOS
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 14*scale,
  },
  passwordInput: {
    paddingRight: 50*scale,
  },
  passwordToggle: {
    position: 'absolute',
    right: 15*scale,
    top: 15*scale,
    height: 24*scale,
    width: 24*scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput:{
    textAlign:'center',
    fontSize:24*scale,
    letterSpacing:8*scale,
    color: '#000', // ✅ FIXED: Explicit black text color for iOS
  },
  nextButton:{
    height:55*scale,
    borderRadius:10,
    overflow:'hidden',
    marginTop:20*scale,
  },
  buttonGradient:{
    flex:1,
    justifyContent:'center',
    alignItems:'center',
  },
  buttonText:{
    color:'#fff',
    fontWeight:'700',
    fontSize:16*scale,
  },
  // Error and Message Overlay Styles
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorModal: {
    backgroundColor: '#fff',
    borderRadius: 15*scale,
    padding: 24*scale,
    width: '85%',
    maxWidth: 400*scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16*scale,
  },
  errorTitle: {
    fontSize: 20*scale,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  closeButton: {
    padding: 4*scale,
  },
  errorModalText: {
    fontSize: 16*scale,
    color: '#374151',
    lineHeight: 22*scale,
    marginBottom: 24*scale,
  },
  errorOkButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8*scale,
    padding: 14*scale,
    alignItems: 'center',
  },
  errorOkButtonText: {
    color: '#fff',
    fontSize: 16*scale,
    fontWeight: '600',
  },
  // Success Message Overlay
  messageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  messageModal: {
    backgroundColor: '#fff',
    borderRadius: 15*scale,
    padding: 24*scale,
    width: '85%',
    maxWidth: 400*scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16*scale,
  },
  messageTitle: {
    fontSize: 20*scale,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  messageModalText: {
    fontSize: 16*scale,
    color: '#374151',
    lineHeight: 22*scale,
    marginBottom: 24*scale,
  },
  messageOkButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8*scale,
    padding: 14*scale,
    alignItems: 'center',
  },
  messageOkButtonText: {
    color: '#fff',
    fontSize: 16*scale,
    fontWeight: '600',
  },
  roleContainer:{
    flexDirection:'row',
    marginBottom:20*scale,
    gap:10*scale,
  },
  roleButton:{
    flex:1,
    padding:16*scale,
    borderRadius:12,
    backgroundColor:'#f3f4f6',
    alignItems:'center',
    justifyContent:'center',
    borderWidth:1,
    borderColor:'#e5e7eb',
  },
  roleButtonActive:{
    borderColor:'#7C3AED',
    borderWidth:2,
    backgroundColor:'#ede9fe',
  },
  roleText:{
    fontWeight:'700',
    fontSize:16*scale,
    color:'#1f2937',
  },
  roleSubText:{
    fontSize:12*scale,
    color:'#6b7280',
    marginTop:4*scale,
  },
  creatorTypesButton:{
    backgroundColor:'#f8fafc',
    borderRadius:10,
    padding:14*scale,
    marginBottom:14*scale,
    borderWidth:1,
    borderColor:'#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorTypesButtonText:{
    color:'#475569',
    fontSize:14*scale,
    flex: 1,
  },
  creatorTypesButtonArrow:{
    color:'#475569',
    fontSize:14*scale,
    marginLeft: 10*scale,
  },
  creatorTypesDropdown:{
    backgroundColor:'#f9fafb',
    borderRadius:10,
    marginBottom:14*scale,
    borderWidth:1,
    borderColor:'#e5e7eb',
    maxHeight: 250*scale,
  },
  creatorTypesLabel:{
    fontSize:14*scale,
    fontWeight:'600',
    color:'#374151',
    marginBottom:12*scale,
    padding: 16*scale,
    paddingBottom: 0,
  },
  creatorTypesList: {
    maxHeight: 200*scale,
  },
  creatorTypesListContent: {
    padding: 16*scale,
    paddingTop: 8*scale,
  },
  checkboxContainer:{
    flexDirection:'row',
    alignItems:'center',
    marginBottom:12*scale,
    paddingRight: 10*scale,
  },
  checkbox:{
    width: 22*scale,
    height: 22*scale,
    borderRadius: 4*scale,
    borderWidth: 2,
    borderColor: '#7C3AED',
    marginRight: 12*scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked:{
    backgroundColor: '#7C3AED',
  },
  checkboxIcon:{
    color: '#fff',
    fontSize: 14*scale,
    fontWeight: 'bold',
  },
  checkboxLabel:{
    flex:1,
    fontSize:14*scale,
    color:'#4b5563',
    lineHeight: 18*scale,
  },
  telegramNote:{
    textAlign:'center',
    marginTop:20*scale,
    fontSize:12*scale,
    color:'#666',
    fontStyle:'italic',
    paddingHorizontal:20*scale,
  },
});