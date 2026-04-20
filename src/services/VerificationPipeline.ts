/**
 * VerificationPipeline — Chain of Responsibility implementation
 *
 * Composes IVerificationStep instances into a pipeline.
 * Each step runs independently; failures accumulate in the context.
 * New steps can be added without modifying existing ones (OCP).
 */
import {
  IVerificationStep,
  VerificationContext,
  VerifiablePresentation,
  PresentationExchangeRequest,
} from '../types';

export class VerificationPipeline {
  private steps: IVerificationStep[] = [];

  register(step: IVerificationStep): this {
    this.steps.push(step);
    return this;
  }

  async execute(
    presentation: VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
  ): Promise<VerificationContext> {
    const context: VerificationContext = {errors: []};

    for (const step of this.steps) {
      try {
        const result = await step.validate(presentation, pexRequest, context);
        if (!result.valid && result.error) {
          context.errors.push(result.error);
        }
      } catch (error) {
        context.errors.push(
          `[${step.name}] ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return context;
  }
}
