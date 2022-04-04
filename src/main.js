import Vue from 'vue';
import VueAnalytics from 'vue-analytics';
import App from './App.vue';
import router from './router';
import store from './store';
import i18n from '@/locale';
import '@/assets/icons';
import '@/utils/filters';
import './registerServiceWorker';
import { dailyTask } from '@/utils/common';
import '@/assets/css/global.scss';
import NProgress from 'nprogress';
import '@/assets/css/nprogress.css';
import {
  getAuth,
  getUser,
  createConnection,
  subscribeEntities,
  ERR_HASS_HOST_REQUIRED,
} from 'home-assistant-js-websocket';

window.resetApp = () => {
  localStorage.clear();
  indexedDB.deleteDatabase('yesplaymusic');
  document.cookie.split(';').forEach(function (c) {
    document.cookie = c
      .replace(/^ +/, '')
      .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });
  return '已重置应用，请刷新页面（按Ctrl/Command + R）';
};
console.log(
  '如出现问题，可尝试在本页输入 %cresetApp()%c 然后按回车重置应用。',
  'background: #eaeffd;color:#335eea;padding: 4px 6px;border-radius:3px;',
  'background:unset;color:unset;'
);

Vue.use(VueAnalytics, {
  id: 'UA-180189423-1',
  router,
});
Vue.config.productionTip = false;

NProgress.configure({ showSpinner: false, trickleSpeed: 100 });
dailyTask();

new Vue({
  i18n,
  store,
  router,
  data: {
    available_entities: available_entities,
  },
  mounted: function () {
    if (store.state.settings.connectHA) {
      connectToHA();
    }
  },
  render: h => h(App),
}).$mount('#app');

async function connectToHA() {
  let auth;
  const storeAuth = true;
  const authOptions = storeAuth
    ? {
        async loadTokens() {
          try {
            return JSON.parse(localStorage.hassTokens);
          } catch (err) {
            return undefined;
          }
        },
        saveTokens: tokens => {
          localStorage.hassTokens = JSON.stringify(tokens);
        },
      }
    : {};
  try {
    auth = await getAuth(authOptions);
  } catch (err) {
    if (err === ERR_HASS_HOST_REQUIRED) {
      authOptions.hassUrl = prompt(
        'What host to connect to?',
        'https://myha.me'
      );
      if (!authOptions.hassUrl) return;
      auth = await getAuth(authOptions);
    } else {
      alert(`Unknown error: ${err}`);
      return;
    }
  }
  const connection = await createConnection({ auth });
  for (const ev of ['disconnected', 'ready', 'reconnect-error']) {
    connection.addEventListener(ev, () => console.log(`Event: ${ev}`));
  }
  subscribeEntities(connection, entities =>
    renderEntities(connection, entities)
  );
  // Clear url if we have been able to establish a connection
  if (location.search.includes('auth_callback=1')) {
    history.replaceState(null, '', location.pathname);
  }

  // To play from the console
  window.auth = auth;
  window.connection = connection;
  getUser(connection).then(user => {
    console.log('Logged in as', user);
    window.user = user;
  });
}

const available_entities = new Array();
function renderEntities(connection, entities) {
  window.entities = entities;
  Object.keys(entities)
    .sort()
    .forEach(entId => {
      if (
        ['media_player'].includes(entId.split('.', 1)[0]) &&
        entities[entId].state != 'off' &&
        entities[entId].state != 'unavailable'
      ) {
        //判断是否已经存在
        if (available_entities.indexOf(entId) === -1) {
          available_entities.push(entId);
          console.log(available_entities);
        }
      }
    });
}

if (store.state.settings.connectHA) {
  //const ele_device = document.querySelector('#devices');
  //connectToHA();
  //while (ele_device.lastChild) ele_device.removeChild(ele_device.lastChild);
  // Object.keys(available_entities)
  //   .sort()
  //   .forEach(item => {
  //     const option = document.createElement('option');
  //     option.innerHTML = item;
  //     ele_device.appendChild(option);
  //   });
}
