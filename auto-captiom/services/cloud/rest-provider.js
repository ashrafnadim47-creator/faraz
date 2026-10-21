export function createForgeRestProvider(baseUrl = 'http://127.0.0.1:8787/api') {
  async function request(path, options = {}) {
    const res = await fetch(baseUrl + path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    if (!res.ok) throw new Error(`FORGE API ${res.status}`);
    return res.status === 204 ? null : res.json();
  }
  return {
    capabilities: { projects: true, database: 'sqlite', auth: false },
    async health() { return request('/health'); },
    async listProjects() { return request('/projects'); },
    async saveProject(project) { return request('/projects/' + encodeURIComponent(project.id), { method: 'PUT', body: JSON.stringify({ project }) }); },
    async createProject(project) { return request('/projects', { method: 'POST', body: JSON.stringify({ project }) }); },
    async loadProject(id) { return request('/projects/' + encodeURIComponent(id)); },
    async deleteProject(id) { return request('/projects/' + encodeURIComponent(id), { method: 'DELETE' }); },
  };
}
