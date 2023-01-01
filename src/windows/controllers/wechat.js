/**
 * Created by Zhongyi on 5/2/16.
 */

'use strict';

const path = require('path');
const isXfce = require('is-xfce');
const { app, shell, BrowserWindow , globalShortcut , ipcMain, Notification} = require('electron');
const electronLocalShortcut = require('electron-localshortcut');

const AppConfig = require('../../configuration');

const CSSInjector = require('../../inject/css');
const MessageHandler = require('../../handlers/message');
const UpdateHandler = require('../../handlers/update');

const Common = require('../../common');;

class WeChatWindow {
  constructor() {
    this.isLogged = false;
    this.isShown = false;
    this.loginState = { NULL: -2, WAITING: -1, YES: 1, NO: 0 };
    this.loginState.current = this.loginState.NULL;
    this.inervals = {};
    this.createWindow();
    this.initWechatWindowShortcut();
    this.initWindowEvents();
    this.initWindowWebContent();
  }

  resizeWindow(isLogged, splashWindow) {
    const WECHAT_SIZE = {
      width:AppConfig.readSettings('width'),
      height:AppConfig.readSettings('height'),
    }
    const size = isLogged ? WECHAT_SIZE : Common.WINDOW_SIZE_LOGIN;
    this.isLogged = isLogged
    this.wechatWindow.setSize(size.width, size.height);
    if (this.loginState.current === 1 - isLogged || this.loginState.current === this.loginState.WAITING) {
      splashWindow.hide();
      this.show();
      this.loginState.current = isLogged;
    }
    if(!isLogged){
      this.wechatWindow.center()
    }
  }

  createWindow() {
    this.wechatWindow = new BrowserWindow({
      title: Common.ELECTRONIC_WECHAT,
      resizable: true,
      center: true,
      show: false,
      frame: AppConfig.readSettings('frame') !== 'on',
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../../../assets/icon.png'),
      titleBarStyle: 'hidden-inset',
      webPreferences: {
        javascript: true,
        plugins: true,
        nodeIntegration: false,
        webSecurity: false,
        preload: path.join(__dirname, '../../inject/preload.js'),
      },
    });
    /* menu is always visible on xfce session */
    isXfce().then(data => {
      if(data) {
        this.wechatWindow.setMenuBarVisibility(true);
        this.wechatWindow.setAutoHideMenuBar(false);
      }
    });
  }

  loadURL(url) {
    this.wechatWindow.loadURL(url);
  }

  show() {
    if(!this.wechatWindow.isVisible()){
      this.wechatWindow.webContents.send('show-wechat-window');
    }
    this.wechatWindow.show();
  }

  hide() {
    this.wechatWindow.hide();
  }

  minimize(){
    this.wechatWindow.minimize();
  }

  restore(){
    this.wechatWindow.restore();
  }

  setFullScreen(flag){
    this.wechatWindow.setFullScreen(flag);
  }

  close(){
    this.isShown = false
    this.hide()
    if(AppConfig.readSettings('close') !== 'on'){
      this.exit()
    }
  }

  exit(){
    this.hide()
    if(this.isLogged){
      this.wechatWindow.webContents.send('loginout');
    }
    if(!this.isLogged){
      app.exit(0)
      return
    }
    setInterval(()=>{
      if(!this.isLogged){
        app.exit(0)
      }
    },1000)
  }

  connectWeChat() {
    Object.keys(this.inervals).forEach((key, index) => {
      clearInterval(key);
      delete this.inervals[key];
    });

    this.loadURL(Common.WEB_WECHAT);
    const int = setInterval(() => {
      if (this.loginState.current === this.loginState.NULL) {
        this.loadURL(Common.WEB_WECHAT);
        console.log('Reconnect.');
      }
    }, 5000);
    this.inervals[int] = true;
  }

