pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

// Nullifier: computes nullifier = Poseidon(secret, electionId)
// This produces a deterministic identifier for a (holder, election) pair
// that can be used for duplicate-vote prevention without linking identity.
//
// Public inputs:  nullifier (the computed hash — output as public input)
// Private inputs: secret, electionId
//
// The verifier checks that the prover knows (secret, electionId) that
// hash to the claimed nullifier.

template Nullifier() {
    signal input secret;      // private: SHA-256 numeric hash of holder secret
    signal input electionId;  // private: SHA-256 numeric hash of election ID
    signal output nullifier;  // public:  Poseidon hash of (secret, electionId)

    component hasher = Poseidon(2);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== electionId;

    nullifier <== hasher.out;
}

component main = Nullifier();
