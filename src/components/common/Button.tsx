// src/components/common/Button.tsx

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getShadowStyle } from '../../utils/platform';
import colors from '../../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  gradient?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  gradient = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      ...styles[`button_${size}`],
      ...(fullWidth && styles.buttonFullWidth),
      ...(isDisabled && styles.buttonDisabled),
    };

    // Si no usa gradiente, aplicar color de fondo
    if (!gradient) {
      baseStyle.backgroundColor = getBackgroundColor();
    }

    return baseStyle;
  };

  const getBackgroundColor = () => {
    if (isDisabled) return colors.gray[300];
    
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'danger':
        return colors.error;
      case 'outline':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextStyle = (): TextStyle => ({
    ...styles.text,
    ...styles[`text_${size}`],
    ...styles[`text_${variant}`],
    ...(isDisabled && styles.textDisabled),
    ...textStyle,
  });

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return ['#226bfc', '#1a56d4'];
      case 'secondary':
        return ['#50b287', '#3d9870'];
      case 'danger':
        return ['#e74c3c', '#c0392b'];
      default:
        return ['#226bfc', '#1a56d4'];
    }
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </>
  );

  if (gradient && variant !== 'outline' && !isDisabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[getButtonStyle(), style]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[getButtonStyle(), style]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...getShadowStyle(4),
  },
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      },
    }),
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  text: {
    fontWeight: 'bold',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: '#fff',
  },
  text_danger: {
    color: '#fff',
  },
  text_outline: {
    color: colors.primary,
  },
  textDisabled: {
    color: colors.gray[500],
  },
});