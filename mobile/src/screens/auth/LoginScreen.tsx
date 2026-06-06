import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient, { refreshApiKey, getCurrentApiKey } from '../../api/client';

const { height } = Dimensions.get('window');

type Props = {
  onLoginSuccess?: () => void;
};

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);
  
  // Version check state
  const [checkingVersion, setCheckingVersion] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  // Check app version on mount
  useEffect(() => {
    checkAppVersion();
  }, []);

  // Countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Check app version and API key
  const checkAppVersion = async () => {
    try {
      // Try to get API key first (will auto-fetch if needed)
      await refreshApiKey();
      
      const response = await apiClient.get('/mobile-config');
      if (response.data) {
        const minVersion = response.data.min_version;
        const currentVersion = '1.0.0'; // Update this with your actual app version
        const forceUpdateFlag = response.data.force_update || false;
        
        // Compare versions (simplified)
        if (compareVersions(currentVersion, minVersion) < 0 || forceUpdateFlag) {
          setForceUpdate(true);
          setUpdateMessage(response.data.update_message || 'Please update your app to the latest version to continue.');
          Alert.alert(
            'Update Required',
            updateMessage || 'A new version of the app is available. Please update to continue.',
            [
              {
                text: 'Update Now',
                onPress: () => {
                  // Open app store link
                  // For Android: 'market://details?id=your.package.name'
                  // For iOS: 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID'
                },
              },
            ],
            { cancelable: false }
          );
        }
      }
    } catch (error) {
      console.log('Version check error:', error);
    } finally {
      setCheckingVersion(false);
    }
  };

  // Helper function to compare versions
  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 !== num2) return num1 - num2;
    }
    return 0;
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/login', {
        username: username.trim(),
        password,
        device_type: 'mobile'
      });

      if (res.data.token) {
        await AsyncStorage.setItem('userToken', res.data.token);
        await AsyncStorage.setItem('userRole', res.data.user.role);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));

        const fullName = `${res.data.user.first_name} ${res.data.user.last_name}`;
        Alert.alert('Success', `Welcome ${fullName}!`);

        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        Alert.alert('Login Failed', 'No token received from server');
      }
    } catch (err: any) {
      let errorMessage = 'Login failed';
      
      // Check if it's an API key error
      if (err.response?.status === 403 && err.response?.data?.message?.includes('API key')) {
        errorMessage = 'API key error. Refreshing... Please try again.';
        // Try to refresh API key
        await refreshApiKey();
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiClient.post('/forgot-password', {
        email: forgotEmail,
      });

      if (res.data.success) {
        Alert.alert('Success', 'OTP code sent to your email!');
        setStep(2);
        setCountdown(60);
        setResendDisabled(true);
      } else {
        Alert.alert('Error', res.data.message || 'Email not found');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP code');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiClient.post('/verify-otp', {
        email: forgotEmail,
        otp: otpCode,
      });

      if (res.data.success) {
        Alert.alert('Success', 'OTP verified! You can now reset your password.');
        setStep(3);
      } else {
        Alert.alert('Error', res.data.message || 'Invalid OTP code');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiClient.post('/reset-password', {
        email: forgotEmail,
        otp: otpCode,
        new_password: newPassword,
      });

      if (res.data.success) {
        Alert.alert('Success', 'Password reset successfully! You can now login.');
        closeForgotModal();
      } else {
        Alert.alert('Error', res.data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendDisabled) return;

    setForgotLoading(true);
    try {
      const res = await apiClient.post('/forgot-password', {
        email: forgotEmail,
      });

      if (res.data.success) {
        Alert.alert('Success', 'New OTP code sent to your email!');
        setCountdown(60);
        setResendDisabled(true);
      } else {
        Alert.alert('Error', res.data.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setStep(1);
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Show loading screen while checking version
  if (checkingVersion) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e1b4b', '#312e81', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Checking for updates...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1e1b4b', '#312e81', '#4f46e5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentWrapper}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../../assets/les_logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeText}>Login Portal</Text>
              <Text style={styles.schoolName}>LAGUINDINGAN CENTRAL SCHOOL</Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              {/* Username Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>USERNAME</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="user" size={18} color="#a5b4fc" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                    <Text style={styles.forgotText}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={18} color="#a5b4fc" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color="#a5b4fc"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerLinks}>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Help Desk</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.footerText}>
                This system is for authorized Laguindingan ES personnel only.
                {'\n'}All activities are logged and monitored for security.
              </Text>
              <View style={styles.securityBadge}>
                <Feather name="shield" size={10} color="#a5b4fc" />
                <Text style={styles.securityText}>© LCS Portal 2026</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeForgotModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={closeForgotModal}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Step 1: Email Input */}
            {step === 1 && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Email Address</Text>
                <View style={styles.modalInputWrapper}>
                  <Feather name="mail" size={18} color="#a5b4fc" style={styles.modalInputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter your registered email"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.modalHint}>
                  We'll send a verification code to this email address
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleSendOTP}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Verification Code</Text>
                <View style={styles.modalInputWrapper}>
                  <Feather name="key" size={18} color="#a5b4fc" style={styles.modalInputIcon} />
                  <TextInput
                    style={[styles.modalInput, { textAlign: 'center', letterSpacing: 8 }]}
                    placeholder="000000"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <Text style={styles.modalHint}>
                  Enter the 6-digit code sent to {forgotEmail}
                </Text>
                
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalButtonHalf, styles.modalButtonSecondary]}
                    onPress={() => setStep(1)}
                  >
                    <Text style={styles.modalButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButtonHalf, styles.modalButtonPrimary]}
                    onPress={handleVerifyOTP}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resendDisabled}
                  style={styles.resendButton}
                >
                  <Text style={[styles.resendText, resendDisabled && { opacity: 0.5 }]}>
                    {resendDisabled ? `Resend code in ${countdown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Reset Password */}
            {step === 3 && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>New Password</Text>
                <View style={styles.modalInputWrapper}>
                  <Feather name="lock" size={18} color="#a5b4fc" style={styles.modalInputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter new password"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color="#a5b4fc" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Confirm Password</Text>
                <View style={styles.modalInputWrapper}>
                  <Feather name="lock" size={18} color="#a5b4fc" style={styles.modalInputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    secureTextEntry={!showNewPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalButtonHalf, styles.modalButtonSecondary]}
                    onPress={() => setStep(2)}
                  >
                    <Text style={styles.modalButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButtonHalf, styles.modalButtonPrimary]}
                    onPress={handleResetPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  contentWrapper: {
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  logo: {
    width: 60,
    height: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c7d2fe',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c7d2fe',
    marginBottom: 6,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#a5b4fc',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  loginButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 10,
    fontWeight: '500',
    color: '#c7d2fe',
  },
  footerText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#a5b4fc',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityText: {
    fontSize: 8,
    color: '#a5b4fc',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1e1b4b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    gap: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c7d2fe',
    marginTop: 4,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalInputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  modalHint: {
    fontSize: 10,
    color: '#a5b4fc',
    marginBottom: 8,
  },
  modalButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonHalf: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#4f46e5',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  resendText: {
    fontSize: 11,
    color: '#a5b4fc',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 14,
  },
});