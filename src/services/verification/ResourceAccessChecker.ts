import type {ILogService} from '../../types';

/**
 * Maps verified attribute payloads (acesso_laboratorios / acesso_predios)
 * to a permission boolean for a requested resource id.
 */
export class ResourceAccessChecker {
  constructor(private readonly logger: ILogService) {}

  hasAccess(
    verifiedAttributes: Record<string, unknown>,
    resourceId: string,
  ): boolean {
    try {
      const labs = verifiedAttributes.acesso_laboratorios;
      if (Array.isArray(labs) && labs.includes(resourceId)) {
        this.log(resourceId, 'laboratorio', true);
        return true;
      }

      const buildings = verifiedAttributes.acesso_predios;
      if (Array.isArray(buildings) && buildings.includes(resourceId)) {
        this.log(resourceId, 'predio', true);
        return true;
      }

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'lab_access_denied',
            resource_id: resourceId,
            reason: 'permission_not_found',
          },
        },
        false,
      );
      return false;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {parameters: {action: 'lab_access_check_failed', resource_id: resourceId}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
    }
  }

  private log(resourceId: string, accessType: 'laboratorio' | 'predio', _success: boolean): void {
    this.logger.captureEvent(
      'verification',
      'verificador',
      {
        parameters: {
          action: 'lab_access_confirmed',
          resource_id: resourceId,
          access_type: accessType,
        },
      },
      true,
    );
  }
}
