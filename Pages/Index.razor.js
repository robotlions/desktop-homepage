var _appIconDrag = {};
var _desktopWindowDrag = { bindings: [] };
var _launcherIconBound = new WeakSet();
var _windowFocusBound = new WeakSet();
var _topZ = 40;

export function registerAppIconDrag(dotNetRef) {
	unregisterAppIconDrag();

	var desktopEl = document.getElementById('desktop-area');
	if (!desktopEl) return;

	var onDesktopDragOver = function (ev) { ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'; };
	var onDesktopDrop = function (ev) { ev.preventDefault(); };
	desktopEl.addEventListener('dragover', onDesktopDragOver);
	desktopEl.addEventListener('drop', onDesktopDrop);

	var defaults = {
		'desktop-icon-applications': { left: 20, top: 12 },
		'desktop-icon-websites': { left: 20, top: 162 },
		'desktop-icon-photography': { left: 20, top: 312 },
		'desktop-icon-documents': { left: 150, top: 12 },
		'desktop-icon-email': { left: 150, top: 162 }
	};

	var icons = Array.prototype.slice.call(document.querySelectorAll('.desktop-app-icon'));
	var bindings = [];

	icons.forEach(function (icon) {
		var offsetX = 0, offsetY = 0;

		var onDragStart = function (e) {
			if (e.dataTransfer) e.dataTransfer.setData('text/plain', 'desktop-icon');
			icon.classList.add('dragging');
			var rect = icon.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;
		};

		var onDragEnd = function (e) {
			icon.classList.remove('dragging');
			var def = defaults[icon.id] || { left: 20, top: 200 };
			var dr = desktopEl.getBoundingClientRect();
			var inside = e.clientX >= dr.left && e.clientX <= dr.right && e.clientY >= dr.top && e.clientY <= dr.bottom;
			if (inside) {
				var newLeft = Math.max(0, Math.min(e.clientX - dr.left - offsetX, dr.width - icon.offsetWidth));
				var newTop = Math.max(0, Math.min(e.clientY - dr.top - offsetY, dr.height - icon.offsetHeight));
				icon.style.left = newLeft + 'px';
				icon.style.top = newTop + 'px';
				try { dotNetRef.invokeMethodAsync('OnAppIconMoved', icon.id, newLeft, newTop).catch(function () { }); } catch (e2) { }
			} else {
				icon.style.left = def.left + 'px';
				icon.style.top = def.top + 'px';
				try { dotNetRef.invokeMethodAsync('OnAppIconMoved', icon.id, def.left, def.top).catch(function () { }); } catch (e2) { }
			}
		};

		icon.addEventListener('dragstart', onDragStart);
		icon.addEventListener('dragend', onDragEnd);
		bindings.push({ el: icon, onDragStart: onDragStart, onDragEnd: onDragEnd });
	});

	_appIconDrag = { bindings: bindings, desktopEl: desktopEl, onDragOver: onDesktopDragOver, onDrop: onDesktopDrop };
}

export function unregisterAppIconDrag() {
	var state = _appIconDrag;
	if (!state) {
		_appIconDrag = {};
		return;
	}
	if (state.bindings) {
		state.bindings.forEach(function (b) {
			try { b.el.removeEventListener('dragstart', b.onDragStart); } catch (e) { }
			try { b.el.removeEventListener('dragend', b.onDragEnd); } catch (e) { }
		});
	}
	try { if (state.desktopEl) state.desktopEl.removeEventListener('dragover', state.onDragOver); } catch (e) { }
	try { if (state.desktopEl) state.desktopEl.removeEventListener('drop', state.onDrop); } catch (e) { }
	_appIconDrag = {};
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
	bindWindow('photography-window', 'photography-titlebar');
	bindWindow('websites-window', 'websites-titlebar');
	bindWindow('documents-window', 'documents-titlebar');
	bindWindow('dosbox-window', 'dosbox-titlebar');
	bindWindow('games-window', 'games-titlebar');
	bindWindow('contact-window', 'contact-titlebar');
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
	var contents = document.querySelectorAll('.launcher-content, .photography-content, .documents-content');
	contents.forEach(function (content) {
		var links = content.querySelectorAll('.launcher-link, .documents-link');
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

var _dosbox = null;
var _dosboxBooted = false;
var _dosboxUrl = null;

export async function startDosbox(gameUrl) {
	var container = document.getElementById('dosbox-container');
	if (!container) return null;
	if (_dosboxBooted && _dosboxUrl === gameUrl) return _dosbox;
	if (_dosboxBooted) {
		try { await _dosbox.stop(); } catch (e) { }
		container.innerHTML = '';
		_dosbox = null;
		_dosboxBooted = false;
		_dosboxUrl = null;
	}
	var loading = document.getElementById('dosbox-loading');
	if (loading) loading.remove();
	if (typeof Dos === 'undefined') {
		container.innerHTML = '<div class="dosbox-error">DOSBOX ENGINE FAILED TO LOAD</div>';
		return null;
	}
	_dosboxBooted = true;
	_dosboxUrl = gameUrl;
	try {
		var options = {
			pathPrefix: 'https://cdn.jsdelivr.net/npm/emulators@8.4.1/dist/',
			autoStart: true
		};
		if (gameUrl) options.url = gameUrl;
		_dosbox = Dos(container, options);
		return _dosbox;
	} catch (e) {
		console.error('DOSBox failed to start:', e);
		container.innerHTML = '<div class="dosbox-error">DOSBOX FAILED TO START</div>';
		_dosboxBooted = false;
		_dosboxUrl = null;
		return null;
	}
}

export async function stopDosbox() {
	if (!_dosboxBooted) return;
	try { await _dosbox.stop(); } catch (e) { }
	var container = document.getElementById('dosbox-container');
	if (container) container.innerHTML = '';
	_dosbox = null;
	_dosboxBooted = false;
	_dosboxUrl = null;
}

export async function submitContactForm(data) {
	try {
		var resp = await fetch('https://formsubmit.co/ajax/info@robotlions.com', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				name: data.name,
				email: data.email,
				message: data.message,
				_subject: 'desktop-homepage contact message',
				_captcha: 'false',
				_template: 'table'
			})
		});
		var json = await resp.json();
		var ok = json && (json.success === 'true' || json.success === true);
		return { ok: ok, message: json && json.message ? json.message : (ok ? '' : 'REQUEST FAILED') };
	} catch (e) {
		console.error('Contact form failed:', e);
		return { ok: false, message: 'NETWORK ERROR' };
	}
}
