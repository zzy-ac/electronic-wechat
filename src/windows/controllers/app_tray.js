/**
 * Created by Zhongyi on 5/2/16.
 */

'use strict';

const path = require('path');
const { app, Menu, nativeImage, Tray, ipcMain } = require('electron');

const AppConfig = require('../../configuration');

const assetsPath = path.join(__dirname, '../../../assets');

const Common = require('../../common');;

class AppTray {
  constructor(splashWindow, wechatWindow, settingsWindow) {
    this.splashWindow = splashWindow;
    this.wechatWindow = wechatWindow;
    this.settingsWindow = settingsWindow;
    this.lastUnreadStat = 0;
    const trayColor = AppConfig.readSettings('tray-color');
    if (trayColor === 'white' || trayColor === 'black') {
      this.trayColor = trayColor;
    } else {
      this.trayColor = 'white';
      AppConfig.saveSettings('tray-color', this.trayColor);
    }
    this.createTray();
  }

  createTray() {
    let image;
    let tray=null
    if (process.platform === 'linux' || process.platform === 'win32') {
      image = nativeImage.createFromPath(path.join(assetsPath, `tray_${this.trayColor}.png`));
      this.trayIcon = image;
      this.trayIconUnread = nativeImage.createFromPath(path.join(assetsPath, `tray_unread_${this.trayColor}.png`));
    } else {
      image = nativeImage.createFromPath(path.join(assetsPath, 'status_bar.png'));
    }
    image.setTemplateImage(true);

    tray = new Tray(image);
    this.tray=tray;
    this.tray.setToolTip(Common.ELECTRONIC_WECHAT);

    ipcMain.on('refreshIcon', () => this.refreshIcon());

    if (process.platform === 'linux' || process.platform === 'win32') {
      const contextMenu = Menu.buildFromTemplate([
        { label: Common.TRAY.show, icon:path.join(__dirname, `../../../assets/tray_icon.png`), click: () => this.hideSplashAndShowWeChat() },
        { label: Common.TRAY.pref, icon:path.join(__dirname, `../../../assets/tray_settings_${this.trayColor}.png`), click: () => this.showSettings()},
        { label: Common.TRAY.exit, icon:path.join(__dirname, `../../../assets/tray_exit_${this.trayColor}.png`), click: () => app.exit(0) },
      ]);
      this.tray.setContextMenu(contextMenu);
    }
    this.tray.on('click', () => this.hideSplashAndShowWeChat());
  }

  setTitle(title) {
    this.tray.setTitle(title);
  }

  hideSplashAndShowWeChat() {
    if (this.splashWindow.isShown) return;
    this.wechatWindow.show();
  }
  showSettings() {
    this.settingsWindow.show()
  }
  refreshIcon() {
    this.trayColor = AppConfig.readSettings('tray-color');
    this.trayIcon = nativeImage.createFromPath(path.join(assetsPath, `tray_${this.trayColor}.png`));
    this.trayIconUnread = nativeImage.createFromPath(path.join(assetsPath, `tray_unread_${this.trayColor}.png`));
    if (this.lastUnreadStat === 0) {
      this.tray.setImage(this.trayIcon);
    } else {
      this.tray.setImage(this.trayIconUnread);
    }
    const contextMenu = Menu.buildFromTemplate([
      { label: Common.TRAY.show, icon:path.join(__dirname, `../../../assets/tray_icon.png`), click: () => this.hideSplashAndShowWeChat() },
      { label: Common.TRAY.pref, icon:path.join(__dirname, `../../../assets/tray_settings_${this.trayColor}.png`), click: () => this.showSettings()},
      { label: Common.TRAY.exit, icon:path.join(__dirname, `../../../assets/tray_exit_${this.trayColor}.png`), click: () => app.exit(0) },
    ]);
    this.tray.setContextMenu(contextMenu);
  }

  setUnreadStat(stat) {
    if (stat === this.lastUnreadStat) return;
    this.lastUnreadStat = stat;
    if (stat === 0) {
      this.tray.setImage(this.trayIcon);
    } else {
      this.tray.setImage(this.trayIconUnread);
    }
  }
}

module.exports = AppTray;
