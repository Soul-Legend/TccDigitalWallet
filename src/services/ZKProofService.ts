import {
  generateCircomProof,
  verifyCircomProof,
  CircomProofResult,
  ProofLib,
} from 'mopro-ffi';
import RNFS from 'react-native-fs';
import {sha256} from '@noble/hashes/sha256';
import LogServiceInstance from './LogService';
import {CryptoError} from './ErrorHandler';
import type {ILogService} from '../types';
import {utf8ToBytes} from './encoding';

/**
 * ZKProofService - Handles Zero-Knowledge Proof operations using mopro-ffi
 *
 * This service wraps the mopro native bindings to generate and verify
 * Groth16 ZK proofs (Circom) for privacy-preserving credential presentations.
 *
 * Supported circuits:
 * - age_range: Proves age >= threshold without revealing birthdate
 * - status_check: Proves status == expected value without revealing it
 * - nullifier: Generates a deterministic nullifier for double-spend prevention
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * .zkey PROVISIONING — IMPORTANT GAP (tracked, not fixed)
 * ─────────────────────────────────────────────────────────────────────────────
 * `getZkeyPath(circuit)` looks for the proving key under
 *   `${RNFS.DocumentDirectoryPath}/zkeys/<circuit>_final.zkey`
 *
 * Currently the build pipeline does NOT bundle these `.zkey` files into the
 * APK/IPA, nor does any code path download them on first launch. As a
 * consequence:
 *   • In tests:        the mopro-ffi mock returns hardcoded "valid" proofs,
 *                      so suites pass without any real proving key.
 *   • In production:   `RNFS.exists(zkeyPath)` returns false and every ZKP
 *                      generation throws `CryptoError("Arquivo zkey não
 *                      encontrado")`. The wallet is therefore not yet
 *                      end-to-end runnable on a physical device.
 *
 * Production deployment requires ONE of the following provisioning strategies
 * (pick one, document it, and add a build step):
 *
 *   1. Bundle as Android `assets/` + iOS `Resources/`, then on first launch
 *      copy from `RNFS.MainBundlePath` (iOS) /
 *      `RNFS.readFileAssets(...)` (Android) to `DocumentDirectoryPath/zkeys/`.
 *      Pro: deterministic, reproducible. Con: increases binary size by the
 *      total zkey footprint (often 5–50 MB per circuit).
 *
 *   2. Lazy download from a pinned, version-locked HTTPS URL with SHA-256
 *      verification. Pro: keeps binary small. Con: requires network on first
 *      use; integrity hash MUST be embedded in the binary, not fetched.
 *
 *   3. Pre-load via a one-shot `react-native-fs` upload step (developer-only
 *      sideloading for the TCC demo). Pro: trivial. Con: not user-deployable.
 *
 * Whichever path is chosen, the `.zkey` MUST be the one that matches the
 * `.r1cs/.wasm` artefacts the circuit was compiled from — a mismatch
 * silently produces unverifiable proofs. Pin both the circuit source SHA
 * and the trusted-setup transcript hash in version control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Circuit zkey file names (must be placed in the app's assets or downloaded)
const CIRCUIT_ZKEYS: Record<string, string> = {
  age_range: 'age_range_final.zkey',
  status_check: 'status_check_final.zkey',
  nullifier: 'nullifier_final.zkey',
};

class ZKProofService {
  private zkeyBasePath: string;
  private zkeyCache: Map<string, string> = new Map();
  private readonly logger: ILogService;

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
    // Use the app's document directory for zkey files
    this.zkeyBasePath = `${RNFS.DocumentDirectoryPath}/zkeys`;
  }

  /**
   * Copies bundled .zkey assets from the APK into DocumentDirectoryPath/zkeys/
   * on first launch (or when a circuit is missing).
   *
   * On Android, RN ships `react-native-fs` with `copyFileAssets(src, dest)`
   * which extracts a file from the APK's `assets/` tree. We treat absence of
   * the asset as a no-op (e.g. dev builds without bundled circuits) so this
   * call is safe to invoke unconditionally during app bootstrap.
   *
   * Idempotent: skips circuits whose target file already exists. Callers
   * (e.g. an InitializationScreen) should `await` this once before exercising
   * any proof generation in production.
   */
  async provisionBundledZkeys(): Promise<{
    provisioned: string[];
    missing: string[];
  }> {
    const provisioned: string[] = [];
    const missing: string[] = [];

    const dirExists = await RNFS.exists(this.zkeyBasePath);
    if (!dirExists) {
      await RNFS.mkdir(this.zkeyBasePath);
    }

    for (const [circuitName, fileName] of Object.entries(CIRCUIT_ZKEYS)) {
      const targetPath = `${this.zkeyBasePath}/${fileName}`;
      if (await RNFS.exists(targetPath)) {
        provisioned.push(circuitName);
        continue;
      }

      // `copyFileAssets` is Android-only; on iOS the bundled path differs
      // (`RNFS.MainBundlePath/zkeys/<fileName>`). Branch only when the API
      // is available — keeps tests + iOS builds compiling.
      const copyAssets = (
        RNFS as unknown as {
          copyFileAssets?: (src: string, dest: string) => Promise<void>;
        }
      ).copyFileAssets;

      try {
        if (typeof copyAssets === 'function') {
          await copyAssets(`zkeys/${fileName}`, targetPath);
          provisioned.push(circuitName);
          continue;
        }
        // iOS fallback — main bundle resource path
        const bundledIos = `${RNFS.MainBundlePath ?? ''}/zkeys/${fileName}`;
        if (bundledIos && (await RNFS.exists(bundledIos))) {
          await RNFS.copyFile(bundledIos, targetPath);
          provisioned.push(circuitName);
          continue;
        }
        missing.push(circuitName);
      } catch {
        // copyFileAssets throws when the asset is absent. Treat as missing —
        // callers can decide whether to abort or surface a friendly message.
        missing.push(circuitName);
      }
    }

    this.logger.captureEvent(
      'zkp_generation',
      'titular',
      {
        parameters: {
          action: 'zkey_provisioning_completed',
          provisioned: provisioned.join(','),
          missing: missing.join(','),
        },
      },
      missing.length === 0,
    );

    return {provisioned, missing};
  }

  /**
   * Ensures the zkeys directory exists and returns the path for a circuit's zkey
   */
  private async getZkeyPath(circuitName: string): Promise<string> {
    const cached = this.zkeyCache.get(circuitName);
    if (cached) {
      return cached;
    }

    const zkeyFileName = CIRCUIT_ZKEYS[circuitName];
    if (!zkeyFileName) {
      throw new CryptoError(
        `Circuit desconhecido: ${circuitName}`,
        'zkp',
        {circuitName},
      );
    }

    // Ensure zkeys directory exists
    const dirExists = await RNFS.exists(this.zkeyBasePath);
    if (!dirExists) {
      await RNFS.mkdir(this.zkeyBasePath);
    }

    const zkeyPath = `${this.zkeyBasePath}/${zkeyFileName}`;

    // Check if zkey file exists
    const fileExists = await RNFS.exists(zkeyPath);
    if (!fileExists) {
      throw new CryptoError(
        `Arquivo zkey não encontrado: ${zkeyFileName}. Faça o download do arquivo de circuito.`,
        'zkp',
        {zkeyPath},
      );
    }

    this.zkeyCache.set(circuitName, zkeyPath);
    return zkeyPath;
  }

  /**
   * Generates an age range proof using Circom/Groth16
   *
   * The circuit proves: age(birthdate) >= threshold
   * without revealing the actual birthdate.
   *
   * @param birthdate - Date string in YYYY-MM-DD format
   * @param threshold - Minimum age to prove (e.g., 18)
   * @returns CircomProofResult containing the proof and public inputs
   */
  async generateAgeRangeProof(
    birthdate: string,
    threshold: number,
  ): Promise<CircomProofResult> {
    try {
      const zkeyPath = await this.getZkeyPath('age_range');

      // Convert birthdate to circuit inputs
      // The circuit expects: birthYear, birthMonth, birthDay, currentYear, currentMonth, currentDay, threshold
      // SECURITY TODO: the comparison `age >= threshold` MUST be performed
      // inside the Circom circuit (it already receives birth + current
      // date components and threshold as inputs). The age is NOT computed
      // in JS here — we only forward raw date components. If the deployed
      // .zkey ever stops binding the threshold to a circuit-side age
      // computation, this code becomes vulnerable to a malicious holder
      // forging the age. See docs/DESIGN_DECISIONS.md.
      const birthDate = new Date(birthdate);
      if (Number.isNaN(birthDate.getTime())) {
        throw new CryptoError(
          `Data de nascimento inválida: ${birthdate}`,
          'zkp',
          {birthdate},
        );
      }
      const now = new Date();

      const circuitInputs = {
        birthYear: [birthDate.getFullYear().toString()],
        birthMonth: [(birthDate.getMonth() + 1).toString()],
        birthDay: [birthDate.getDate().toString()],
        currentYear: [now.getFullYear().toString()],
        currentMonth: [(now.getMonth() + 1).toString()],
        currentDay: [now.getDate().toString()],
        threshold: [threshold.toString()],
      };

      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'age_range_proof_started',
            circuit: 'age_range',
            threshold,
          },
        },
        true,
      );

      const proofResult = await generateCircomProof(
        zkeyPath,
        JSON.stringify(circuitInputs),
        ProofLib.Arkworks,
      );

      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'age_range_proof_generated',
            circuit: 'age_range',
            has_proof: !!proofResult.proof,
            inputs_count: proofResult.inputs.length,
          },
        },
        true,
      );

      return proofResult;
    } catch (error) {
      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'age_range_proof_failed',
            circuit: 'age_range',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError(
        'Falha ao gerar prova de faixa etária',
        'zkp',
        {error},
      );
    }
  }

  /**
   * Generates a status check proof using Circom/Groth16
   *
   * The circuit proves: status == expectedValue
   * without revealing the actual status string.
   *
   * @param statusValue - The actual status (e.g., 'Ativo')
   * @param expectedValue - The expected value to prove against (e.g., 'Ativo')
   * @returns CircomProofResult containing the proof and public inputs
   */
  async generateStatusCheckProof(
    statusValue: string,
    expectedValue: string,
  ): Promise<CircomProofResult> {
    try {
      const zkeyPath = await this.getZkeyPath('status_check');

      // Convert status strings to numeric representation for the circuit
      // Using simple hash: sum of char codes (the circuit handles the comparison)
      const statusNumeric = this.stringToNumericHash(statusValue);
      const expectedNumeric = this.stringToNumericHash(expectedValue);

      const circuitInputs = {
        status: [statusNumeric.toString()],
        expected: [expectedNumeric.toString()],
      };

      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'status_check_proof_started',
            circuit: 'status_check',
          },
        },
        true,
      );

      const proofResult = await generateCircomProof(
        zkeyPath,
        JSON.stringify(circuitInputs),
        ProofLib.Arkworks,
      );

      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'status_check_proof_generated',
            circuit: 'status_check',
            has_proof: !!proofResult.proof,
          },
        },
        true,
      );

      return proofResult;
    } catch (error) {
      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'status_check_proof_failed',
            circuit: 'status_check',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError(
        'Falha ao gerar prova de status',
        'zkp',
        {error},
      );
    }
  }

  /**
   * Generates a nullifier proof using Circom/Groth16
   *
   * The circuit computes: nullifier = hash(secret, electionId)
   * The nullifier is deterministic for the same holder + election,
   * preventing double voting without linking identity.
   *
   * @param holderSecret - A secret value derived from the holder's identity
   * @param electionId - The unique election identifier
   * @returns CircomProofResult containing the proof and nullifier as public input
   */
  async generateNullifierProof(
    holderSecret: string,
    electionId: string,
  ): Promise<CircomProofResult> {
    try {
      const zkeyPath = await this.getZkeyPath('nullifier');

      // Convert strings to numeric representations for the circuit
      const secretNumeric = this.stringToNumericHash(holderSecret);
      const electionNumeric = this.stringToNumericHash(electionId);

      const circuitInputs = {
        secret: [secretNumeric.toString()],
        electionId: [electionNumeric.toString()],
      };

      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'nullifier_proof_started',
            circuit: 'nullifier',
          },
        },
        true,
      );

      const proofResult = await generateCircomProof(
        zkeyPath,
        JSON.stringify(circuitInputs),
        ProofLib.Arkworks,
      );

      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'nullifier_proof_generated',
            circuit: 'nullifier',
            has_proof: !!proofResult.proof,
          },
        },
        true,
      );

      return proofResult;
    } catch (error) {
      this.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'nullifier_proof_failed',
            circuit: 'nullifier',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError(
        'Falha ao gerar prova de nullifier',
        'zkp',
        {error},
      );
    }
  }

  /**
   * Verifies a Circom/Groth16 proof using the specified circuit
   *
   * @param circuitName - The circuit name ('age_range', 'status_check', 'nullifier')
   * @param proofResult - The proof result to verify
   * @returns True if the proof is valid
   */
  async verifyProof(
    circuitName: string,
    proofResult: CircomProofResult,
  ): Promise<boolean> {
    try {
      const zkeyPath = await this.getZkeyPath(circuitName);

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'zkp_verification_started',
            circuit: circuitName,
          },
        },
        true,
      );

      const isValid = await verifyCircomProof(
        zkeyPath,
        proofResult,
        ProofLib.Arkworks,
      );

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'zkp_verification_completed',
            circuit: circuitName,
            is_valid: isValid,
          },
        },
        true,
      );

      return isValid;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'zkp_verification_failed',
            circuit: circuitName,
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError(
        'Falha ao verificar prova ZKP',
        'zkp',
        {error},
      );
    }
  }

  /**
   * Checks whether a specific circuit's zkey file is available
   * @param circuitName - The circuit name
   * @returns True if the zkey file exists
   */
  async isCircuitAvailable(circuitName: string): Promise<boolean> {
    try {
      const zkeyFileName = CIRCUIT_ZKEYS[circuitName];
      if (!zkeyFileName) {
        return false;
      }
      const zkeyPath = `${this.zkeyBasePath}/${zkeyFileName}`;
      return await RNFS.exists(zkeyPath);
    } catch {
      return false;
    }
  }

  /**
   * Lists all supported circuits and their availability
   */
  async getCircuitStatus(): Promise<
    Array<{name: string; fileName: string; available: boolean}>
  > {
    const statuses = [];
    for (const [name, fileName] of Object.entries(CIRCUIT_ZKEYS)) {
      const available = await this.isCircuitAvailable(name);
      statuses.push({name, fileName, available});
    }
    return statuses;
  }

  /**
   * Converts an arbitrary string to a deterministic numeric input suitable
   * for the Circom circuits.
   *
   * SECURITY: previously used a 32-bit DJBX33A hash which is trivially
   * collidable across small input domains (e.g. status values like 'Ativo'
   * vs 'Inativo'); two distinct values could produce the same circuit
   * input and forge a positive predicate proof. We now use SHA-256
   * truncated to 248 bits (31 bytes) so the result fits inside the
   * Bn254/Pasta scalar field used by Groth16, while preserving collision
   * resistance.
   */
  private stringToNumericHash(input: string): string {
    const digest = sha256(utf8ToBytes(input));
    // Truncate to 31 bytes (248 bits) so the value is < the curve scalar
    // field modulus (~254 bits) and safe to feed as a single field element.
    let n = 0n;
    for (let i = 0; i < 31; i++) {
      n = (n << 8n) | BigInt(digest[i]);
    }
    return n.toString();
  }

  /**
   * Extracts the nullifier from a nullifier proof result
   * The nullifier is the first public input of the proof
   */
  extractNullifier(proofResult: CircomProofResult): string | undefined {
    if (proofResult.inputs && proofResult.inputs.length > 0) {
      return proofResult.inputs[0];
    }
    return undefined;
  }
}

// Export singleton instance
export { ZKProofService };

const zkProofServiceInstance = new ZKProofService();
export default zkProofServiceInstance;
