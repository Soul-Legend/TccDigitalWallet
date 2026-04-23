import RuntimeTestRunner from '../RuntimeTestRunner';
import identityTests from './identityTests';
import completeFlowTests from './completeFlowTests';
import ruSelectiveDisclosureTests from './ruSelectiveDisclosureTests';
import electionsTests from './electionsTests';
import ageRangeProofTests from './ageRangeProofTests';
import laboratoryAccessTests from './laboratoryAccessTests';
import cryptoRoundTripTests from './cryptoRoundTripTests';
import trustChainTests from './trustChainTests';
import validationTests from './validationTests';
import advancedIdentityTests from './advancedIdentityTests';
import portedJestTests from './portedJestTests';
import edgeCaseTests from './edgeCaseTests';
import nullifierFallbackTests from './nullifierFallbackTests';

export function registerAllRuntimeTests(): void {
  RuntimeTestRunner.register(identityTests);
  RuntimeTestRunner.register(completeFlowTests);
  RuntimeTestRunner.register(ruSelectiveDisclosureTests);
  RuntimeTestRunner.register(electionsTests);
  RuntimeTestRunner.register(ageRangeProofTests);
  RuntimeTestRunner.register(laboratoryAccessTests);
  RuntimeTestRunner.register(cryptoRoundTripTests);
  RuntimeTestRunner.register(trustChainTests);
  RuntimeTestRunner.register(validationTests);
  RuntimeTestRunner.register(advancedIdentityTests);
  RuntimeTestRunner.register(portedJestTests);
  RuntimeTestRunner.register(edgeCaseTests);
  RuntimeTestRunner.register(nullifierFallbackTests);
}
