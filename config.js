(function () {
  const API_HOST = 'api.hkjzyk.top';
  const API_HTTPS_BASE = `https://${API_HOST}`;
  const host = window.location.hostname;
  const isFile = window.location.protocol === 'file:';
  const isSameOriginBackend = host === 'localhost'
    || host === '127.0.0.1'
    || host === '39.102.51.140'
    || host === API_HOST;

  const apiBase = isFile
    ? 'http://localhost:8080'
    : (isSameOriginBackend ? '' : API_HTTPS_BASE);

  window.YANHUA_API_BASE = apiBase;
  window.RECRUITMENT_API_BASE = apiBase;
  window.INVITATION_API_BASE = apiBase;
  window.TODO_API_BASE = apiBase;
})();
