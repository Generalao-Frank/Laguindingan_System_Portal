import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/Teacher/DashboardScreen';
import AttendanceScreen from '../screens/Teacher/AttendanceScreen';
import ActivitiesScreen from '../screens/Teacher/ActivitiesScreen';
import MeetingsScreen from '../screens/Teacher/MeetingsScreen'; 
import ProfileScreen from '../screens/Teacher/ProfileScreen';
import GradeSubjectsScreen from '../screens/Teacher/GradeSubjectsScreen';
import GradeEncodingScreen from '../screens/Teacher/GradeEncodingScreen';


// Remove Login from here
export type RootStackParamList = {
  Dashboard: undefined;
  GradeSubjects: undefined;
  GradeEncoding: {
    subject_id: number;
    subject_name: string;
    section_id: number;
    section_name: string;
    grade_level: number;
    quarter_id: number;
  };
};

export type TabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Activities: undefined;
  Meetings: undefined;
  Profile: undefined;
  Grades: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

interface TeacherNavigatorProps {
  onLogout?: () => void;
}

function TeacherTabs({ onLogout }: { onLogout?: () => void }) {
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
          } else if (route.name === 'Meetings') {
            IconComponent = Ionicons;
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Grades') {
            IconComponent = Feather;
            iconName = 'book-open';
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen name="Meetings" component={MeetingsScreen} />
      <Tab.Screen name="Grades" component={GradeSubjectsScreen} />
      <Tab.Screen 
        name="Profile" 
        component={() => <ProfileScreen onLogout={onLogout} />} 
      />
    </Tab.Navigator>
  );
}

export default function TeacherNavigator({ onLogout }: TeacherNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard">
        {() => <TeacherTabs onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="GradeEncoding" component={GradeEncodingScreen} />
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