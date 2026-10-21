/* FORGE — rendering service boundary.
 * Browser preview/export can use the current implementation now; native/mobile
 * FFmpeg and hardware renderers plug into this same contract later.
 */
export class RenderEngine {
  constructor(provider = null) { this.provider = provider; }
  setProvider(provider) { this.provider = provider; }
  get capabilities() { return this.provider?.capabilities || { local: true, ffmpeg: false, hardware: false }; }
  async render(request, onProgress) {
    if (!this.provider?.render) throw new Error('No render provider is configured');
    return this.provider.render(request, onProgress);
  }
}

export const renderEngine = new RenderEngine();
