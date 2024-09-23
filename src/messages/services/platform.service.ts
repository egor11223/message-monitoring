export abstract class PlatformService {
  protected abstract startListening(): Promise<void>;
  protected abstract processMessage(data: any): Promise<void>;
}
