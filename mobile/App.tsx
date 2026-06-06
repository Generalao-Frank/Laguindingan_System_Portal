import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TeacherNavigator from './src/navigation/TeacherNavigator';
import StudentNavigator from './src/navigation/StudentNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function App() {
  const navigationRef = useRef(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const role = await AsyncStorage.getItem('userRole');
      
      // console.log('=== AUTH CHECK ===');
      // console.log('Token:', token ? `${token.substring(0, 20)}...` : 'No');
      // console.log('Role:', role);
      
      // Only set role if token exists
      if (token && role) {
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error:', error);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [refresh]);

  const handleLoginSuccess = () => {
    console.log('Login success, refreshing...');
    setRefresh(prev => prev + 1);
  };

  const handleLogout = () => {
  console.log('Logout triggered, refreshing app...');
  // Use setTimeout to ensure storage is cleared first
  setTimeout(() => {
    setRefresh(prev => prev + 1);
  }, 100);
};

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!userRole) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // console.log('Rendering:', userRole === 'Teacher' ? 'TeacherNavigator' : 'StudentNavigator');
  
  return (
    <NavigationContainer ref={navigationRef}>
      {userRole === 'Teacher' ? (
        <TeacherNavigator onLogout={handleLogout} />
      ) : (
        <StudentNavigator onLogout={handleLogout} />
      )}
    </NavigationContainer>
  );
}