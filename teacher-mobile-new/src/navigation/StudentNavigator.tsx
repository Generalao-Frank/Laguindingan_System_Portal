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
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Attendance') {
            IconComponent = Feather;
            iconName = 'calendar';
          } else if (route.name === 'Activities') {
            IconComponent = MaterialCommunityIcons;
            iconName = 'comment-text-outline';
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
              <IconComponent name={iconName} size={22} color={focused ? '#fff' : '#A8A196'} />
            </View>
          );
        },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#A8A196',
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
    bottom: -5,
    left: 20,
    right: 20,
    height: 85,
    borderRadius: 40,
    backgroundColor: '#FDFBF7',
    borderTopWidth: 0,
    shadowColor: '#D1C7B7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  iconWrapper: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22.5,
  },
  activeWrapper: {
    backgroundColor: '#C4B196',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    marginTop: -5,
  },
});