/* Local image drafts; GitHub authentication is required to publish. */
(() => {
  'use strict';
  const cards = [...document.querySelectorAll('button[data-image]')];
  const artwork = document.getElementById('art-image');
  const artDialog = document.getElementById('art-dialog');
  const adminMode = new URLSearchParams(location.search).get('admin') === '1';
  const originalThumbnails = new Map(cards.map(card => [card, card.querySelector('img').getAttribute('src')]));
  const drafts = new Map(), objectURLs = new Set();
  let images = {}, activeKey = '', pending = {}, loaded = false;
  const safeImage = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+\.(webp|png|jpe?g)$/i.test(value);
  const urlFor = (key, kind) => drafts.get(key)?.[kind]?.url || images[key]?.[kind];
  function refresh() {
    cards.forEach(card => {
      card.querySelector('img').src = urlFor(card.dataset.image, 'thumbnail') || originalThumbnails.get(card);
    });
    if (activeKey && artDialog.open) artwork.src = urlFor(activeKey, 'artwork') || activeKey;
  }
  cards.forEach(card => card.addEventListener('click', () => {
    activeKey = card.dataset.image;
    artwork.src = urlFor(activeKey, 'artwork') || activeKey;
  }));
  const ready = fetch('gallery-images.json', {cache:'no-store'}).then(async response => {
    if (!response.ok) throw new Error('Could not load image settings. Reload and try again.');
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid image settings.');
    for (const [key, value] of Object.entries(data)) {
      if (!safeImage(key) || !value || typeof value !== 'object') continue;
      images[key] = {};
      for (const kind of ['thumbnail','artwork']) if (safeImage(value[kind])) images[key][kind] = value[kind];
    }
    loaded = true;
    refresh();
  });
  if (!adminMode) { ready.catch(() => {}); return; }

  const toolbar = document.createElement('div');
  toolbar.className = 'admin-toolbar';
  toolbar.innerHTML = '<p><strong>Image editor</strong><small>Local preview. Only a GitHub repository owner can publish changes.</small></p><button class="admin-control" id="admin-export" disabled>Download update</button><a class="admin-control" id="admin-exit">Exit editor</a>';
  document.body.prepend(toolbar);
  const exitURL = new URL(location.href); exitURL.searchParams.delete('admin');
  toolbar.querySelector('#admin-exit').href = exitURL.href;
  const exportButton = toolbar.querySelector('#admin-export');
  const editor = document.createElement('dialog');
  editor.id = 'image-editor'; editor.setAttribute('aria-labelledby','image-editor-title');
  editor.innerHTML = '<div class="dialog-bar"><h2 id="image-editor-title">Edit images</h2><button type="button" class="admin-close" aria-label="Close image editor"><span aria-hidden="true">×</span></button></div><p class="admin-note">Choose a thumbnail for the page and an artwork image for the popup. JPG, PNG or WebP, up to 20 MB each. Images keep their original quality.</p><label class="admin-image-field">Page thumbnail<input id="admin-thumbnail" type="file" accept="image/jpeg,image/png,image/webp"><img id="admin-thumbnail-preview" alt="Thumbnail preview"></label><label class="admin-image-field">Popup artwork<input id="admin-artwork" type="file" accept="image/jpeg,image/png,image/webp"><img id="admin-artwork-preview" alt="Artwork preview"></label><p id="admin-status" role="status"></p><div class="admin-actions"><button type="button" class="admin-control" id="admin-apply">Apply to preview</button><button type="button" class="admin-control" id="admin-cancel">Cancel</button></div><div class="admin-publish" hidden><strong>Publish your update</strong><ol><li>Extract the downloaded ZIP.</li><li>Open GitHub below and upload all extracted files to the repository root.</li><li>Select <strong>Commit changes</strong>. The website updates after GitHub finishes publishing.</li></ol><a href="https://github.com/nandagopal9656-max/nandagopal-design/upload/main" target="_blank" rel="noopener">Open GitHub upload ↗</a><p>Download and publish this batch before another editing session. Unpublished previews disappear when you leave or reload this page.</p></div>';
  document.body.append(editor);
  const status = editor.querySelector('#admin-status');
  const apply = editor.querySelector('#admin-apply');
  const publishHelp = editor.querySelector('.admin-publish');
  let editingKey = '', changing = 0, generation = 0;
  function closeEditor() { generation++; editor.close(); pending = {}; }
  editor.querySelector('.admin-close').onclick = closeEditor;
  editor.querySelector('#admin-cancel').onclick = closeEditor;
  editor.addEventListener('cancel', () => { generation++; pending = {}; });
  function openEditor(key) {
    if (editor.open) return;
    editingKey = key; pending = {}; changing = 0; generation++;
    const card = cards.find(item => item.dataset.image === key);
    editor.querySelector('h2').textContent = 'Edit: ' + card.dataset.title;
    status.textContent = loaded ? 'Changes remain private to this browser until you publish on GitHub.' : 'Loading image settings…';
    publishHelp.hidden = true;
    for (const kind of ['thumbnail','artwork']) {
      editor.querySelector('#admin-' + kind).value = '';
      editor.querySelector('#admin-' + kind + '-preview').src = urlFor(key, kind) || (kind === 'artwork' ? key : originalThumbnails.get(card));
    }
    apply.disabled = !loaded;
    editor.showModal();
  }
  ready.then(() => { apply.disabled = false; }).catch(error => {status.textContent = error.message; apply.disabled = true;});
  cards.forEach(card => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'admin-edit'; button.textContent = 'Edit images';
    button.setAttribute('aria-label','Edit images for ' + card.dataset.title);
    button.onclick = () => openEditor(card.dataset.image);
    card.after(button);
  });
  const popupEdit = document.createElement('button');
  popupEdit.className = 'admin-control'; popupEdit.textContent = 'Edit images'; popupEdit.type = 'button';
  popupEdit.onclick = () => openEditor(activeKey);
  artDialog.querySelector('.dialog-bar').insertBefore(popupEdit, document.getElementById('close-art'));
  for (const kind of ['thumbnail','artwork']) {
    editor.querySelector('#admin-' + kind).addEventListener('change', async event => {
      const file = event.target.files[0]; if (!file) return;
      const revision = generation; changing++; apply.disabled = true;
      try {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
        if (file.size > 20 * 1024 * 1024) throw new Error('Please use an image smaller than 20 MB.');
        const url = URL.createObjectURL(file); objectURLs.add(url);
        const probe = new Image(); probe.src = url; await probe.decode();
        if (revision !== generation) return;
        const extension = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
        pending[kind] = {file,url,name:editingKey.replace(/\.[^.]+$/, '') + '-' + kind + '-' + crypto.randomUUID() + '.' + extension};
        editor.querySelector('#admin-' + kind + '-preview').src = url;
        status.textContent = 'Image ready. Apply to preview when you are happy with it.';
      } catch (error) { if (revision === generation) status.textContent = error.message; }
      finally { if (revision === generation) { changing--; apply.disabled = !loaded || changing > 0; } }
    });
  }
  apply.onclick = () => {
    if (!loaded || changing) return;
    if (Object.keys(pending).length) drafts.set(editingKey, {...drafts.get(editingKey), ...pending});
    refresh(); exportButton.disabled = drafts.size === 0;
    exportButton.textContent = 'Download update' + (drafts.size ? ' (' + drafts.size + ')' : '');
    closeEditor();
  };
  window.addEventListener('beforeunload', event => { if (drafts.size) {event.preventDefault(); event.returnValue = '';} });
  exportButton.onclick = async () => {
    exportButton.disabled = true;
    try {
      const manifest = JSON.parse(JSON.stringify(images)), entries = [];
      for (const [key, changes] of drafts) {
        manifest[key] = {...manifest[key]};
        for (const [kind, change] of Object.entries(changes)) {
          manifest[key][kind] = change.name;
          entries.push({name:change.name, data:new Uint8Array(await change.file.arrayBuffer())});
        }
      }
      entries.push({name:'gallery-images.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2) + '\n')});
      const url = URL.createObjectURL(makeZip(entries)); objectURLs.add(url);
      const link = document.createElement('a'); link.href = url; link.download = 'portfolio-image-update.zip'; link.click();
      if (!editor.open) openEditor([...drafts.keys()][0]);
      publishHelp.hidden = false;
      status.textContent = 'Update downloaded. Follow the steps below to publish it.';
      publishHelp.scrollIntoView({block:'nearest'});
    } catch (error) { alert('Could not prepare the update: ' + error.message); }
    finally { exportButton.disabled = false; }
  };
  // Standard uncompressed ZIP; no third-party scripts or credentials needed.
  function makeZip(entries) {
    const blocks = [], central = []; let offset = 0, centralLength = 0;
    const crc32 = bytes => {let crc = 0xffffffff; for (const byte of bytes) {crc ^= byte; for(let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);} return (crc ^ 0xffffffff) >>> 0;};
    for (const {name,data} of entries) {
      const filename = new TextEncoder().encode(name), crc = crc32(data);
      const header = new Uint8Array(30), h = new DataView(header.buffer);
      h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(12,33,true); h.setUint32(14,crc,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,filename.length,true);
      blocks.push(header,filename,data);
      const directory = new Uint8Array(46), d = new DataView(directory.buffer);
      d.setUint32(0,0x02014b50,true); d.setUint16(4,20,true); d.setUint16(6,20,true); d.setUint16(14,33,true); d.setUint32(16,crc,true); d.setUint32(20,data.length,true); d.setUint32(24,data.length,true); d.setUint16(28,filename.length,true); d.setUint32(42,offset,true);
      central.push(directory,filename); centralLength += 46 + filename.length; offset += 30 + filename.length + data.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0,0x06054b50,true); e.setUint16(8,entries.length,true); e.setUint16(10,entries.length,true); e.setUint32(12,centralLength,true); e.setUint32(16,offset,true);
    return new Blob([...blocks,...central,end],{type:'application/zip'});
  }
})();
