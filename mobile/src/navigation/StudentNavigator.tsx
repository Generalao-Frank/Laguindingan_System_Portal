import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import StudentDashboardScreen from '../screens/Student/StudentDashboardScreen';
import StudentGradesScreen from '../screens/Student/StudentGradesScreen';
import StudentAttendanceScreen from '../screens/Student/StudentAttendanceScreen';
import StudentActivitiesScreen from '../screens/Student/StudentActivitiesScreen';
import StudentProfileScreen from '../screens/Student/StudentProfileScreen';
import StudentAnnouncementsScreen from '../screens/Student/StudentAnnouncementsScreen';

export type StudentRootStackParamList = {
  Dashboard: undefined;
};

export type StudentTabParamList = {
  Dashboard: undefined;
  Grades: undefined;
  Attendance: undefined;
  Activities: undefined;
  Announcements: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<StudentRootStackParamList>();
const Tab = createBottomTabNavigator<StudentTabParamList>();

interface StudentNavigatorProps {
  onLogout?: () => void;
}

function StudentTabs({ onLogout }: { onLogout?: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName: any;
          let IconComponent: any = Ionicons;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline'; // Ginawang 'grid' para mas bagay sa high-end dashboard
          } else if (route.name === 'Attendance') {
            IconComponent = Feather;
            iconName = 'calendar';
          } else if (route.name === 'Activities') {
            IconComponent = MaterialCommunityIcons;
            iconName = focused ? 'comment-text' : 'comment-text-outline';
          } else if (route.name === 'Grades') {
            IconComponent = Feather;
            iconName = 'book-open';
          } else if (route.name === 'Announcements') {
            IconComponent = Feather;
            iconName = 'bell';
          } else if (route.name === 'Profile') {
            IconComponent = Feather;
            iconName = 'user';
          }

          return (
            <View style={[styles.iconWrapper, focused && styles.activeWrapper]}>
              <IconComponent 
                name={iconName} 
                size={20} 
                color={focused ? '#FFFFFF' : '#94A3B8'} 
              />
            </View>
          );
        },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6366F1', // Neon Indigo Accent
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={StudentDashboardScreen} />
      <Tab.Screen name="Attendance" component={StudentAttendanceScreen} />
      <Tab.Screen name="Activities" component={StudentActivitiesScreen} />
      <Tab.Screen name="Grades" component={StudentGradesScreen} />
      <Tab.Screen name="Announcements" component={StudentAnnouncementsScreen} />
      <Tab.Screen 
        name="Profile" 
        component={() => <StudentProfileScreen onLogout={onLogout} />} 
      />
    </Tab.Navigator>
  );
}

export default function StudentNavigator({ onLogout }: StudentNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard">
        {() => <StudentTabs onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.95)', // Premium Translucent Dark Slate
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)', // Glassmorphism soft border
    borderTopWidth: 0,
    
    // Smooth High Graphic Shadows
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
    
    // Alignment safety configurations
    paddingHorizontal: 8,
    paddingBottom: 0, 
    justifyContent: 'center',
  },
  iconWrapper: {
  width: 44,
  height: 44,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 14,
  backgroundColor: 'transparent',
},
  activeWrapper: {
    backgroundColor: '#6366F1', // Glowing Neon Indigo
    
    // Glow/Neon Shadow configuration
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    
    // Slanted push micro-interaction look
    transform: [{ translateY: -4 }],
  },
});