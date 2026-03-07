// Signup.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 403;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

type Step = 'form' | 'otp' | 'telegram';

// Comprehensive country list with dial codes
const COUNTRIES = [
  // Africa
  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'GH', name: 'Ghana', dialCode: '+233' },
  { code: 'KE', name: 'Kenya', dialCode: '+254' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'EG', name: 'Egypt', dialCode: '+20' },
  { code: 'MA', name: 'Morocco', dialCode: '+212' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213' },
  { code: 'LY', name: 'Libya', dialCode: '+218' },
  { code: 'SD', name: 'Sudan', dialCode: '+249' },
  { code: 'SS', name: 'South Sudan', dialCode: '+211' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253' },
  { code: 'SO', name: 'Somalia', dialCode: '+252' },
  { code: 'UG', name: 'Uganda', dialCode: '+256' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250' },
  { code: 'BI', name: 'Burundi', dialCode: '+257' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
  { code: 'MW', name: 'Malawi', dialCode: '+265' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261' },
  { code: 'KM', name: 'Comoros', dialCode: '+269' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248' },
  { code: 'MU', name: 'Mauritius', dialCode: '+230' },
  { code: 'RE', name: 'Réunion', dialCode: '+262' },
  { code: 'YT', name: 'Mayotte', dialCode: '+262' },
  { code: 'BW', name: 'Botswana', dialCode: '+267' },
  { code: 'NA', name: 'Namibia', dialCode: '+264' },
  { code: 'SZ', name: 'Eswatini', dialCode: '+268' },
  { code: 'LS', name: 'Lesotho', dialCode: '+266' },
  { code: 'AO', name: 'Angola', dialCode: '+244' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237' },
  { code: 'CF', name: 'Central African Republic', dialCode: '+236' },
  { code: 'TD', name: 'Chad', dialCode: '+235' },
  { code: 'CG', name: 'Republic of the Congo', dialCode: '+242' },
  { code: 'CD', name: 'DR Congo', dialCode: '+243' },
  { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240' },
  { code: 'GA', name: 'Gabon', dialCode: '+241' },
  { code: 'ST', name: 'São Tomé and Príncipe', dialCode: '+239' },
  { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245' },
  { code: 'GN', name: 'Guinea', dialCode: '+224' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232' },
  { code: 'LR', name: 'Liberia', dialCode: '+231' },
  { code: 'CI', name: 'Ivory Coast', dialCode: '+225' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226' },
  { code: 'ML', name: 'Mali', dialCode: '+223' },
  { code: 'SN', name: 'Senegal', dialCode: '+221' },
  { code: 'GM', name: 'Gambia', dialCode: '+220' },
  { code: 'CV', name: 'Cape Verde', dialCode: '+238' },
  { code: 'MR', name: 'Mauritania', dialCode: '+222' },
  { code: 'NE', name: 'Niger', dialCode: '+227' },
  { code: 'BJ', name: 'Benin', dialCode: '+229' },
  { code: 'TG', name: 'Togo', dialCode: '+228' },
  
  // North America
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'CU', name: 'Cuba', dialCode: '+53' },
  { code: 'JM', name: 'Jamaica', dialCode: '+1-876' },
  { code: 'HT', name: 'Haiti', dialCode: '+509' },
  { code: 'DO', name: 'Dominican Republic', dialCode: '+1-809' },
  { code: 'PR', name: 'Puerto Rico', dialCode: '+1-787' },
  { code: 'BS', name: 'Bahamas', dialCode: '+1-242' },
  { code: 'BB', name: 'Barbados', dialCode: '+1-246' },
  { code: 'TT', name: 'Trinidad and Tobago', dialCode: '+1-868' },
  
  // Central America
  { code: 'GT', name: 'Guatemala', dialCode: '+502' },
  { code: 'BZ', name: 'Belize', dialCode: '+501' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503' },
  { code: 'HN', name: 'Honduras', dialCode: '+504' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506' },
  { code: 'PA', name: 'Panama', dialCode: '+507' },
  
  // South America
  { code: 'BR', name: 'Brazil', dialCode: '+55' },
  { code: 'AR', name: 'Argentina', dialCode: '+54' },
  { code: 'CL', name: 'Chile', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', dialCode: '+57' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58' },
  { code: 'PE', name: 'Peru', dialCode: '+51' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598' },
  { code: 'GY', name: 'Guyana', dialCode: '+592' },
  { code: 'SR', name: 'Suriname', dialCode: '+597' },
  { code: 'GF', name: 'French Guiana', dialCode: '+594' },
  { code: 'FK', name: 'Falkland Islands', dialCode: '+500' },
  
  // Europe
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'IS', name: 'Iceland', dialCode: '+354' },
  { code: 'IE', name: 'Ireland', dialCode: '+353' },
  { code: 'RU', name: 'Russia', dialCode: '+7' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'SK', name: 'Slovakia', dialCode: '+421' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'RO', name: 'Romania', dialCode: '+40' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359' },
  { code: 'RS', name: 'Serbia', dialCode: '+381' },
  { code: 'HR', name: 'Croatia', dialCode: '+385' },
  { code: 'SI', name: 'Slovenia', dialCode: '+386' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '+387' },
  { code: 'ME', name: 'Montenegro', dialCode: '+382' },
  { code: 'MK', name: 'North Macedonia', dialCode: '+389' },
  { code: 'AL', name: 'Albania', dialCode: '+355' },
  { code: 'GR', name: 'Greece', dialCode: '+30' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357' },
  { code: 'MT', name: 'Malta', dialCode: '+356' },
  
  // Asia
  { code: 'CN', name: 'China', dialCode: '+86' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', dialCode: '+82' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'NP', name: 'Nepal', dialCode: '+977' },
  { code: 'BT', name: 'Bhutan', dialCode: '+975' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95' },
  { code: 'TH', name: 'Thailand', dialCode: '+66' },
  { code: 'LA', name: 'Laos', dialCode: '+856' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
  { code: 'PH', name: 'Philippines', dialCode: '+63' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  { code: 'TL', name: 'Timor-Leste', dialCode: '+670' },
  { code: 'BN', name: 'Brunei', dialCode: '+673' },
  
  // Middle East
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'QA', name: 'Qatar', dialCode: '+974' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973' },
  { code: 'OM', name: 'Oman', dialCode: '+968' },
  { code: 'YE', name: 'Yemen', dialCode: '+967' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964' },
  { code: 'IR', name: 'Iran', dialCode: '+98' },
  { code: 'SY', name: 'Syria', dialCode: '+963' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961' },
  { code: 'JO', name: 'Jordan', dialCode: '+962' },
  { code: 'IL', name: 'Israel', dialCode: '+972' },
  { code: 'PS', name: 'Palestine', dialCode: '+970' },
  { code: 'TR', name: 'Turkey', dialCode: '+90' },
  
  // Oceania
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { code: 'PG', name: 'Papua New Guinea', dialCode: '+675' },
  { code: 'FJ', name: 'Fiji', dialCode: '+679' },
  { code: 'SB', name: 'Solomon Islands', dialCode: '+677' },
  { code: 'VU', name: 'Vanuatu', dialCode: '+678' },
  { code: 'NC', name: 'New Caledonia', dialCode: '+687' },
  { code: 'PF', name: 'French Polynesia', dialCode: '+689' },
  { code: 'WS', name: 'Samoa', dialCode: '+685' },
  { code: 'TO', name: 'Tonga', dialCode: '+676' },
  { code: 'KI', name: 'Kiribati', dialCode: '+686' },
  { code: 'FM', name: 'Micronesia', dialCode: '+691' },
  { code: 'MH', name: 'Marshall Islands', dialCode: '+692' },
  { code: 'PW', name: 'Palau', dialCode: '+680' },
  { code: 'TV', name: 'Tuvalu', dialCode: '+688' },
  { code: 'NR', name: 'Nauru', dialCode: '+674' },
  
  // Caribbean
  { code: 'AW', name: 'Aruba', dialCode: '+297' },
  { code: 'CW', name: 'Curaçao', dialCode: '+599' },
  { code: 'BQ', name: 'Caribbean Netherlands', dialCode: '+599' },
  { code: 'SX', name: 'Sint Maarten', dialCode: '+1-721' },
  { code: 'MF', name: 'Saint Martin', dialCode: '+590' },
  { code: 'BL', name: 'Saint Barthélemy', dialCode: '+590' },
  { code: 'GP', name: 'Guadeloupe', dialCode: '+590' },
  { code: 'MQ', name: 'Martinique', dialCode: '+596' },
  { code: 'AN', name: 'Netherlands Antilles', dialCode: '+599' },
  
  // Others
  { code: 'VA', name: 'Vatican City', dialCode: '+379' },
  { code: 'MC', name: 'Monaco', dialCode: '+377' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
  { code: 'SM', name: 'San Marino', dialCode: '+378' },
  { code: 'AD', name: 'Andorra', dialCode: '+376' },
];

// Sort countries alphabetically for better UX
const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

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
    console.log('Attempting to store token:', token ? 'Token exists' : 'No token');
    
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync('userToken', token);
      console.log('Token stored in SecureStore');
    }
    
    await AsyncStorage.setItem('userToken', token);
    console.log('Token stored in AsyncStorage');
    
    const decoded = parseJwt(token);
    if (decoded) {
      const userInfo = {
        email: decoded.email,
        role: decoded.role,
        name: decoded.name || decoded.firstName || '',
        id: decoded.id
      };
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      console.log('User info stored:', userInfo);
    }
    
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

const SignupScreen = () => {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Add initial loading state
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Country selection state
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [isDetectingCountry, setIsDetectingCountry] = useState(true);

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
    country: 'NG',
  });


  // Multi-method country detection with proper error handling
  useEffect(() => {
    let isMounted = true;
    let locationSubscription: any = null;
    
    const detectCountry = async () => {
      try {
        setIsDetectingCountry(true);
        let detected = 'NG'; // Default fallback
        let detectionMethod = 'default';

        // Only try GPS on native platforms (MOST ACCURATE - PRIORITY 1)
        if (Platform.OS !== 'web') {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              // Use watchPositionAsync with timeout for better control
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 10000, // 10 second timeout
              });
              
              if (location) {
                const [reverseGeocode] = await Location.reverseGeocodeAsync(location.coords);
                if (reverseGeocode?.isoCountryCode) {
                  const countryCode = reverseGeocode.isoCountryCode;
                  // Validate if country exists in our list
                  const validCountry = COUNTRIES.find(c => c.code === countryCode);
                  if (validCountry) {
                    detected = validCountry.code;
                    detectionMethod = 'gps';
                    console.log('📍 Country detected from GPS:', detected);
                  } else {
                    console.log(`📍 GPS detected unsupported country: ${countryCode}, using fallback`);
                  }
                }
              }
            } else {
              console.log('📍 Location permission denied');
            }
          } catch (locationErr) {
            console.warn('📍 GPS detection failed:', locationErr);
            // Continue to next method
          }
        }

        // Only use locale if GPS failed or returned default (PRIORITY 2)
        if (detected === 'NG' && detectionMethod === 'default') {
          try {
            const locales = Localization.getLocales();
            const locale = locales?.[0];
            
            const region = locale?.regionCode || locale?.countryCode || '';
            
            if (region) {
              const countryCode = region.toUpperCase();
              const validCountry = COUNTRIES.find(c => c.code === countryCode);
              if (validCountry) {
                detected = validCountry.code;
                detectionMethod = 'locale';
                console.log('🌍 Country detected from locale:', detected);
              } else {
                console.log(`🌍 Locale detected unsupported country: ${countryCode}, using fallback`);
              }
            }
          } catch (localeErr) {
            console.warn('🌍 Locale detection failed:', localeErr);
          }
        }

        // Try IP-based as last resort (PRIORITY 3)
        if (detected === 'NG' && detectionMethod === 'default') {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://ipapi.co/json/', {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              if (data.country_code) {
                const countryCode = data.country_code;
                const validCountry = COUNTRIES.find(c => c.code === countryCode);
                if (validCountry) {
                  detected = validCountry.code;
                  detectionMethod = 'ip';
                  console.log('🌐 Country detected from IP:', detected);
                } else {
                  console.log(`🌐 IP detected unsupported country: ${countryCode}, using fallback`);
                }
              }
            }
          } catch (ipErr) {
            console.warn('🌐 IP detection failed:', ipErr);
          }
        }

        // Final validation - ensure detected country exists in our list
        const finalCountry = COUNTRIES.find(c => c.code === detected);
        if (!finalCountry) {
          console.log(`⚠️ Detected country ${detected} not in supported list, defaulting to NG`);
          detected = 'NG';
          detectionMethod = 'default-fallback';
        }

        // Update state if component is still mounted
        if (isMounted) {
          setFormData(prev => ({ ...prev, country: detected }));
          console.log(`✅ Using country: ${detected} (${getCountryName(detected)}) detected via: ${detectionMethod}`);
        }

      } catch (err) {
        console.warn('Country detection error, using Nigeria as default:', err);
        if (isMounted) {
          setFormData(prev => ({ ...prev, country: 'NG' }));
        }
      } finally {
        if (isMounted) {
          setIsDetectingCountry(false);
          setInitialLoading(false);
        }
      }
    };

    detectCountry();

    // Cleanup function
    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Helper function to get country name from code
  const getCountryName = (code: string) => {
    return COUNTRIES.find(c => c.code === code)?.name || code;
  };

  const update = (key: string, value: string) =>
    setFormData({ ...formData, [key]: value });

  const handleSignup = async () => {
    setError(null);
    
    if (formData.password !== formData.confirm)
      return setError('Passwords do not match');
    
    if (!formData.email || !formData.password || !formData.phone) {
      return setError('Please fill in all required fields');
    }

    if (formData.role === 'clipper' && (!formData.firstName || !formData.lastName)) {
      return setError('Please enter your first and last name');
    }

    if (formData.role === 'advertiser' && !formData.contactName) {
      return setError('Please enter contact person name');
    }

    // Validate phone number format based on country
    const selectedCountry = COUNTRIES.find(c => c.code === formData.country);
    if (selectedCountry && !formData.phone.startsWith(selectedCountry.dialCode)) {
      return setError(`Phone number should start with ${selectedCountry.dialCode} for ${selectedCountry.name}`);
    }

    try {
      setLoading(true);
      
      const signupData = {
        ...formData,
        email: formData.email.toLowerCase(),
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
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const loginAfterVerification = async () => {
    try {
      console.log('Attempting to login after verification for:', formData.email);
      
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await res.json();
      console.log('Login after verification response:', data);
      
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.token) {
        const stored = await storeToken(data.token);
        console.log('Token stored successfully:', stored);
        return data.token;
      } else {
        throw new Error('No token received from login');
      }
    } catch (err: any) {
      console.error('Login after verification error:', err);
      throw err;
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
      console.log('OTP verification response:', data);
      
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      console.log('OTP verified successfully, user role:', formData.role);
      
      if (data.token) {
        console.log('Token received from verification, storing...');
        await storeToken(data.token);
      } else {
        console.log('No token from verification, logging in to get token...');
        await loginAfterVerification();
      }
      
      if (formData.role === 'clipper') {
        console.log('Navigating to telegram step');
        setStep('telegram');
      } else {
        console.log('Navigating to advertiser dashboard');
        router.replace('/(dashboard_advertiser)/advertiser_dashboard');
      }

    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = async () => {
    setTelegramChecking(true);
    
    try {
      const tokenCheck = await AsyncStorage.getItem('userToken');
      console.log('Token check before clipper dashboard navigation:', tokenCheck ? 'Token present' : 'Token missing');
      
      if (!tokenCheck) {
        console.log('Token missing, attempting to login again...');
        await loginAfterVerification();
      }
      
      router.replace('/(dashboard_clipper)/clipper_dashboard');
    } catch (err: any) {
      console.error('Error before dashboard navigation:', err);
      setError('Failed to authenticate. Please try logging in again.');
    } finally {
      setTelegramChecking(false);
    }
  };

  const encodedPhone = base64Encode(formData.phone);

  const dismissError = () => setError(null);
  const dismissMessage = () => setMessage(null);

  const selectCountry = (countryCode: string) => {
    setFormData(prev => ({ ...prev, country: countryCode }));
    setCountryModalVisible(false);
  };


  const getCountryDialCode = (code: string) => {
    return COUNTRIES.find(c => c.code === code)?.dialCode || '';
  };

  // Show loading screen while detecting country
  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.safe, styles.container]}>
        <LinearGradient colors={['rgba(93,45,230,0.7)','rgba(214,207,141,0.5)','rgba(52,211,153,0.1)']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Setting up...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, styles.container]}>     
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <LinearGradient colors={['rgba(93,45,230,0.7)','rgba(214,207,141,0.5)','rgba(52,211,153,0.1)']} style={styles.gradient}>
          
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
                    onPress={() => update('role','clipper')}
                  >
                    <Text style={styles.roleText}>Clipper & Creators</Text>
                    <Text style={styles.roleSubText}>Make UGCs & Earn per view</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.roleButton, formData.role==='advertiser'&&styles.roleButtonActive]} 
                    onPress={() => update('role','advertiser')}
                  >
                    <Text style={styles.roleText}>Advertiser</Text>
                    <Text style={styles.roleSubText}>Run campaigns</Text>
                  </TouchableOpacity>
                </View>

                {/* Country Selection */}
                <TouchableOpacity 
                  style={styles.countrySelector}
                  onPress={() => setCountryModalVisible(true)}
                >
                  <View style={styles.countrySelectorContent}>
                    <Text style={styles.countrySelectorLabel}>Country</Text>
                    <View style={styles.countrySelectorValue}>
                      <Text style={styles.countrySelectorText}>
                        {getCountryName(formData.country)} ({formData.country})
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </View>
                  </View>
                </TouchableOpacity>
           
            {isDetectingCountry && (
              <View style={styles.detectingContainer}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.detectingText}>
                  Detecting your location...
                </Text>
              </View>
            )}
                <TextInput 
                  style={styles.input} 
                  placeholder="Email" 
                  placeholderTextColor="#666"
                  onChangeText={t => update('email',t)} 
                  value={formData.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <View style={styles.passwordContainer}>
                  <TextInput 
                    style={[styles.input, styles.passwordInput]} 
                    placeholder="Password" 
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    onChangeText={t => update('password',t)} 
                    value={formData.password}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordContainer}>
                  <TextInput 
                    style={[styles.input, styles.passwordInput]} 
                    placeholder="Confirm Password" 
                    placeholderTextColor="#666"
                    secureTextEntry={!showConfirmPassword}
                    onChangeText={t => update('confirm',t)} 
                    value={formData.confirm}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                <TextInput 
                  style={styles.input} 
                  placeholder={`Phone (${getCountryDialCode(formData.country)}...)`}
                  placeholderTextColor="#666"
                  onChangeText={t => update('phone',t)} 
                  value={formData.phone}
                  keyboardType="phone-pad"
                />

                {formData.role === 'clipper' ? (
                  <>
                    <TextInput 
                      style={styles.input} 
                      placeholder="First Name" 
                      placeholderTextColor="#666"
                      onChangeText={t => update('firstName',t)} 
                      value={formData.firstName}
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Last Name" 
                      placeholderTextColor="#666"
                      onChangeText={t => update('lastName',t)} 
                      value={formData.lastName}
                    />
                  </>
                ) : (
                  <>
                    <TextInput 
                      style={styles.input} 
                      placeholder="Contact Person Name" 
                      placeholderTextColor="#666"
                      onChangeText={t => update('contactName',t)} 
                      value={formData.contactName}
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Company / Brand (optional)" 
                      placeholderTextColor="#666"
                      onChangeText={t => update('company',t)} 
                      value={formData.company}
                    />
                  </>
                )}

                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={handleSignup}
                  disabled={loading}
                >
                  <LinearGradient colors={['#0F2027','#2C5364']} style={styles.buttonGradient}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Continue →</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {step === 'otp' && (
              <View style={styles.otpContainer}>
                <Text style={styles.title}>Verify Email</Text>
                <Text style={styles.subtitle}>Code sent to: {formData.email}</Text>
                <TextInput 
                  style={[styles.input, styles.otpInput]} 
                  placeholder="000000" 
                  placeholderTextColor="#666"
                  keyboardType="number-pad" 
                  maxLength={6} 
                  onChangeText={t => setOtp(t.replace(/\D/g,''))}
                  value={otp}
                />
                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  <LinearGradient colors={['#16a34a','#059669']} style={styles.buttonGradient}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Verify Email</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {step === 'telegram' && (
              <View style={styles.telegramContainer}>
                <Text style={styles.title}>Final Step</Text>
                <Text style={styles.subtitle}>Join Telegram to activate account</Text>
                
                <Text style={styles.telegramNote}>
                  You are signed up as a <Text style={{fontWeight: 'bold'}}>Clipper</Text>. 
                  Please join our Telegram channel to get campaign updates.
                </Text>
                
                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={() => Linking.openURL(`https://t.me/clippapay?start=${encodedPhone}`)}
                >
                  <LinearGradient colors={['#2563eb','#1d4ed8']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>Open Telegram</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.nextButton, {marginTop:16*scale}]} 
                  onPress={handleGoToDashboard}
                  disabled={telegramChecking}
                >
                  <LinearGradient colors={['#16a34a','#059669']} style={styles.buttonGradient}>
                    {telegramChecking ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>I've Joined → Go to Dashboard</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.telegramNote}>
                  Note: You can always join later from your dashboard.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Country Selection Modal */}
          <Modal
            visible={countryModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setCountryModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Country</Text>
                  <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={COUNTRIES}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.countryItem,
                        formData.country === item.code && styles.countryItemActive
                      ]}
                      onPress={() => selectCountry(item.code)}
                    >
                      <Text style={styles.countryItemName}>{item.name}</Text>
                      <Text style={styles.countryItemCode}>{item.code}</Text>
                      <Text style={styles.countryItemDial}>{item.dialCode}</Text>
                      {formData.country === item.code && (
                        <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                      )}
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          </Modal>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Add new styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 24 * scale,
    paddingTop: Platform.OS === 'ios' ? 20 * scale : 40 * scale,
    paddingBottom: 40 * scale,
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
  title: {
    fontSize: 30 * scale,
    fontWeight: '700',
    marginBottom: 20 * scale,
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20 * scale,
    color: '#d1d5db',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14 * scale,
    marginBottom: 14 * scale,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16 * scale,
    color: '#000',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 14 * scale,
  },
  passwordInput: {
    paddingRight: 50 * scale,
  },
  passwordToggle: {
    position: 'absolute',
    right: 15 * scale,
    top: 15 * scale,
    height: 24 * scale,
    width: 24 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24 * scale,
    letterSpacing: 8 * scale,
    color: '#000',
  },
  nextButton: {
    height: 55 * scale,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 20 * scale,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16 * scale,
  },
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
    borderRadius: 15 * scale,
    padding: 24 * scale,
    width: '85%',
    maxWidth: 400 * scale,
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
    marginBottom: 16 * scale,
  },
  errorTitle: {
    fontSize: 20 * scale,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  closeButton: {
    padding: 4 * scale,
  },
  errorModalText: {
    fontSize: 16 * scale,
    color: '#374151',
    lineHeight: 22 * scale,
    marginBottom: 24 * scale,
  },
  errorOkButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8 * scale,
    padding: 14 * scale,
    alignItems: 'center',
  },
  errorOkButtonText: {
    color: '#fff',
    fontSize: 16 * scale,
    fontWeight: '600',
  },
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
    borderRadius: 15 * scale,
    padding: 24 * scale,
    width: '85%',
    maxWidth: 400 * scale,
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
    marginBottom: 16 * scale,
  },
  messageTitle: {
    fontSize: 20 * scale,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  messageModalText: {
    fontSize: 16 * scale,
    color: '#374151',
    lineHeight: 22 * scale,
    marginBottom: 24 * scale,
  },
  messageOkButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8 * scale,
    padding: 14 * scale,
    alignItems: 'center',
  },
  messageOkButtonText: {
    color: '#fff',
    fontSize: 16 * scale,
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 20 * scale,
    gap: 10 * scale,
  },
  roleButton: {
    flex: 1,
    padding: 16 * scale,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  roleButtonActive: {
    borderColor: '#7C3AED',
    borderWidth: 2,
    backgroundColor: '#ede9fe',
  },
  roleText: {
    fontWeight: '700',
    fontSize: 16 * scale,
    color: '#1f2937',
  },
  roleSubText: {
    fontSize: 12 * scale,
    color: '#6b7280',
    marginTop: 4 * scale,
  },
  telegramNote: {
    textAlign: 'center',
    marginTop: 20 * scale,
    fontSize: 12 * scale,
    color: '#d1d5db',
    fontStyle: 'italic',
    paddingHorizontal: 20 * scale,
  },
  // New styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16 * scale,
    fontSize: 16 * scale,
    color: '#fff',
  },
  countrySelector: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginBottom: 14 * scale,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  countrySelectorContent: {
    padding: 14 * scale,
  },
  countrySelectorLabel: {
    fontSize: 12 * scale,
    color: '#6b7280',
    marginBottom: 4 * scale,
  },
  countrySelectorValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countrySelectorText: {
    fontSize: 16 * scale,
    color: '#1f2937',
    fontWeight: '500',
  },
  detectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14 * scale,
    gap: 8 * scale,
  },
  detectingText: {
    fontSize: 12 * scale,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20 * scale,
    borderTopRightRadius: 20 * scale,
    maxHeight: '80%',
    padding: 20 * scale,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20 * scale,
  },
  modalTitle: {
    fontSize: 20 * scale,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16 * scale,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  countryItemActive: {
    backgroundColor: '#f0fdf4',
  },
  countryItemName: {
    flex: 1,
    fontSize: 16 * scale,
    color: '#1f2937',
  },
  countryItemCode: {
    fontSize: 14 * scale,
    color: '#6b7280',
    marginRight: 8 * scale,
  },
  countryItemDial: {
    fontSize: 14 * scale,
    color: '#6b7280',
    marginRight: 8 * scale,
  },
  quickFixButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8 * scale,
    padding: 10 * scale,
    marginBottom: 14 * scale,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  quickFixText: {
    color: '#fff',
    fontSize: 14 * scale,
    fontWeight: '500',
  },
});

export default SignupScreen;