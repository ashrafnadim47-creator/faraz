/* FORGE — cloud boundary. Local projects continue to work without an account. */
export class CloudManager {
  constructor(provider = null) { this.provider = provider; }
  setProvider(provider) { this.provider = provider; }
  get enabled() { return Boolean(this.provider); }
  async saveProject(project) {
    if (!this.provider?.saveProject) throw new Error('No cloud provider is configured');
    return this.provider.saveProject(project);
  }
  async loadProject(id) {
    if (!this.provider?.loadProject) throw new Error('No cloud provider is configured');
    return this.provider.loadProject(id);
  }
}
export const cloudManager = new CloudManager();
