// // src/context/ThemeContext.tsx
// import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// type Theme = 'light' | 'dark';

// export interface ThemeColors {
//   background: string;
//   cardBg: string;
//   text: string;
//   muted: string;
//   border: string;
//   inputBg: string;
//   headerBg: string;
//   avatarBg: string;
// }

// const lightColors: ThemeColors = {
//   background: '#F9F7F2',
//   cardBg: '#FFF',
//   text: '#2C3647',
//   muted: '#999',
//   border: '#EAE6DF',
//   inputBg: '#F9F7F2',
//   headerBg: '#FFF',
//   avatarBg: '#F9F7F2',
// };

// const darkColors: ThemeColors = {
//   background: '#121212',
//   cardBg: '#1E1E1E',
//   text: '#F0F0F0',
//   muted: '#A0A0A0',
//   border: '#333',
//   inputBg: '#2C2C2C',
//   headerBg: '#1E1E1E',
//   avatarBg: '#2C2C2C',
// };

// interface ThemeContextType {
//   theme: Theme;
//   toggleTheme: () => void;
//   colors: ThemeColors;
// }

// const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// export const ThemeProvider = ({ children }: { children: ReactNode }) => {
//   const [theme, setTheme] = useState<Theme>('light');
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const loadTheme = async () => {
//       try {
//         const saved = await AsyncStorage.getItem('appTheme');
//         if (saved === 'light' || saved === 'dark') setTheme(saved);
//       } catch (error) {
//         console.warn('Failed to load theme', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     loadTheme();
//   }, []);

//   const toggleTheme = async () => {
//     const newTheme = theme === 'light' ? 'dark' : 'light';
//     setTheme(newTheme);
//     await AsyncStorage.setItem('appTheme', newTheme);
//   };

//   const colors = theme === 'light' ? lightColors : darkColors;

//   if (isLoading) return null; // or a loading spinner

//   return (
//     <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// };

// export const useTheme = (): ThemeContextType => {
//   const context = useContext(ThemeContext);
//   if (!context) {
//     // Fallback: return light theme to prevent crash
//     console.warn('useTheme called outside ThemeProvider – using fallback light theme');
//     return {
//       theme: 'light',
//       toggleTheme: () => {},
//       colors: lightColors,
//     };
//   }
//   return context;
// };