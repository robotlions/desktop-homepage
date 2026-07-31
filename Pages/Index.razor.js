var _isDraggingTrash = false;
var _folderDrag = {};
var _desktopWindowDrag = { bindings: [] };
var _launcherIconBound = new WeakSet();
var _windowFocusBound = new WeakSet();
var _topZ = 40;

export function registerFolderDrag(dotNetRef) {
	unregisterFolderDrag();

	var _folderDeletedByTrash = false;
	var _textFileDeletedByTrash = false;
	var _textFileDroppedInFolder = false;
	var _isDraggingFolder = false;

	function attachFolderHandlers() {
		var folder = document.getElementById('folder');
		if (!folder) return null;

		var folderOffsetX = 0, folderOffsetY = 0;
		var desktopEl = document.querySelector('.desktop-area');

		var onDragStart = function (e) {
			if (e.dataTransfer) e.dataTransfer.setData('text/plain', 'folder');
			folder.classList.add('dragging');
			_folderDeletedByTrash = false;
			_isDraggingFolder = true;
			var rect = folder.getBoundingClientRect();
			folderOffsetX = e.clientX - rect.left;
			folderOffsetY = e.clientY - rect.top;
		};
		var onDragEnd = function (e) {
			folder.classList.remove('dragging');
			_isDraggingFolder = false;
			if (_folderDeletedByTrash) return;
			var dr = desktopEl ? desktopEl.getBoundingClientRect() : null;
			var inside = dr && e.clientX >= dr.left && e.clientX <= dr.right && e.clientY >= dr.top && e.clientY <= dr.bottom;
			if (inside) {
				var newLeft = Math.max(0, Math.min(e.clientX - dr.left - folderOffsetX, dr.width - folder.offsetWidth));
				var newTop = Math.max(0, Math.min(e.clientY - dr.top - folderOffsetY, dr.height - folder.offsetHeight));
				folder.style.left = newLeft + 'px';
				folder.style.top = newTop + 'px';
				try { dotNetRef.invokeMethodAsync('OnFolderMoved', newLeft, newTop).catch(function () { }); } catch (e2) { }
			} else {
				folder.style.left = '60px';
				folder.style.top = '12px';
				try { dotNetRef.invokeMethodAsync('OnFolderMoved', 60, 12).catch(function () { }); } catch (e2) { }
			}
		};

		try { folder.removeEventListener('dragstart', onDragStart); } catch (e) { }
		try { folder.removeEventListener('dragend', onDragEnd); } catch (e) { }

		folder.addEventListener('dragstart', onDragStart);
		folder.addEventListener('dragend', onDragEnd);

		return { el: folder, onDragStart: onDragStart, onDragEnd: onDragEnd };
	}

	var folderHandlers = attachFolderHandlers();

	function attachTextFileHandlers() {
		var textFile = document.getElementById('text-file');
		if (!textFile) return null;

		var offsetX = 0, offsetY = 0;
		var desktopEl = document.querySelector('.desktop-area');

		var onDragStart = function (e) {
			if (e.dataTransfer) e.dataTransfer.setData('text/plain', 'text-file');
			textFile.classList.add('dragging');
			_textFileDeletedByTrash = false;
			_textFileDroppedInFolder = false;
			var rect = textFile.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;
		};
		var onDragEnd = function (e) {
			textFile.classList.remove('dragging');
			if (_textFileDeletedByTrash || _textFileDroppedInFolder) return;
			var dr = desktopEl ? desktopEl.getBoundingClientRect() : null;
			var inside = dr && e.clientX >= dr.left && e.clientX <= dr.right && e.clientY >= dr.top && e.clientY <= dr.bottom;
			if (inside) {
				var newLeft = Math.max(0, Math.min(e.clientX - dr.left - offsetX, dr.width - textFile.offsetWidth));
				var newTop = Math.max(0, Math.min(e.clientY - dr.top - offsetY, dr.height - textFile.offsetHeight));
				textFile.style.left = newLeft + 'px';
				textFile.style.top = newTop + 'px';
				try { dotNetRef.invokeMethodAsync('OnTextFileMoved', newLeft, newTop).catch(function () { }); } catch (e2) { }
			} else {
				textFile.style.left = '60px';
				textFile.style.top = '85px';
				try { dotNetRef.invokeMethodAsync('OnTextFileMoved', 60, 85).catch(function () { }); } catch (e2) { }
			}
		};

		try { textFile.removeEventListener('dragstart', onDragStart); } catch (e) { }
		try { textFile.removeEventListener('dragend', onDragEnd); } catch (e) { }
		textFile.addEventListener('dragstart', onDragStart);
		textFile.addEventListener('dragend', onDragEnd);

		return { el: textFile, onDragStart: onDragStart, onDragEnd: onDragEnd };
	}

	var textFileHandlers = attachTextFileHandlers();

	// register folder as drop target for text file only (not trash)
	var folderDropEl = document.getElementById('folder');
	var folderDropHandlers = null;
	if (folderDropEl) {
		var onFolderDragOver = function (ev) {
			if (_isDraggingFolder || _isDraggingTrash) return;
			ev.preventDefault();
			if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
			folderDropEl.classList.add('over');
		};
		var onFolderDragLeave = function (ev) { folderDropEl.classList.remove('over'); };
		var onFolderDrop = function (ev) {
			if (_isDraggingFolder || _isDraggingTrash) return;
			ev.preventDefault();
			folderDropEl.classList.remove('over');
			var dragType = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '';
			if (dragType === 'text-file') {
				_textFileDroppedInFolder = true;
				try { dotNetRef.invokeMethodAsync('OnTextFileDroppedInFolder').catch(function () { }); } catch (e) { }
			}
		};
		folderDropEl.addEventListener('dragover', onFolderDragOver);
		folderDropEl.addEventListener('dragleave', onFolderDragLeave);
		folderDropEl.addEventListener('drop', onFolderDrop);
		folderDropHandlers = { el: folderDropEl, onDragOver: onFolderDragOver, onDragLeave: onFolderDragLeave, onDrop: onFolderDrop };
	}

	// desktop-area is the single valid drop zone
	var hotspots = [];
	var desktopDropEl = document.getElementById('desktop-area');
	if (desktopDropEl) {
		var onDesktopDragOver = function (ev) { ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'; };
		var onDesktopDragLeave = function () { };
		var onDesktopDrop = function (ev) { ev.preventDefault(); };
		desktopDropEl.addEventListener('dragover', onDesktopDragOver);
		desktopDropEl.addEventListener('drop', onDesktopDrop);
		hotspots.push({ el: desktopDropEl, onDragOver: onDesktopDragOver, onDragLeave: onDesktopDragLeave, onDrop: onDesktopDrop });
	}

	// register trash container as a drop target and drag source
	var trash = document.getElementById('trash-container');
	var trashDragHandlers = null;
	if (trash) {
		var onTrashDragOver = function (ev) { if (_isDraggingTrash) return; ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'; this.classList.add('over'); };
		var onTrashLeave = function (ev) { this.classList.remove('over'); };
		var onTrashDrop = function (ev) {
			if (_isDraggingTrash) return;
			ev.preventDefault();
			this.classList.remove('over');
			var dragType = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '';
			if (dragType === 'folder') {
				_folderDeletedByTrash = true;
				try { dotNetRef.invokeMethodAsync('OnFolderDeleted').catch(function () { }); } catch (e) { }
			} else if (dragType === 'text-file') {
				_textFileDeletedByTrash = true;
				try { dotNetRef.invokeMethodAsync('OnTextFileDeleted').catch(function () { }); } catch (e) { }
			}
		};

		trash.addEventListener('dragover', onTrashDragOver);
		trash.addEventListener('dragleave', onTrashLeave);
		trash.addEventListener('drop', onTrashDrop);
		hotspots.push({ el: trash, onDragOver: onTrashDragOver, onDragLeave: onTrashLeave, onDrop: onTrashDrop });

		// trash as drag source — repositions it within the desktop
		var trashOffsetX = 0, trashOffsetY = 0;
		var desktopEl = document.querySelector('.desktop-area');
		var onTrashDragStart = function (e) {
			_isDraggingTrash = true;
			trash.classList.add('dragging');
			var rect = trash.getBoundingClientRect();
			trashOffsetX = e.clientX - rect.left;
			trashOffsetY = e.clientY - rect.top;
			if (e.dataTransfer) { e.dataTransfer.setData('text/plain', 'trash'); e.dataTransfer.effectAllowed = 'move'; }
		};
		var onTrashDragEnd = function (e) {
			_isDraggingTrash = false;
			trash.classList.remove('dragging');
			if (desktopEl && e.clientX !== 0 && e.clientY !== 0) {
				var dr = desktopEl.getBoundingClientRect();
				var newLeft = Math.max(0, Math.min(e.clientX - dr.left - trashOffsetX, dr.width - trash.offsetWidth));
				var newTop = Math.max(0, Math.min(e.clientY - dr.top - trashOffsetY, dr.height - trash.offsetHeight));
				trash.style.right = 'auto';
				trash.style.bottom = 'auto';
				trash.style.left = newLeft + 'px';
				trash.style.top = newTop + 'px';
			}
		};
		trash.setAttribute('draggable', 'true');
		trash.addEventListener('dragstart', onTrashDragStart);
		trash.addEventListener('dragend', onTrashDragEnd);
		trashDragHandlers = { el: trash, onDragStart: onTrashDragStart, onDragEnd: onTrashDragEnd };
	}

	_folderDrag = { folderHandlers: folderHandlers, textFileHandlers: textFileHandlers, folderDropHandlers: folderDropHandlers, hotspots: hotspots, dotNetRef: dotNetRef, trashDragHandlers: trashDragHandlers };
}

export function unregisterFolderDrag() {
	var state = _folderDrag;
	if (!state) return;
	try {
		if (state.folderHandlers) {
			try { if (state.folderHandlers.el) state.folderHandlers.el.removeEventListener('dragstart', state.folderHandlers.onDragStart); } catch (e) { }
			try { if (state.folderHandlers.el) state.folderHandlers.el.removeEventListener('dragend', state.folderHandlers.onDragEnd); } catch (e) { }
		}
		if (state.hotspots) {
			state.hotspots.forEach(function (h) {
				h.el.removeEventListener('dragover', h.onDragOver);
				h.el.removeEventListener('dragleave', h.onDragLeave);
				h.el.removeEventListener('drop', h.onDrop);
			});
		}
		if (state.trashDragHandlers) {
			try { state.trashDragHandlers.el.removeEventListener('dragstart', state.trashDragHandlers.onDragStart); } catch (e) { }
			try { state.trashDragHandlers.el.removeEventListener('dragend', state.trashDragHandlers.onDragEnd); } catch (e) { }
		}
		if (state.textFileHandlers) {
			try { if (state.textFileHandlers.el) state.textFileHandlers.el.removeEventListener('dragstart', state.textFileHandlers.onDragStart); } catch (e) { }
			try { if (state.textFileHandlers.el) state.textFileHandlers.el.removeEventListener('dragend', state.textFileHandlers.onDragEnd); } catch (e) { }
		}
		if (state.folderDropHandlers) {
			try { state.folderDropHandlers.el.removeEventListener('dragover', state.folderDropHandlers.onDragOver); } catch (e) { }
			try { state.folderDropHandlers.el.removeEventListener('dragleave', state.folderDropHandlers.onDragLeave); } catch (e) { }
			try { state.folderDropHandlers.el.removeEventListener('drop', state.folderDropHandlers.onDrop); } catch (e) { }
		}
	} catch (e) { }
	_folderDrag = {};
}

export function registerDesktopWindowDrag() {
	unregisterDesktopWindowDrag();

	var desktopEl = document.getElementById('desktop-area');
	if (!desktopEl) return;

	function bindWindow(windowId, handleId) {
		var win = document.getElementById(windowId);
		var handle = document.getElementById(handleId);
		if (!win || !handle) return;

		if (!_windowFocusBound.has(win)) {
			_windowFocusBound.add(win);
			var onFocusDown = function (e) {
				if (e.button !== undefined && e.button !== 0) return;
				_topZ += 1;
				win.style.zIndex = _topZ;
			};
			win.addEventListener('mousedown', onFocusDown);
		}

		var dragging = false;
		var offsetX = 0;
		var offsetY = 0;

		var onHandleMouseDown = function (e) {
			if (e.button !== 0) return;
			if (e.target && e.target.closest('button, a, textarea, input, select, option, label')) return;
			var dr = desktopEl.getBoundingClientRect();
			var rect = win.getBoundingClientRect();
			if (win.style.transform !== 'none') {
				win.style.left = (rect.left - dr.left) + 'px';
				win.style.top = (rect.top - dr.top) + 'px';
				win.style.transform = 'none';
			}
			dragging = true;
			rect = win.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;
			e.preventDefault();
		};

		var onMouseMove = function (e) {
			if (!dragging) return;
			var dr = desktopEl.getBoundingClientRect();
			var newLeft = e.clientX - dr.left - offsetX;
			var newTop = e.clientY - dr.top - offsetY;
			newLeft = Math.max(0, Math.min(newLeft, dr.width - win.offsetWidth));
			newTop = Math.max(0, Math.min(newTop, dr.height - win.offsetHeight));
			win.style.left = newLeft + 'px';
			win.style.top = newTop + 'px';
		};

		var onMouseUp = function () { dragging = false; };

		handle.addEventListener('mousedown', onHandleMouseDown);
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);

		_desktopWindowDrag.bindings.push({
			windowEl: win,
			handleEl: handle,
			onMouseDown: onHandleMouseDown,
			onMouseMove: onMouseMove,
			onMouseUp: onMouseUp
		});
	}

	bindWindow('launcher-window', 'launcher-titlebar');
	bindWindow('notepad-window', 'notepad-titlebar');
	bindWindow('photography-window', 'photography-titlebar');
	bindWindow('websites-window', 'websites-titlebar');
}

export function unregisterDesktopWindowDrag() {
	if (!_desktopWindowDrag || !_desktopWindowDrag.bindings) {
		_desktopWindowDrag = { bindings: [] };
		return;
	}

	_desktopWindowDrag.bindings.forEach(function (b) {
		try { if (b.handleEl) b.handleEl.removeEventListener('mousedown', b.onMouseDown); } catch (e) { }
		try { document.removeEventListener('mousemove', b.onMouseMove); } catch (e) { }
		try { document.removeEventListener('mouseup', b.onMouseUp); } catch (e) { }
	});

	_desktopWindowDrag = { bindings: [] };
}

export function registerLauncherIconDrag() {
	var contents = document.querySelectorAll('.launcher-content, .photography-content');
	contents.forEach(function (content) {
		var links = content.querySelectorAll('.launcher-link');
		links.forEach(function (link) {
			if (_launcherIconBound.has(link)) return;
			_launcherIconBound.add(link);

			link.setAttribute('draggable', 'true');

			var startX = 0, startY = 0;

			var onDragStart = function (e) {
				if (e.dataTransfer) {
					e.dataTransfer.setData('text/plain', 'launcher-icon');
					e.dataTransfer.effectAllowed = 'move';
				}
				link.classList.add('dragging');
				startX = e.clientX;
				startY = e.clientY;
			};

			var onDragEnd = function (e) {
				link.classList.remove('dragging');
				var cr = content.getBoundingClientRect();
				if (e.clientX < cr.left || e.clientX > cr.right || e.clientY < cr.top || e.clientY > cr.bottom) return;

				var dx = e.clientX - startX;
				var dy = e.clientY - startY;
				var tx = parseFloat(link.dataset.tx || '0') + dx;
				var ty = parseFloat(link.dataset.ty || '0') + dy;

				link.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
				link.dataset.tx = tx;
				link.dataset.ty = ty;

				var r = link.getBoundingClientRect();
				var c = content.getBoundingClientRect();
				if (r.left < c.left) tx += (c.left - r.left);
				if (r.top < c.top) ty += (c.top - r.top);
				if (r.right > c.right) tx -= (r.right - c.right);
				if (r.bottom > c.bottom) ty -= (r.bottom - c.bottom);
				link.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
				link.dataset.tx = tx;
				link.dataset.ty = ty;
			};

			link.addEventListener('dragstart', onDragStart);
			link.addEventListener('dragend', onDragEnd);
		});
	});
}

export function bringToFront(windowId) {
	var win = document.getElementById(windowId);
	if (!win) return;
	_topZ += 1;
	win.style.zIndex = _topZ;
}
