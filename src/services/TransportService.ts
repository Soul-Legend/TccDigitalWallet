import LogServiceInstance from './LogService';
import type {ILogService} from '../types';

/**
 * TransportService — minimal transport selection for presentation exchange.
 *
 * The wallet supports two transport modes that work without any native
 * proximity stack:
 *   - 'clipboard': default, manual copy/paste exchange
 *   - 'qrcode':   the holder renders the presentation as a QR code that the
 *                 verifier scans (uses `react-native-qrcode-svg`, which the
 *                 app already depends on)
 *
 * BLE proximity (ISO 18013-5 mDoc) and OpenID4VP remote presentation are
 * intentionally out of scope. The previous integration relied on
 * `@openwallet-foundation/eudi-wallet-kit-react-native`, which is no longer
 * a dependency. There is no widely-used drop-in React Native package for
 * ISO 18013-5 mDoc proximity exchange today, so those modes have been
 * removed rather than partially stubbed. See `docs/ARCHITECTURE.md` for
 * the rationale and `docs/DESIGN_DECISIONS.md` for the migration record.
 */

export type TransportMode = 'clipboard' | 'qrcode';

class TransportService {
  private currentMode: TransportMode = 'clipboard';
  private readonly logger: ILogService;

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
  }

  /** Returns the active transport mode. */
  getMode(): TransportMode {
    return this.currentMode;
  }

  /** Switches the active transport mode. */
  setMode(mode: TransportMode): void {
    this.currentMode = mode;
    this.logger.captureEvent(
      'presentation_creation',
      'titular',
      {
        parameters: {
          action: 'transport_mode_changed',
          mode,
        },
      },
      true,
    );
  }
}

export {TransportService};

const transportServiceInstance = new TransportService();
export default transportServiceInstance;
