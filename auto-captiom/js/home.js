import { $, el } from './utils.js';
import * as project from './project.js';
import { ui } from './ui.js';
import { auth } from './auth.js';

let image = null;
let rotation = 0;

export const home = {
  async init() {
    $('#home-new-video')?.addEventListener('click', () => {
      project.newProject('Untitled Video Project');
      this.hide();
      $('#btn-editor')?.classList.add('active');
      $('#btn-home')?.classList.remove('active');
    });

    $('#home-image-editor')?.addEventListener('click', () => this.openImageEditor());
    $('#image-editor-back')?.addEventListener('click', () => this.closeImageEditor());
    $('#image-file-input')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) this.loadImage(file);
    });

    ['image-brightness','image-contrast','image-saturation'].forEach(id => {
      $(`#${id}`)?.addEventListener('input', () => this.drawImageEditor());
    });

    $('#image-rotate-left')?.addEventListener('click', () => {
      rotation = (rotation - 90) % 360;
      this.drawImageEditor();
    });

    $('#image-rotate-right')?.addEventListener('click', () => {
      rotation = (rotation + 90) % 360;
      this.drawImageEditor();
    });

    $('#image-export')?.addEventListener('click', () => this.exportImage());
    $('#home-refresh-projects')?.addEventListener('click', () => this.refreshProjects());
    $('#home-shortcuts')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      ui.openShortcuts();
    });

    await this.refreshProjects();
    this.show();
  },

  async refreshProjects() {
    const root = $('#home-project-list');
    if (!root) return;

    root.innerHTML = '';

    let list = [];
    try {
      // Home works in local/guest mode too.
      list = await project.listProjects();
    } catch (err) {
      console.error('[forge] home list failed', err);
    }

    const countEl = $('#home-project-count');

    if (countEl) {
      countEl.textContent = list.length
        ? `${list.length} saved project${list.length === 1 ? '' : 's'} on this device`
        : 'No saved projects yet';
    }

    if (!list.length) {
      root.appendChild(el('div', {
        class: 'home-empty',
        text: 'No projects yet. Start a new Video Editor project above.'
      }));
      return;
    }

    for (const pr of list.slice(0, 12)) {
      const row = el('div', { class: 'home-project-row' });

      const name = pr.name || 'Untitled Project';
      const updated = pr.updatedAt
        ? new Date(pr.updatedAt).toLocaleString()
        : 'Unknown';

      const meta = el(
        'div',
        { class: 'home-project-meta' },
        el('div', { class: 'home-project-name', text: name }),
        el('div', {
          class: 'home-project-sub',
          text: `${pr.clips?.length || 0} clips · ${pr.media?.length || 0} media · Updated ${updated}`
        })
      );

      const actions = el('div', { class: 'home-project-actions' });

      // DELETE: keep a direct reference to the button; never use event.currentTarget after await.
      const deleteButton = el('button', {
        class: 'btn danger home-delete-btn',
        type: 'button',
        text: 'Delete',
        title: 'Delete project from Home'
      });

      deleteButton.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();

        const ok = await ui.confirm({
          title: 'Delete project',
          message: `Delete “${name}”? This removes the saved project from this device.`,
          confirmLabel: 'Delete',
          danger: true
        });

        if (!ok) return;

        deleteButton.disabled = true;

        try {
          await project.deleteProjectById(pr.id);
          row.remove();

          const remaining = root.querySelectorAll('.home-project-row').length;
          if (countEl) {
            countEl.textContent = remaining
              ? `${remaining} saved project${remaining === 1 ? '' : 's'} on this device`
              : 'No saved projects yet';
          }

          if (!remaining && !root.querySelector('.home-empty')) {
            root.appendChild(el('div', {
              class: 'home-empty',
              text: 'No projects yet. Start a new Video Editor project above.'
            }));
          }

          ui.toast('Project deleted', 'success', 1600);
        } catch (err) {
          console.error('[forge] home delete failed', err);
          deleteButton.disabled = false;
          ui.toast(`Delete failed: ${err?.message || 'unknown error'}`, 'error', 4000);
        }
      });

      actions.appendChild(deleteButton);

      const openButton = el('button', {
        class: 'btn primary home-open-btn',
        type: 'button',
        text: 'Open',
        title: 'Open project'
      });

      openButton.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();

        try {
          await project.loadProjectById(pr.id);
          this.hide();
          $('#btn-editor')?.classList.add('active');
          $('#btn-home')?.classList.remove('active');
        } catch (err) {
          console.error('[forge] project open failed', err);
          ui.toast('Project could not be opened.', 'error');
        }
      });

      actions.appendChild(openButton);
      row.append(meta, actions);
      root.appendChild(row);
    }
  },

  show() {
    // Never allow a stale auth overlay to sit above Home.
    $('#forge-auth-panel')?.remove();
    $('#forge-home')?.removeAttribute('hidden');
  },

  hide() {
    $('#forge-home')?.setAttribute('hidden', 'hidden');
    $('#app')?.classList.remove('home-mode');
  },

  openImageEditor() {
    $('#forge-home')?.setAttribute('hidden', 'hidden');
    $('#forge-image-editor')?.removeAttribute('hidden');
  },

  closeImageEditor() {
    $('#forge-image-editor')?.setAttribute('hidden', 'hidden');
    $('#forge-home')?.removeAttribute('hidden');
  },

  async loadImage(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        image = img;
        rotation = 0;
        const empty = $('#image-editor-empty');
        if (empty) empty.style.display = 'none';
        this.drawImageEditor();
      };
      img.onerror = () => ui.toast('Could not load this image.', 'error');
      img.src = fr.result;
    };
    fr.onerror = () => ui.toast('Could not read this image.', 'error');
    fr.readAsDataURL(file);
  },

  drawImageEditor() {
    const c = $('#image-editor-canvas');
    if (!c || !image) return;

    const br = Number($('#image-brightness')?.value || 100);
    const co = Number($('#image-contrast')?.value || 100);
    const sa = Number($('#image-saturation')?.value || 100);
    const swap = Math.abs(rotation) % 180 === 90;

    c.width = swap ? image.naturalHeight : image.naturalWidth;
    c.height = swap ? image.naturalWidth : image.naturalHeight;

    const ctx = c.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.filter = `brightness(${br}%) contrast(${co}%) saturate(${sa}%)`;
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    ctx.restore();
  },

  exportImage() {
    const c = $('#image-editor-canvas');
    if (!c || !image) {
      ui.toast('Add an image first.', 'warn');
      return;
    }

    c.toBlob(blob => {
      if (!blob) {
        ui.toast('Image export failed.', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FORGE-image.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }
};
