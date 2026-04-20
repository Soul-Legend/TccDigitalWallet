import React from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity} from 'react-native';
import {TrustedIssuer} from '../types';

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
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.chainHeader} onPress={onToggleExpanded}>
        <Text style={styles.sectionTitle}>
          🔗 Cadeia de Confiança {expanded ? '▼' : '▶'}
        </Text>
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
                disabled={isChainLoading}>
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
                        {issuer.parentDid === null ? '🏛️' : '🏢'}
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
                      )}>
                      <Text
                        style={[
                          styles.parentChipText,
                          selectedParentDid === issuer.did && styles.parentChipTextSelected,
                        ]}
                        numberOfLines={1}>
                        {issuer.parentDid === null ? '🏛️ ' : '🏢 '}
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
                  style={[styles.input, {marginTop: 12}]}
                  value={childDid}
                  onChangeText={onChildDidChange}
                  placeholder="DID do emissor (ex: did:web:dept.ufsc.br)"
                  editable={!isChainLoading}
                />
                <TextInput
                  style={[styles.input, {marginTop: 8}]}
                  value={childName}
                  onChangeText={onChildNameChange}
                  placeholder="Nome do emissor (ex: CAGR)"
                  editable={!isChainLoading}
                />
                <TouchableOpacity
                  style={[styles.chainButton, {marginTop: 12}]}
                  onPress={onRegisterChild}
                  disabled={isChainLoading || !childDid.trim() || !childName.trim()}>
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

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 16,
  },
  chainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chainBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chainEmptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chainEmptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  chainButton: {
    backgroundColor: '#1565C0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  chainButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chainList: {
    marginBottom: 16,
  },
  chainIssuerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#90CAF9',
  },
  chainRootCard: {
    borderLeftColor: '#1565C0',
    backgroundColor: '#e8f0fe',
  },
  chainIssuerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainIssuerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  chainIssuerInfo: {
    flex: 1,
  },
  chainIssuerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chainIssuerDid: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  chainParentLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    marginLeft: 30,
  },
  chainConnector: {
    alignItems: 'center',
    marginVertical: 2,
  },
  chainConnectorText: {
    fontSize: 16,
    color: '#90CAF9',
  },
  chainRegisterSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  chainRegisterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  parentSelectorLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  parentSelectorRow: {
    flexDirection: 'row',
    marginBottom: 4,
    maxHeight: 40,
  },
  parentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  parentChipSelected: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  parentChipText: {
    fontSize: 12,
    color: '#333',
  },
  parentChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  parentSelectedHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
});

export default TrustChainSection;
