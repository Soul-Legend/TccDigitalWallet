import {VerifiablePresentation} from '../../types';
import type {ICryptoService, ILogService, IStorageService} from '../../types';
import {ValidationError, CryptoError} from '../ErrorHandler';
import {canonicalize} from '../encoding';

/**
 * Verifies the holder-applied signature on the presentation envelope.
 *
 * Note: the presentation's `proof` is created by the **holder**, not the
 * issuer (despite the legacy method name). The credential's own issuer
 * signature is verified separately by the integrity verifier when the
 * credential format requires it (CL/SD-JWT/Groth16).
 */
export class SignatureVerifier {
  constructor(
    private readonly logger: ILogService,
    private readonly crypto: ICryptoService,
    private readonly storage: IStorageService,
    /** Optional CL-signature delegate, injected to keep this class focused. */
    private readonly verifyCLSignaturePresentation: (
      presentation: VerifiablePresentation,
    ) => Promise<boolean>,
  ) {}

  async verify(
    presentation: VerifiablePresentation,
    issuerPublicKey?: string,
  ): Promise<boolean> {
    try {
      const credential =
        typeof presentation.verifiableCredential === 'string'
          ? JSON.parse(presentation.verifiableCredential)
          : presentation.verifiableCredential;
      const issuerDID = credential.issuer;

      // Resolve issuer pk only for legacy callers; not used in the modern
      // holder-signature path below.
      let publicKey = issuerPublicKey;
      if (!publicKey) {
        publicKey = (await this.storage.getIssuerPublicKey()) ?? undefined;
      }

      const presentationProof = presentation.proof;

      // Groth16 envelopes are validated by the ZKP integrity step.
      if (presentationProof.type === 'Groth16Proof') {
        this.logger.captureEvent(
          'verification',
          'verificador',
          {
            algorithm: 'Groth16',
            verification_result: true,
            parameters: {
              action: 'zkp_proof_type_accepted',
              issuer: issuerDID,
              proof_type: 'Groth16Proof',
            },
          },
          true,
        );
        return true;
      }

      // CL-signature envelopes delegate to AnonCreds.
      if (presentationProof.type === 'CLSignature2023') {
        const valid = await this.verifyCLSignaturePresentation(presentation);
        if (!valid) {
          throw new ValidationError(
            'Apresentação AnonCreds inválida',
            'proof',
            presentationProof,
          );
        }
        return true;
      }

      // Standard Ed25519/JWS path: actually verify the signature.
      const signatureHex = presentationProof.jws ?? presentationProof.signature;
      if (!signatureHex || typeof signatureHex !== 'string') {
        throw new ValidationError(
          'Assinatura não encontrada no proof da apresentação',
          'proof',
          presentationProof,
        );
      }

      const holderDID = presentation.holder;
      const holderPublicKey = await this.getHolderPublicKey(holderDID);

      const hashedAttributes =
        ((presentation as unknown) as {hashed_attributes?: Record<string, string>})
          .hashed_attributes ?? {};
      const signingInput = canonicalize({
        '@context': presentation['@context'],
        challenge: presentationProof.challenge ?? null,
        disclosed_attributes: presentation.disclosed_attributes ?? {},
        hashed_attributes: hashedAttributes,
        holder: presentation.holder,
        type: presentation.type,
        verifiableCredential: presentation.verifiableCredential,
      });

      const valid = await this.crypto.verifySignature(
        signingInput,
        signatureHex,
        holderPublicKey,
        'verificador',
      );

      if (!valid) {
        throw new ValidationError(
          'Assinatura da apresentação inválida',
          'signature',
          {issuer: issuerDID, holder: holderDID},
        );
      }

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          algorithm: 'Ed25519',
          verification_result: true,
          parameters: {
            action: 'presentation_signature_verified',
            issuer: issuerDID,
            holder: holderDID,
          },
        },
        true,
      );
      return true;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          algorithm: 'Ed25519',
          verification_result: false,
          parameters: {action: 'issuer_signature_verification_failed'},
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  private async getHolderPublicKey(holderDID: string): Promise<string> {
    if (holderDID.startsWith('did:key:')) {
      const publicKey = await this.storage.getHolderPublicKey();
      if (!publicKey) {
        throw new CryptoError(
          'Chave pública do titular não encontrada',
          'verification',
          {holderDID},
        );
      }
      return publicKey;
    }
    throw new ValidationError(
      'Método DID não suportado para resolução de chave pública',
      'holder_did',
      holderDID,
    );
  }
}
