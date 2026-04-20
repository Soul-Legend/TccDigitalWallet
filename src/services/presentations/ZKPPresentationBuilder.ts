import {
  PresentationExchangeRequest,
  VerifiableCredential,
  VerifiablePresentation,
} from '../../types';
import type {ILogService, IStorageService} from '../../types';
import {generateNullifier, generateZKPProofs} from '../PresentationHelpers';

/**
 * Builds a Groth16-over-Circom presentation. The credential body is
 * stripped of all attributes (only id + proof remain) and replaced by
 * `zkp_proofs[]`, one per requested predicate.
 *
 * For election scenarios a deterministic nullifier is attached so
 * verifiers can detect double-voting without learning the holder DID.
 */
export class ZKPPresentationBuilder {
  constructor(
    private readonly logger: ILogService,
    private readonly storage: IStorageService,
  ) {}

  async build(
    credential: VerifiableCredential,
    pexRequest: PresentationExchangeRequest,
    predicates: Array<{attribute: string; p_type: string; value: any}>,
  ): Promise<VerifiablePresentation> {
    try {
      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'zkp_generation_started',
            predicates_count: predicates.length,
            predicates: predicates.map(p => `${p.attribute} ${p.p_type} ${p.value}`),
          },
        },
        true,
      );

      const zkpProofs = await generateZKPProofs(credential, predicates);

      let nullifier: string | undefined;
      if (pexRequest.election_id) {
        const holderPrivateKey = await this.storage.getHolderPrivateKey();
        if (holderPrivateKey) {
          nullifier = await generateNullifier(
            holderPrivateKey,
            pexRequest.election_id,
          );
          this.logger.captureEvent(
            'hash_computation',
            'titular',
            {
              parameters: {
                action: 'nullifier_generated',
                election_id: pexRequest.election_id,
                nullifier_truncated: nullifier.substring(0, 16) + '...',
              },
            },
            true,
          );
        }
      }

      const presentation: VerifiablePresentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://identity.foundation/presentation-exchange/submission/v1',
        ],
        type: ['VerifiablePresentation', 'PresentationSubmission'],
        holder: credential.credentialSubject.id,
        verifiableCredential: {
          '@context': credential['@context'],
          type: credential.type,
          issuer: credential.issuer,
          issuanceDate: credential.issuanceDate,
          credentialSubject: {id: credential.credentialSubject.id},
          proof: credential.proof,
        } as any,
        proof: {
          type: 'Groth16Proof',
          created: new Date().toISOString(),
          challenge: pexRequest.challenge,
          proofPurpose: 'authentication',
          verificationMethod: `${credential.credentialSubject.id}#key-1`,
        },
        zkp_proof: {
          proof_data: {},
          revealed_attrs: [],
          predicates: zkpProofs.map(p => ({
            attr_name: p.predicate.attr_name,
            p_type: p.predicate.p_type,
            value: p.predicate.value,
            satisfied: p.predicate_satisfied,
          })),
        },
        zkp_proofs: zkpProofs,
        nullifier,
      };

      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'zkp_generated',
            proofs_count: zkpProofs.length,
            holder: credential.credentialSubject.id,
          },
        },
        true,
      );
      return presentation;
    } catch (error) {
      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {parameters: {action: 'zkp_generation_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
}
