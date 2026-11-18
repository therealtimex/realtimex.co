// TODO: consider for alternative: https://github.com/developit/mitt
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }
}

const OpenID = ({ url = 'https://accounts.rtworkspace.com/auth/', realm = 'rta', clientId }) => {
  if (!clientId) {
    throw new Error('Client ID is required for OpenID initialization');
  }

  const emitter = new EventEmitter();

  const keycloak = new Keycloak({
    url,
    realm,
    clientId
  });

  const onAuthenticated = () => {
    const client = openid.getClient();

    emitter.emit('sso_authenticated', client);

    client.loadUserInfo().then((profile) => {
      emitter.emit('sso_profile_loaded', profile);
    });
  }

  const onUnauthenticated = () => {
    emitter.emit('sso_unauthenticated');
  }

  const onError = (error) => {
    emitter.emit('sso_error', error);
  }

  return {
    getClient: () => keycloak,
    emitter: () => emitter,
    init: ({
      onLoad = 'check-sso',
      silentPath = '/sso/check'
    }) => {
      keycloak.init({
        onLoad,
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: window.location.origin + silentPath,
      }).then((authenticated) => {
        if (authenticated) {
          onAuthenticated();
        } else {
          onUnauthenticated();
        }
      }).catch(error => {
        console.error('OpenID Error:', error);
        onError(error);
      });
    }
  }
}