  initWindowWebContent() {
    this.wechatWindow.webContents.setUserAgent(Common.USER_AGENT[process.platform]);
    if (Common.DEBUG_MODE) {
      this.wechatWindow.webContents.openDevTools();
    }

    this.connectWeChat();

    this.wechatWindow.webContents.on('will-navigate', (ev, url) => {
      if (/(.*wx.*\.qq\.com.*)|(web.*\.wechat\.com.*)/.test(url)) return;
      ev.preventDefault();
    });

    this.wechatWindow.webContents.on('dom-ready', () => {
      this.wechatWindow.webContents.insertCSS(CSSInjector.commonCSS);
      if (process.platform === 'darwin') {
        this.wechatWindow.webContents.insertCSS(CSSInjector.osxCSS);
      }

      if(AppConfig.readSettings('css') === 'on'){
        this.wechatWindow.webContents.send('setCss', AppConfig.readSettings('css-content'));
      }


      if (AppConfig.readSettings('update') === 'on') {
        new UpdateHandler().checkForUpdate(`v${app.getVersion()}`, true);
      }
    });

    this.wechatWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      shell.openExternal(new MessageHandler().handleRedirectMessage(url));
    });

    this.wechatWindow.webContents.on('will-navigate', (event, url) => {
      if (url.endsWith('/fake')) event.preventDefault();
    });
  }

  initWindowEvents() {
    ipcMain.on('refreshCss', (e,css) => {
      this.wechatWindow.webContents.send('setCss', css);
    });

    ipcMain.on('refreshZoom', () => {
      this.wechatWindow.webContents.send('refreshZoom');
    });

    ipcMain.on('clearHistory', () => {
      this.wechatWindow.webContents.send('clearHistory');
    });

    this.wechatWindow.on('close', (e) => {
      // if (this.wechatWindow.isVisible()) {
      //   this.unregisterLocalShortCut();
      //   e.preventDefault();
      //   this.close();
      // }
      this.close();
      e.preventDefault();
    });

    this.wechatWindow.on('page-title-updated', (ev) => {
      if (this.loginState.current === this.loginState.NULL) {
        this.loginState.current = this.loginState.WAITING;
      }
      ev.preventDefault();
    });

    this.wechatWindow.on('show', () => {
      this.isShown = true;
      // this.registerLocalShortcut();
      this.wechatWindow.webContents.send('show-wechat-window');
      this.wechatWindow.focus();
    });

    this.wechatWindow.on('hide', () => {
      this.wechatWindow.webContents.send('hide-wechat-window');
      this.isShown = false;
    });

    this.wechatWindow.on('minimize', () => {
      this.isShown = false;
      this.wechatWindow.webContents.send('hide-wechat-window');
    });

    this.wechatWindow.on('restore', () => {
      this.isShown = true;
      // this.registerLocalShortcut();
      this.wechatWindow.webContents.send('show-wechat-window');
      this.wechatWindow.focus();
    });

    this.wechatWindow.on('focus', () => {
      this.isShown = true;
      this.wechatWindow.webContents.send('show-wechat-window');
    });

    this.wechatWindow.on('blur', () => {
      if(AppConfig.readSettings('blur') === 'on'){
        this.isShown = false;
        this.wechatWindow.webContents.send('hide-wechat-window');
      }
    });

    this.wechatWindow.on('resize',(event) => {
      if(this.isLogged){
        this.debounce(
          () => {
            let size = this.wechatWindow.getSize()
            AppConfig.saveSettings('width',size[0])
            AppConfig.saveSettings('height',size[1])
          }
        )
      }
    })

    this.wechatWindow.on('exit', () => {
      this.exit()
    });
  }

  unregisterLocalShortCut() {//注销快捷键
    try{
      electronLocalShortcut.unregisterAll(this.wechatWindow);
    }catch(e){
      //　快捷键解绑失败
    }
    
  }

  initWechatWindowShortcut() {
    try{
      globalShortcut.register('CommandOrControl+Alt+W', () => {
        this.show()
      })
      electronLocalShortcut.register(this.wechatWindow, 'CommandOrControl+H', () => {
        this.minimize();
      });
    }catch(e){
      //　快捷键绑定失败
      (new Notification({
        title:"electronic-wechat",
        body: "快捷键绑定失败",
        icon:path.join(__dirname, '../assets/icon.png')
      })).show()
    }
  }

  debounce(func){//防抖
    clearTimeout(this.timer)
    this.timer = setTimeout(()=>{
      func()
    },300)
  }
}

module.exports = WeChatWindow;
