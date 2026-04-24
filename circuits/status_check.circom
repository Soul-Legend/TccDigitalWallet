pragma circom 2.0.0;

// StatusCheck: proves that status == expected without revealing the actual value.
// Both inputs are SHA-256 numeric hashes (truncated to 248 bits, BN254-safe).
//
// Public inputs:  expected
// Private inputs: status
// The circuit constrains: status === expected
// A valid proof means the prover knows a `status` value that matches `expected`.

template StatusCheck() {
    signal input status;    // private: SHA-256 numeric hash of actual status string
    signal input expected;  // public:  SHA-256 numeric hash of expected status string

    // Equality constraint: proof is only satisfiable when status == expected
    status === expected;
}

component main {public [expected]} = StatusCheck();
