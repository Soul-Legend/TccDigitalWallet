import React from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {TrustedIssuer} from '../types';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface TrustChainSectionProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  trustedIssuers: TrustedIssuer[];
  isChainLoading: boolean;
  childDid: string;
  onChildDidChange: (text: string) => void;
  childName: string;
  onChildNameChange: (text: string) => void;
  selectedParentDid: string | null;
  onSelectParent: (did: string | null) => void;
  onInitializeRoot: () => void;
  onRegisterChild: () => void;
}

const TrustChainSection: React.FC<TrustChainSectionProps> = ({
  expanded,
  onToggleExpanded,
  trustedIssuers,
  isChainLoading,
  childDid,
  onChildDidChange,
  childName,
  onChildNameChange,
  selectedParentDid,
  onSelectParent,
  onInitializeRoot,
  onRegisterChild,
}) => {
  const theme = getTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.chainHeader}
        onPress={onToggleExpanded}
        accessibilityLabel={`Cadeia de Confian\u00e7a, ${expanded ? 'expandido' : 'recolhido'}. ${trustedIssuers.length} emissores`}
        accessibilityRole="button">
        <View style={styles.trustChainRow}>
          <MaterialCommunityIcons name="link-variant" size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, styles.trustChainTitle]}>
            Cadeia de Confiança
          </Text>
          <MaterialCommunityIcons name={expanded ? 'chevron-down' : 'chevron-right'} size={18} color={theme.colors.primary} style={styles.trustChainIcon} />
        </View>
        <Text style={styles.chainBadge}>
          {trustedIssuers.length} emissor(es)
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View>
          {trustedIssuers.length === 0 ? (
            <View style={styles.chainEmptyState}>
              <Text style={styles.chainEmptyText}>
                Nenhuma cadeia de confiança configurada. Inicialize a âncora raiz para começar.
              </Text>
              <TouchableOpacity
                style={styles.chainButton}
                onPress={onInitializeRoot}
                disabled={isChainLoading}
                accessibilityLabel="Inicializar \u00e2ncora raiz da cadeia de confian\u00e7a"
                accessibilityRole="button">
                <Text style={styles.chainButtonText}>
                  {isChainLoading ? 'Inicializando...' : 'Inicializar Âncora Raiz'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Chain Visualization */}
              <View style={styles.chainList}>
                {trustedIssuers.map((issuer, idx) => (
                  <View
                    key={issuer.did}
                    style={[
                      styles.chainIssuerCard,
                      issuer.parentDid === null && styles.chainRootCard,
                    ]}>
                    <View style={styles.chainIssuerHeader}>
                      <Text style={styles.chainIssuerIcon}>
                        <MaterialCommunityIcons name={issuer.parentDid === null ? 'bank' : 'office-building'} size={20} color={theme.colors.primary} />
                      </Text>
                      <View style={styles.chainIssuerInfo}>
                        <Text style={styles.chainIssuerName}>
                          {issuer.name}
                        </Text>
                        <Text style={styles.chainIssuerDid} numberOfLines={1}>
                          {issuer.did}
                        </Text>
                      </View>
                    </View>
                    {issuer.parentDid && (
                      <Text style={styles.chainParentLabel}>
                        ↑ assinado por: {issuer.parentDid}
                      </Text>
                    )}
                    {idx < trustedIssuers.length - 1 && issuer.parentDid === null && (
                      <View style={styles.chainConnector}>
                        <Text style={styles.chainConnectorText}>│</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Register Child Issuer */}
              <View style={styles.chainRegisterSection}>
                <Text style={styles.chainRegisterTitle}>
                  Registrar Emissor Filho
                </Text>

                <Text style={styles.parentSelectorLabel}>Emissor Pai:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.parentSelectorRow}>
                  {trustedIssuers.map(issuer => (
                    <TouchableOpacity
                      key={issuer.did}
                      style={[
                        styles.parentChip,
                        selectedParentDid === issuer.did && styles.parentChipSelected,
                      ]}
                      onPress={() => onSelectParent(
                        selectedParentDid === issuer.did ? null : issuer.did,
                      )}
                      accessibilityLabel={`Emissor pai: ${issuer.name}${selectedParentDid === issuer.did ? ', selecionado' : ''}`}
                      accessibilityRole="button">
                      <Text
                        style={[
                          styles.parentChipText,
                          selectedParentDid === issuer.did && styles.parentChipTextSelected,
                        ]}
                        numberOfLines={1}>
                        <MaterialCommunityIcons name={issuer.parentDid === null ? 'bank' : 'office-building'} size={14} color={selectedParentDid === issuer.did ? theme.colors.surface : theme.colors.text} />{' '}
                        {issuer.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {selectedParentDid && (
                  <Text style={styles.parentSelectedHint}>
                    Pai selecionado: {selectedParentDid}
                  </Text>
                )}
                {!selectedParentDid && (
                  <Text style={styles.parentSelectedHint}>
                    Nenhum pai selecionado — usará a âncora raiz
                  </Text>
                )}

                <TextInput
                  style={[styles.input, styles.sectionMarginLg]}
                  value={childDid}
                  onChangeText={onChildDidChange}
                  placeholder="DID do emissor (ex: did:web:dept.ufsc.br)"
                  editable={!isChainLoading}
                  accessibilityLabel="DID do emissor filho"
                />
                <TextInput
                  style={[styles.input, styles.sectionMarginMd]}
                  value={childName}
                  onChangeText={onChildNameChange}
                  placeholder="Nome do emissor (ex: CAGR)"
                  editable={!isChainLoading}
                  accessibilityLabel="Nome do emissor filho"
                />
                <TouchableOpacity
                  style={[styles.chainButton, styles.sectionMarginLg]}
                  onPress={onRegisterChild}
                  disabled={isChainLoading || !childDid.trim() || !childName.trim()}
                  accessibilityLabel="Registrar emissor filho"
                  accessibilityRole="button">
                  <Text style={styles.chainButtonText}>
                    {isChainLoading ? 'Registrando...' : 'Registrar Emissor'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  chainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chainBadge: {
    fontSize: scaleFontSize(12),
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
  },
  chainEmptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  chainEmptyText: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  chainButton: {
    backgroundColor: theme.colors.primaryLight,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  chainButtonText: {
    color: theme.colors.surface,
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  chainList: {
    marginBottom: theme.spacing.md,
  },
  chainIssuerCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    padding: 12,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  chainRootCard: {
    borderLeftColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.background,
  },
  chainIssuerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainIssuerIcon: {
    fontSize: scaleFontSize(20),
    marginRight: 10,
  },
  chainIssuerInfo: {
    flex: 1,
  },
  chainIssuerName: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: theme.colors.text,
  },
  chainIssuerDid: {
    fontSize: scaleFontSize(11),
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  chainParentLabel: {
    fontSize: scaleFontSize(11),
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
    marginLeft: 30,
  },
  chainConnector: {
    alignItems: 'center',
    marginVertical: 2,
  },
  chainConnectorText: {
    fontSize: scaleFontSize(16),
    color: theme.colors.secondary,
  },
  chainRegisterSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
  },
  chainRegisterTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  parentSelectorLabel: {
    fontSize: scaleFontSize(13),
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  parentSelectorRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
    maxHeight: 40,
  },
  parentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  parentChipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryLight,
  },
  parentChipText: {
    fontSize: scaleFontSize(12),
    color: theme.colors.text,
  },
  parentChipTextSelected: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  parentSelectedHint: {
    fontSize: scaleFontSize(11),
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.small,
    padding: 12,
    fontSize: scaleFontSize(16),
    backgroundColor: theme.colors.surface,
  },
  trustChainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustChainTitle: {
    marginLeft: 6,
    marginBottom: 0,
  },
  trustChainIcon: {
    marginLeft: 4,
  },
  sectionMarginLg: {
    marginTop: 12,
  },
  sectionMarginMd: {
    marginTop: 8,
  },
});

export default TrustChainSection;
