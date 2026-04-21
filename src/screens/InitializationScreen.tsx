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
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    title: {
      fontSize: scaleFontSize(theme.typography.fontSizeTitle),
      fontWeight: 'bold',
      color: theme.colors.surface,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
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
    successIcon: {
      fontSize: 80,
      color: theme.colors.success,
      marginBottom: theme.spacing.lg,
    },
    successTitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeXLarge + 2),
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    didContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      width: '100%',
      ...(theme.shadows.medium as object),
    },
    didLabel: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    didText: {
      fontSize: scaleFontSize(theme.typography.fontSizeSmall),
      color: theme.colors.text,
      fontFamily: 'monospace',
    },
    infoText: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl - 2,
      lineHeight: theme.typography.lineHeightBase,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md - 2,
      paddingHorizontal: theme.spacing.xl + 8,
      borderRadius: theme.borderRadius.medium,
      ...(theme.shadows.medium as object),
    },
    continueButtonText: {
      color: theme.colors.surface,
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      fontWeight: 'bold',
    },
    errorIcon: {
      fontSize: 80,
      color: theme.colors.error,
      marginBottom: theme.spacing.lg,
    },
    errorTitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeXLarge + 2),
      fontWeight: 'bold',
      color: theme.colors.error,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    errorText: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl - 2,
      paddingHorizontal: theme.spacing.lg,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      paddingVertical: theme.spacing.md - 2,
      paddingHorizontal: theme.spacing.xl + 8,
      borderRadius: theme.borderRadius.medium,
      ...(theme.shadows.medium as object),
    },
    retryButtonText: {
      color: theme.colors.surface,
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
            <MaterialCommunityIcons name="check-circle" size={80} color={theme.colors.success} style={{marginBottom: theme.spacing.lg}} />
            <Text style={styles.successTitle}>
              Identidade Gerada com Sucesso!
            </Text>
            <View style={styles.didContainer}>
              <Text style={styles.didLabel}>Seu DID:</Text>
              <Text style={styles.didText} numberOfLines={3}>
                {generatedDID}
              </Text>
            </View>
            <Text style={styles.infoText}>
              Sua identidade digital foi criada e armazenada de forma segura no
              dispositivo. Suas chaves privadas nunca sairão deste aparelho.
            </Text>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.contentContainer}>
            <MaterialCommunityIcons name="alert" size={80} color={theme.colors.error} style={{marginBottom: theme.spacing.lg}} />
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
          name="shield-check"
          size={48}
          color={theme.colors.surface}
          style={{marginBottom: theme.spacing.sm}}
        />
        <Text style={styles.title}>Carteira Digital SSI</Text>
        <Text style={styles.subtitle}>Identidade Acadêmica Verificável</Text>
      </Animated.View>
      <Animated.View style={{flex: 1, opacity: fadeAnim}}>
        {renderContent()}
      </Animated.View>
    </View>
  );
};



export default InitializationScreen;
