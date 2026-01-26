// Atualizar hora atual usando offset do servidor
function updateCurrentTimeWithOffset(offsetMs) {
  const now = new Date(Date.now() + offsetMs);
  const timeString = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    timeElement.textContent = timeString;
  }

  const clockElements = document.querySelectorAll('.server-clock');
  if (clockElements.length) {
    clockElements.forEach((el) => {
      el.textContent = timeString;
    });
  }
}

function scheduleMinuteAlignedUpdates(offsetMs) {
  const now = new Date(Date.now() + offsetMs);
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  const delay = Math.max(msToNextMinute, 0);

  updateCurrentTimeWithOffset(offsetMs);

  setTimeout(() => {
    updateCurrentTimeWithOffset(offsetMs);
    setInterval(() => updateCurrentTimeWithOffset(offsetMs), 60000);
  }, delay);
}

async function initServerClock() {
  const hasClock = document.getElementById('currentTime') || document.querySelector('.server-clock');
  if (!hasClock) return;

  try {
    const response = await fetch('/hora-atual/', { cache: 'no-store' });
    if (!response.ok) throw new Error('Falha ao obter horario do servidor');

    const data = await response.json();
    const serverMs = Number(data.timestamp_ms);
    if (!Number.isFinite(serverMs)) throw new Error('Horario do servidor invalido');

    const offsetMs = serverMs - Date.now();
    scheduleMinuteAlignedUpdates(offsetMs);
  } catch (error) {
    console.warn('Falha ao sincronizar horario do servidor:', error);
    scheduleMinuteAlignedUpdates(0);
  }
}

initServerClock();

// Funcao de confirmacao modal
window.showConfirm = function(message, title) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) return resolve(window.confirm(message));

    const modal = new bootstrap.Modal(modalEl);
    const body = document.getElementById('confirmModalBody');
    const label = document.getElementById('confirmModalLabel');
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');

    // Resetar modal
    ok.textContent = 'Confirmar';
    cancel.style.display = 'block';
    cancel.textContent = 'Cancelar';

    // Configurar conteudo
    label.textContent = title || 'Confirmação';
    body.textContent = message;

    const finish = (value) => {
      // Remover event listeners
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);

      const onHidden = () => {
        modalEl.removeEventListener('hidden.bs.modal', onHidden);
        resolve(value);
      };

      modalEl.addEventListener('hidden.bs.modal', onHidden);
      modal.hide();
    };

    const onOk = () => finish(true);
    const onCancel = () => finish(false);

    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);

    modal.show();
  });
};

// Funcao de alerta modal
window.showAlert = function(message, title) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) {
      alert(message);
      return resolve();
    }

    const modal = new bootstrap.Modal(modalEl);
    const body = document.getElementById('confirmModalBody');
    const label = document.getElementById('confirmModalLabel');
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');

    // Configurar como alerta (apenas OK)
    ok.textContent = 'OK';
    cancel.style.display = 'none';

    // Configurar conteudo
    label.textContent = title || 'Aviso';
    body.textContent = message;

    const finish = () => {
      ok.removeEventListener('click', onOk);

      const onHidden = () => {
        modalEl.removeEventListener('hidden.bs.modal', onHidden);
        // Restaurar configuracoes padrao
        ok.textContent = 'Confirmar';
        cancel.style.display = 'block';
        resolve();
      };

      modalEl.addEventListener('hidden.bs.modal', onHidden);
      modal.hide();
    };

    const onOk = () => finish();
    ok.addEventListener('click', onOk);

    modal.show();
  });
};

// CSRF Token para requisicoes AJAX
function getCSRFToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Funcao helper para requisicoes com CSRF
window.apiRequest = async function(url, options = {}) {
  const defaultOptions = {
    headers: {
      'X-CSRFToken': getCSRFToken(),
      'Content-Type': 'application/json'
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
};

function stripFieldTooltipAttributes(root) {
  const fieldSelector = 'input, select, textarea';
  const fields = [];

  if (!root) return;
  if (root.matches && root.matches(fieldSelector)) fields.push(root);
  if (root.querySelectorAll) {
    root.querySelectorAll(fieldSelector).forEach((el) => fields.push(el));
  }

  fields.forEach((el) => {
    if (el.hasAttribute('title')) el.removeAttribute('title');

    const dataBsToggle = el.getAttribute('data-bs-toggle');
    if (dataBsToggle && dataBsToggle.toLowerCase() === 'tooltip') el.removeAttribute('data-bs-toggle');

    const dataToggle = el.getAttribute('data-toggle');
    if (dataToggle && dataToggle.toLowerCase() === 'tooltip') el.removeAttribute('data-toggle');

    if (el.hasAttribute('data-bs-original-title')) el.removeAttribute('data-bs-original-title');
    if (el.hasAttribute('data-original-title')) el.removeAttribute('data-original-title');
    if (el.hasAttribute('data-bs-title')) el.removeAttribute('data-bs-title');
    if (el.hasAttribute('data-title')) el.removeAttribute('data-title');

    if (window.bootstrap && typeof bootstrap.Tooltip === 'function' && typeof bootstrap.Tooltip.getInstance === 'function') {
      const instance = bootstrap.Tooltip.getInstance(el);
      if (instance) instance.dispose();
    }

    if (window.jQuery && jQuery.fn && typeof jQuery.fn.tooltip === 'function') {
      try {
        jQuery(el).tooltip('dispose');
      } catch (error) {
        // ignore tooltip cleanup failures
      }
    }
  });
}

// Inicializar tooltips do Bootstrap
document.addEventListener('DOMContentLoaded', function() {
  const fieldSelector = 'input, select, textarea';
  stripFieldTooltipAttributes(document);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        if (mutation.target && mutation.target.matches && mutation.target.matches(fieldSelector)) {
          stripFieldTooltipAttributes(mutation.target);
        }
        return;
      }

      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          stripFieldTooltipAttributes(node);
        });
      }
    });
  });

  if (document.body) {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'title',
        'data-bs-toggle',
        'data-toggle',
        'data-bs-original-title',
        'data-original-title',
        'data-bs-title',
        'data-title'
      ]
    });
  }

  if (window.bootstrap && typeof bootstrap.Tooltip === 'function') {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList
      .filter((el) => !el.matches(fieldSelector))
      .map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
  }
});
