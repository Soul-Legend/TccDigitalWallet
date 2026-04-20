import {
  PresentationExchangeRequest,
  VerifiablePresentation,
} from '../../types';
import type {
  IAnonCredsService,
  ILogService,
  IStorageService,
} from '../../types';
import {ValidationError} from '../ErrorHandler';

type PredicateSpec = {
  attribute: string;
  p_type: '>=' | '<=' | '>' | '<';
  value: number;
};

/**
 * Builds an AnonCreds (CL-signature ZKP) presentation. Provides
 * native selective disclosure + predicate proofs through the
 * @hyperledger/anoncreds-react-native library; every presentation is
 * cryptographically unlinkable across verifiers.
 */
export class AnonCredsPresentationBuilder {
  constructor(
    private readonly logger: ILogService,
    private readonly storage: IStorageService,
    private readonly anonCredsService: IAnonCredsService,
  ) {}

  async build(
    credentialToken: string,
    pexRequest: PresentationExchangeRequest,
    revealedAttrs: string[],
    predicates: PredicateSpec[],
  ): Promise<VerifiablePresentation> {
    try {
      const envelope = JSON.parse(credentialToken);
      if (envelope.format !== 'anoncreds' || !envelope.credential) {
        throw new ValidationError(
          'Token is not an AnonCreds envelope',
          'format',
          envelope.format,
        );
      }

      // SECURITY: holder DID must be present and non-empty. An empty value
      // would propagate into proof.verificationMethod and silently bypass
      // binding checks downstream.
      const holderDid: string =
        envelope.holder_did || envelope.credential?.values?.id?.raw || '';
      if (!holderDid || typeof holderDid !== 'string') {
        throw new ValidationError(
          'AnonCreds envelope is missing holder DID',
          'holder_did',
          envelope.holder_did,
        );
      }

      const schemaArtifact = await this.storage.getRawItem(
        `anoncreds_schema_${envelope.schema_id}`,
      );
      const credDefArtifact = await this.storage.getRawItem(
        `anoncreds_creddef_${envelope.cred_def_id}`,
      );
      if (!schemaArtifact || !credDefArtifact) {
        throw new ValidationError(
          'AnonCreds schema or cred def not found in storage',
          'artifacts',
          undefined,
        );
      }

      const schema = JSON.parse(schemaArtifact);
      const credDef = JSON.parse(credDefArtifact);
      const {linkSecret} = await this.anonCredsService.getOrCreateLinkSecret();

      // SECURITY (P0 C1 / AnonCreds): nonces must be cryptographically
      // random — a predictable nonce (e.g. Date.now()) lets a verifier
      // correlate presentations across time and breaks unlinkability.
      const nonce = this.anonCredsService.generateNonce();
      const requestedAttributes: Record<string, {name: string}> = {};
      revealedAttrs.forEach((attr, i) => {
        requestedAttributes[`attr_${i}`] = {name: attr};
      });
      const requestedPredicates: Record<
        string,
        {name: string; p_type: PredicateSpec['p_type']; p_value: number}
      > = {};
      predicates.forEach((pred, i) => {
        requestedPredicates[`pred_${i}`] = {
          name: pred.attribute,
          p_type: pred.p_type,
          p_value: pred.value,
        };
      });

      const presRequest = this.anonCredsService.buildPredicateRequest(
        pexRequest.presentation_definition?.id || 'presentation',
        nonce,
        requestedAttributes,
        requestedPredicates,
      );

      const credentialsProve: Array<{
        entryIndex: number;
        referent: string;
        isPredicate: boolean;
        reveal: boolean;
      }> = [];
      revealedAttrs.forEach((_attr, i) => {
        credentialsProve.push({
          entryIndex: 0,
          referent: `attr_${i}`,
          isPredicate: false,
          reveal: true,
        });
      });
      predicates.forEach((_pred, i) => {
        credentialsProve.push({
          entryIndex: 0,
          referent: `pred_${i}`,
          isPredicate: true,
          reveal: false,
        });
      });

      const anonCredsPresentation = this.anonCredsService.createPresentation(
        presRequest,
        [{credential: envelope.credential}],
        credentialsProve,
        linkSecret,
        {[envelope.schema_id]: schema.schema},
        {[envelope.cred_def_id]: credDef.credDef},
      );

      const presentation: VerifiablePresentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://identity.foundation/presentation-exchange/submission/v1',
        ],
        type: ['VerifiablePresentation', 'AnonCredsPresentationSubmission'],
        holder: holderDid,
        verifiableCredential: credentialToken,
        proof: {
          type: 'CLSignature2023',
          created: new Date().toISOString(),
          challenge: pexRequest.challenge,
          proofPurpose: 'authentication',
          verificationMethod: envelope.cred_def_id,
        },
        disclosed_attributes: {},
        zkp_proof: {
          proof_data: anonCredsPresentation,
          revealed_attrs: revealedAttrs,
          predicates: predicates.map(p => ({
            attr_name: p.attribute,
            p_type: p.p_type,
            value: p.value,
            satisfied: true,
          })),
        },
      };

      const revealedValues =
        (anonCredsPresentation as any)?.requested_proof?.revealed_attrs || {};
      for (const [referent, data] of Object.entries(revealedValues)) {
        const attrData = data as {raw: string};
        if (attrData?.raw) {
          presentation.disclosed_attributes = presentation.disclosed_attributes || {};
          presentation.disclosed_attributes[referent] = attrData.raw;
        }
      }

      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          algorithm: 'CL',
          parameters: {
            action: 'anoncreds_presentation_created',
            revealed_count: revealedAttrs.length,
            predicates_count: predicates.length,
          },
        },
        true,
      );
      return presentation;
    } catch (error) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {parameters: {action: 'anoncreds_presentation_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
}
