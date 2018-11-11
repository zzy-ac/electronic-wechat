'use strict';

const path = require('path');
const {app, shell , ipcMain , Notification} = require('electron');


const UpdateHandler = require('./handlers/update');
const Common = require('./common');
const AppConfig = require('./configuration');

const SplashWindow = require('./windows/controllers/splash');
const WeChatWindow = require('./windows/controllers/wechat');
const SettingsWindow = require('./windows/controllers/settings')
const AppTray = require('./windows/controllers/app_tray');


class ElectronicWeChat {
  constructor() {
    this.wechatWindow = null;
    this.splashWindow = null;
    this.settingsWindow = null;
    this.tray = null;
  }

  init() {
    if(this.checkInstance()) {
      this.initSetting();
      this.initProxy();
      this.initApp();
      this.initIPC();
    } else {
      app.quit();
    }
  }

  checkInstance() {
    if (AppConfig.readSettings('multi-instance') === 'on') return true;
    return app.requestSingleInstanceLock() // 已存在实例的时候返回false 并向第一个实例发送second-instance事件
  }

  initSetting(){
    if (!AppConfig.readSettings('css')) {
      AppConfig.saveSettings('language', AppConfig.readSettings('language')||'zh-CN');
      AppConfig.saveSettings('prevent-recall', AppConfig.readSettings('prevent-recall')||'on');
      AppConfig.saveSettings('icon', AppConfig.readSettings('icon')||'black');
      AppConfig.saveSettings('multi-instance',AppConfig.readSettings('multi-instance')||'on');
      AppConfig.saveSettings('click-notification',AppConfig.readSettings('click-notification')||'on')
      AppConfig.saveSettings('frame',AppConfig.readSettings('frame')||'on')
      AppConfig.saveSettings('close',AppConfig.readSettings('close')||'on')
      AppConfig.saveSettings('update',AppConfig.readSettings('update')||'on')
      AppConfig.saveSettings('width',AppConfig.readSettings('width')||800)
      AppConfig.saveSettings('height',AppConfig.readSettings('height')||600)
      AppConfig.saveSettings('proxy',AppConfig.readSettings('proxy')||'on')
      AppConfig.saveSettings('proxy-url',AppConfig.readSettings('proxy-url')||'socks5://127.0.0.1:1080')
      AppConfig.saveSettings('chat-area-offset-y',AppConfig.readSettings('chat-area-offset-y')||'0')
      AppConfig.saveSettings('blur',AppConfig.readSettings('blur')||'off')
      AppConfig.saveSettings('hide-notification-body',AppConfig.readSettings('hide-notification-body')||'off')
      AppConfig.saveSettings('css',AppConfig.readSettings('css')||'on')
      AppConfig.saveSettings('css-content',AppConfig.readSettings('css-content')||'')
    }
  }

  initProxy(){
    if(AppConfig.readSettings('proxy') === 'off'){
      app.commandLine.appendSwitch('no-proxy-server');
    }
    if(AppConfig.readSettings('proxy') === 'setProxy'){
      app.commandLine.appendSwitch('proxy-server',AppConfig.readSettings('proxy-url'));
    }
  }

  initApp() {
    app.on('second-instance',() => {
      if(this.splashWindow && this.splashWindow.isShown){
        this.splashWindow.show();
        return
      }
      if(this.wechatWindow){
        this.wechatWindow.show();
      }
      if(this.settingsWindow && this.settingsWindow.isShown){
        this.settingsWindow.show();
      }
    })

    app.on('ready', ()=> {
      this.createSplashWindow();
      this.createWeChatWindow();
      this.createSettingsWindow()
      this.createTray();

      new Notification({
        title:'Electronic WeChat',
        body:'已经准备就绪',
        icon:path.join(__dirname, '../assets/icon.png')
      }).show()
    });

    app.on('activate', () => {
      if (this.wechatWindow == null) {
        this.createWeChatWindow();
      } else {
        this.wechatWindow.show();
      }
    });
  };

  initIPC() {
    ipcMain.on('badge-changed', (event, num) => {
      if (process.platform == "darwin") {
        app.dock.setBadge(num);
        if (num) {
          this.tray.setTitle(` ${num}`);
        } else {
          this.tray.setTitle('');
        }
      } else if (process.platform === "linux" || process.platform === "win32") {
          app.setBadgeCount(num * 1);
          this.tray.setUnreadStat((num * 1 > 0)? 1 : 0);
      }
    });

    ipcMain.on('user-logged', () => {
      this.wechatWindow.resizeWindow(true, this.splashWindow)
    });

    ipcMain.on('wx-rendered', (event, isLogged) => {
      this.wechatWindow.resizeWindow(isLogged, this.splashWindow)
    });

    ipcMain.on('log', (event, message) => {
      console.log(message);
    });

    ipcMain.on('reload', (event, repetitive) => {
      if (repetitive) {
        this.wechatWindow.loginState.current = this.wechatWindow.loginState.NULL;
        this.wechatWindow.connectWeChat();
      } else {
        this.wechatWindow.loadURL(Common.WEB_WECHAT);
      }
    });

    ipcMain.on('update', (event, message) => {
      let updateHandler = new UpdateHandler();
      updateHandler.checkForUpdate(`v${app.getVersion()}`, false);
      // shell.openExternal(Common.FORKER_GITHUB_RELEASES);
    });

    ipcMain.on('open-settings-window', (event, message) => {
      // if (this.settingsWindow) {
      //   this.settingsWindow.show();
      // } else {
      //   this.createSettingsWindow();
      //   this.settingsWindow.show();
      // }
      this.settingsWindow.show()
    });

    ipcMain.on('close-settings-window', (event, messgae) => {
      // this.settingsWindow.close();
      // this.settingsWindow = null;
      this.settingsWindow.hide();
    })

    ipcMain.on('click-notification', (event, messgae) => {
        // let osNotification = new Notification({
        //   title:messgae.title,
        //   body:messgae.opt.body,
        //   //icon:messgae.opt.icon
        //   icon:path.join(__dirname, '../assets/icon.png')
        // })
        // if(AppConfig.readSettings('click-notification') === 'on'){
        //   osNotification.on('click',()=>{
        //     event.sender.send(messgae.ename)
        //     this.wechatWindow.show()
        //   })
        // }
        // osNotification.show()
        this.wechatWindow.show()
    })

    ipcMain.on('miniFrame-close',()=>{
      this.wechatWindow.close();
    })
    ipcMain.on('miniFrame-minimize',()=>{
      this.wechatWindow.minimize();
    })
    ipcMain.on('miniFrame-setFullScreen',(event,flag)=>{
      this.wechatWindow.setFullScreen(flag);
    })
    ipcMain.on('console',(event,data)=>{
      console.log(data)
    })
  };

  createTray() {
    this.tray = new AppTray(this.splashWindow, this.wechatWindow ,this.settingsWindow);
  }

  createSplashWindow() {
    this.splashWindow = new SplashWindow();
    this.splashWindow.show();
  }

  createWeChatWindow() {
    this.wechatWindow = new WeChatWindow();
  }

  createSettingsWindow() {
    this.settingsWindow = new SettingsWindow();
  }

}

new ElectronicWeChat().init();
