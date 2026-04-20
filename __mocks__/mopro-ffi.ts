/**
 * Mock for mopro-ffi package
 * Provides test implementations of Circom proof generation and verification
 *
 * ⚠ TEST-ONLY MOCK — DOES NOT GENERATE REAL PROOFS ⚠
 *
 * `generateCircomProof` here returns a hardcoded Groth16 proof shape with the
 * caller's inputs echoed back as public inputs. `verifyCircomProof` always
 * returns `true`. This means:
 *
 *   • Tests pass without any real `.zkey` proving key.
 *   • Tests CANNOT detect malformed circuit inputs, mismatched proving keys,
 *     or runtime mopro errors (e.g. missing native module).
 *   • Any test asserting on cryptographic soundness MUST instead exercise
 *     the real `mopro-ffi` on a real device — which currently isn't possible
 *     because the .zkey provisioning pipeline doesn't exist yet
 *     (see ZKProofService module doc).
 *
 * Shape note: the real `generateCircomProof` is SYNCHRONOUS
 * (`(zkey, inputs, lib) => CircomProofResult`). This mock returns a Promise
 * because production code uses `await` on the call — which is a JS no-op for
 * sync values, so awaiting a Promise here behaves identically. If we ever
 * remove the `await` in callers, this mock should drop the `async` to keep
 * the contract honest.
 */

export enum ProofLib {
  Arkworks = 0,
  Rapidsnark = 1,
}

export interface G1 {
  x: string;
  y: string;
  z: string;
}

export interface G2 {
  x: string[];
  y: string[];
  z: string[];
}

export interface CircomProof {
  a: G1;
  b: G2;
  c: G1;
  protocol: string;
  curve: string;
}

export interface CircomProofResult {
  proof: CircomProof;
  inputs: string[];
}

export interface Halo2ProofResult {
  proof: ArrayBuffer;
  inputs: ArrayBuffer;
}

export enum MoproError_Tags {
  CircomError = 'CircomError',
  Halo2Error = 'Halo2Error',
  NoirError = 'NoirError',
}

const mockG1: G1 = {
  x: '0x1234567890abcdef',
  y: '0xfedcba0987654321',
  z: '0x1',
};

const mockG2: G2 = {
  x: ['0xaabbccdd', '0x11223344'],
  y: ['0x55667788', '0x99aabbcc'],
  z: ['0x1', '0x0'],
};

const mockCircomProof: CircomProof = {
  a: mockG1,
  b: mockG2,
  c: {...mockG1, x: '0xdeadbeef'},
  protocol: 'groth16',
  curve: 'bn128',
};

export const generateCircomProof = jest.fn(
  async (
    _zkeyPath: string,
    circuitInputs: string,
    _proofLib: ProofLib,
  ): Promise<CircomProofResult> => {
    const inputs = JSON.parse(circuitInputs);
    // Return a mock proof with the circuit inputs as public inputs
    return {
      proof: {...mockCircomProof},
      inputs: Object.values(inputs).flat() as string[],
    };
  },
);

export const verifyCircomProof = jest.fn(
  async (
    _zkeyPath: string,
    _proofResult: CircomProofResult,
    _proofLib: ProofLib,
  ): Promise<boolean> => {
    return true;
  },
);

export const generateHalo2Proof = jest.fn(
  async (
    _srsPath: string,
    _pkPath: string,
    _circuitInputs: Map<string, string[]>,
  ): Promise<Halo2ProofResult> => {
    return {
      proof: new ArrayBuffer(32),
      inputs: new ArrayBuffer(16),
    };
  },
);

export const verifyHalo2Proof = jest.fn(
  async (
    _srsPath: string,
    _vkPath: string,
    _proof: ArrayBuffer,
    _publicInput: ArrayBuffer,
  ): Promise<boolean> => {
    return true;
  },
);

export const generateNoirProof = jest.fn(
  async (
    _circuitPath: string,
    _srsPath: string | undefined,
    _inputs: string[],
    _onChain: boolean,
    _vk: ArrayBuffer,
    _lowMemoryMode: boolean,
  ): Promise<ArrayBuffer> => {
    return new ArrayBuffer(64);
  },
);

export const verifyNoirProof = jest.fn(
  async (
    _circuitPath: string,
    _proof: ArrayBuffer,
    _onChain: boolean,
    _vk: ArrayBuffer,
    _lowMemoryMode: boolean,
  ): Promise<boolean> => {
    return true;
  },
);

export const getNoirVerificationKey = jest.fn(
  async (
    _circuitPath: string,
    _srsPath: string | undefined,
    _onChain: boolean,
    _lowMemoryMode: boolean,
  ): Promise<ArrayBuffer> => {
    return new ArrayBuffer(32);
  },
);

export const moproHelloWorld = jest.fn((): string => {
  return 'Hello from mopro mock!';
});

export function uniffiInitAsync(): Promise<void> {
  return Promise.resolve();
}
