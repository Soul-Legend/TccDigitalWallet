import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import DIDService from '../services/DIDService';
import StorageService from '../services/StorageService';
import {useAppStore} from '../stores/useAppStore';
import {Routes} from '../utils/routes';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

type InitializationState = 'checking' | 'generating' | 'success' | 'error';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: 48,
      paddingBottom: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    headerIcon: {
      marginRight: 4,
    },
    title: {
      fontSize: scaleFontSize(theme.typography.fontSizeXLarge),
      fontWeight: 'bold',
      color: theme.colors.primary,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    loadingText: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge + 2),
      color: theme.colors.primary,
      marginTop: theme.spacing.lg,
      fontWeight: '600',
    },
    subText: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    successIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(22, 136, 33, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    successTitle: {
      fontSize: scaleFontSize(32),
      fontWeight: '900',
      color: theme.colors.primary,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
      lineHeight: 38,
    },
    successSubtitle: {
      fontSize: scaleFontSize(16),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
      maxWidth: 320,
    },
    didContainer: {
      backgroundColor: '#EEEEEE',
      borderRadius: theme.borderRadius.small,
      padding: 16,
      marginBottom: theme.spacing.xl,
      width: '100%',
      borderLeftWidth: 4,
      borderLeftColor: '#1351B4',
    },
    didLabelRow: {
      marginBottom: theme.spacing.sm,
    },
    didLabel: {
      fontSize: scaleFontSize(12),
      fontWeight: '600',
      color: '#071D41',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    didTextContainer: {
    },
    didText: {
      fontSize: scaleFontSize(13),
      color: '#071D41',
      fontFamily: 'monospace',
    },
    infoText: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: theme.typography.lineHeightBase + 4,
      maxWidth: 320,
    },
    continueButton: {
      backgroundColor: '#071D41',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl + 8,
      borderRadius: 12,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 52,
    },
    continueButtonText: {
      color: '#FFFFFF',
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      fontWeight: 'bold',
    },
    errorIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.errorLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    errorTitle: {
      fontSize: scaleFontSize(28),
      fontWeight: 'bold',
      color: theme.colors.error,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    errorText: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      lineHeight: theme.typography.lineHeightBase + 4,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl + 8,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
      minHeight: 52,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      fontWeight: 'bold',
    },
  });

const InitializationScreen: React.FC = () => {
  const theme = getTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [initState, setInitState] = useState<InitializationState>('checking');
  const [generatedDID, setGeneratedDID] = useState<string>('');
  const [error, setError] = useState<string>('');
  const setHolderDID = useAppStore(appState => appState.setHolderDID);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const generateIdentity = async () => {
    try {
      setInitState('generating');
      setError('');

      // Generate holder identity using did:key method
      const {did} = await DIDService.generateHolderIdentity('key');

      // Update state
      setGeneratedDID(did);
      setHolderDID(did);
      setInitState('success');
    } catch (err) {
      setInitState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao gerar identidade digital'
      );
    }
  };

  const checkFirstLaunch = async () => {
    try {
      setInitState('checking');

      // Check if holder DID already exists
      const existingDID = await StorageService.getHolderDID();

      if (existingDID) {
        // Not first launch, update store and navigate to home
        setHolderDID(existingDID);
        router.replace(Routes.Home);
      } else {
        // First launch, generate identity
        await generateIdentity();
      }
    } catch (err) {
      setInitState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao verificar inicialização'
      );
    }
  };

  useEffect(() => {
    checkFirstLaunch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    generateIdentity();
  };

  const handleContinue = () => {
    router.replace(Routes.Home);
  };

  const renderContent = () => {
    switch (initState) {
      case 'checking':
        return (
          <View style={styles.contentContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              Verificando inicialização...
            </Text>
          </View>
        );

      case 'generating':
        return (
          <View style={styles.contentContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              Gerando sua identidade digital...
            </Text>
            <Text style={styles.subText}>
              Isso pode levar alguns segundos
            </Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.successIconContainer}>
              <MaterialCommunityIcons name="check-bold" size={40} color="#168821" />
            </View>
            <Text style={styles.successTitle}>
              Identidade Acadêmica Criada
            </Text>
            <Text style={styles.successSubtitle}>
              Seu DID (Decentralized Identifier) foi gerado e armazenado com segurança no seu dispositivo.
            </Text>
            <View style={styles.didContainer}>
              <View style={styles.didLabelRow}>
                <Text style={styles.didLabel}>SEU IDENTIFICADOR DESCENTRALIZADO</Text>
              </View>
              <View style={styles.didTextContainer}>
                <Text style={styles.didText} numberOfLines={3}>
                  {generatedDID}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.errorIconContainer}>
              <MaterialCommunityIcons name="alert-circle" size={56} color={theme.colors.error} />
            </View>
            <Text style={styles.errorTitle}>Erro na Inicialização</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, {opacity: fadeAnim}]}>
        <MaterialCommunityIcons
          name="school"
          size={28}
          color={theme.colors.primary}
          style={styles.headerIcon}
        />
        <Text style={styles.title}>SSI Universitário</Text>
      </Animated.View>
      <Animated.View style={{flex: 1, opacity: fadeAnim}}>
        {renderContent()}
      </Animated.View>
    </View>
  );
};



export default InitializationScreen;
