/* FORGE — AI service boundary. Providers can be local, remote, or hybrid. */
export class AIManager {
  constructor(provider = null) { this.provider = provider; }
  setProvider(provider) { this.provider = provider; }
  get capabilities() { return this.provider?.capabilities || { captions: false, effects: false, removeBackground: false }; }
  async captions(input, options) {
    if (!this.provider?.captions) throw new Error('No speech-to-text provider is configured');
    return this.provider.captions(input, options);
  }
}
export const aiManager = new AIManager();
