import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from '../api/client';

// Configure notification handler
export const configureNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,      // ✅ changed from shouldShowAlert
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

// Get Expo push token
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    // Set up Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    // Get the token
    const token = await Notifications.getExpoPushTokenAsync();
    console.log('Expo Push Token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

// Add notification listeners
export const addNotificationListeners = (navigation: any) => {
  // When notification is received while app is open
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });
  
  // When user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('User tapped notification:', data);
    
    // Navigate based on notification type
    if (data?.type === 'meeting') {
      navigation.navigate('Meetings');
    } else if (data?.type === 'activity') {
      navigation.navigate('Activities');
    }
  });
  
  return { notificationListener, responseListener };
};

// Send token to backend
export const sendTokenToBackend = async (token: string) => {
  try {
    await apiClient.post('/teacher/expo-token', { expo_token: token });
    console.log('Token saved to backend');
  } catch (error) {
    console.error('Failed to save token:', error);
  }
};