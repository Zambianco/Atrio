// Atualizar hora atual
function updateCurrentTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    timeElement.textContent = timeString;
  }
}

// Inicializar hora e atualizar a cada minuto
updateCurrentTime();
setInterval(updateCurrentTime, 60000);

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

// Inicializar tooltips do Bootstrap
document.addEventListener('DOMContentLoaded', function() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});
