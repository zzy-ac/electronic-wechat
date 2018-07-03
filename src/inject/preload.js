'use strict';

const { ipcRenderer, webFrame } = require('electron');
const MenuHandler = require('../handlers/menu');
const ShareMenu = require('./share_menu');
const MentionMenu = require('./mention_menu');
const MiniFrame = require('./mini_frame');
const ChatHistorys = require('./chat_historys');
const BadgeCount = require('./badge_count');
const Common = require('../common');
// const EmojiParser = require('./emoji_parser');
// const emojione = require('emojione');

const AppConfig = require('../configuration');

class Injector {
  init() {
    //Common.DEBUG_MODE
    // if (true) {
    //   let wcl = window.console.log
    //   window.console.log = (content)=>{
    //     ipcRenderer.send('console', content);
    //     wcl(content)
    //   }
    // }
    this.initInjectBundle();
    this.initAngularInjection();
    this.lastUser = null
    this.initIPC();
    //webFrame.setZoomLevelLimits(1, 1);
    //不知道为什么webFrame.setZoomLevelLimits未定义
    //if(AppConfig.readSettings('click-notification') === 'on'){
        // this.initNotification()
    //}
    // 重大bug！！(重写原生Notification会导致掉消息)
    //因为无法监听H5的Notification的点击事件，改成使用系统级别的Notification
    new MenuHandler().create();
  }

  initAngularInjection() {
    const self = this;
    const angular = window.angular = {};
    let angularBootstrapReal;
    Object.defineProperty(angular, 'bootstrap', {
      get: () => angularBootstrapReal ? function (element, moduleNames) {
        const moduleName = 'webwxApp';
        if (moduleNames.indexOf(moduleName) < 0) return;
        let constants = null;
        angular.injector(['ng', 'Services']).invoke(['confFactory', (confFactory) => (constants = confFactory)]);
        angular.module(moduleName).config(['$httpProvider', ($httpProvider) => {
          $httpProvider.defaults.transformResponse.push((value) => {
            return self.transformResponse(value, constants);
          });
        },
        ]).run(['$rootScope', ($rootScope) => {
          ipcRenderer.send('wx-rendered', MMCgi.isLogin);

          $rootScope.$on('newLoginPage', () => {
            ipcRenderer.send('user-logged', '');
          });
          $rootScope.$on("message:add:success", function(e, msg){
            self.ChatHistorys.saveHistory(msg);
          });
          $rootScope.shareMenu = ShareMenu.inject;
          $rootScope.mentionMenu = MentionMenu.inject;
        }]);
        return angularBootstrapReal.apply(angular, arguments);
      } : angularBootstrapReal,
      set: (real) => (angularBootstrapReal = real),
    });
  }

  initInjectBundle() {
    const initModules = () => {
      if (!window.$) {
        return setTimeout(initModules, 1000);
      }
      if(AppConfig.readSettings('frame') === 'on'){
        MiniFrame.init();
      }
      this.ChatHistorys = new ChatHistorys();
      this.ChatHistorys.init()
      this.initSeteditArea();
      MentionMenu.init();
      BadgeCount.init();
    };

    window.onload = () => {
      initModules();
      window.addEventListener('online', () => {
        ipcRenderer.send('reload', true);
      });
    };
  }

  transformResponse(value, constants) {
    if (!value) return value;

    switch (typeof value) {
      case 'object':
        /* Inject emoji stickers and prevent recalling. */
        //return this.checkEmojiContent(value, constants);
        //这个api已经被关闭，无法获取表情商店的表情了
        return value
      case 'string':
        /* Inject share sites to menu. */
        return this.checkTemplateContent(value);
    }
    return value;
  }

  static lock(object, key, value) {
    return Object.defineProperty(object, key, {
      get: () => value,
      set: () => {},
    });
  }

  checkEmojiContent(value, constants) {
    if (!(value.AddMsgList instanceof Array)) return value;
    value.AddMsgList.forEach((msg) => {
      switch (msg.MsgType) {
        // case constants.MSGTYPE_TEXT:
        //   msg.Content = EmojiParser.emojiToImage(msg.Content);
        //   break;
        case constants.MSGTYPE_EMOTICON:
          Injector.lock(msg, 'MMDigest', '[Emoticon]');
          Injector.lock(msg, 'MsgType', constants.MSGTYPE_EMOTICON);
          if (msg.ImgHeight >= Common.EMOJI_MAXIUM_SIZE) {
            Injector.lock(msg, 'MMImgStyle', { height: `${Common.EMOJI_MAXIUM_SIZE}px`, width: 'initial' });
          } else if (msg.ImgWidth >= Common.EMOJI_MAXIUM_SIZE) {
            Injector.lock(msg, 'MMImgStyle', { width: `${Common.EMOJI_MAXIUM_SIZE}px`, height: 'initial' });
          }
          break;
        case constants.MSGTYPE_RECALLED:
          if (AppConfig.readSettings('prevent-recall') === 'on') {
            try{
              let name = `${msg.Content.match(/\!\[CDATA\["(.*)?"(.*?)]]/)[1]}`
              Injector.lock(msg, 'MsgType', constants.MSGTYPE_SYS);
              Injector.lock(msg, 'MMActualContent', Common.MESSAGE_PREVENT_RECALL(name));
              Injector.lock(msg, 'MMDigest', Common.MESSAGE_PREVENT_RECALL(name));
            }
            catch(e){
              Injector.lock(msg, 'MsgType', constants.MSGTYPE_SYS);
              Injector.lock(msg, 'MMActualContent', msg.Content.match(/\!\[CDATA\[(.*)?]\]/)[1]);
              //Injector.lock(msg, 'MMDigest', msg.Content.match(/\!\[CDATA\[(.*)?]\]/)[1]);
            }
          }
          break;
      }
    });
    return value;
  }

  checkTemplateContent(value) {
    const optionMenuReg = /optionMenu\(\);/;
    const messageBoxKeydownReg = /editAreaKeydown\(\$event\)/;
    if (optionMenuReg.test(value)) {
      value = value.replace(optionMenuReg, 'optionMenu();shareMenu();');
    } else if (messageBoxKeydownReg.test(value)) {
      value = value.replace(messageBoxKeydownReg, 'editAreaKeydown($event);mentionMenu($event);');
    }
    return value;
  }

  setNotificationCallback(callback){
    const OldNotify = window.Notification;
    const newNotify = function(title,opt){
      callback(title, opt);
      return false
      //return OldNotify(title, opt)
    }
    newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
    Object.defineProperty(newNotify, 'permission', {
        get: () => {
            return OldNotify.permission;
        }
    });
    window.Notification = newNotify;
  }

  initNotification(){
    this.setNotificationCallback(function(title,opt){
      let ename = 'msg'+ new Date().getTime()
      ipcRenderer.on(ename,function(){
        //渲染层捕捉到通知的点击事件
        document.querySelectorAll('.tab_item')[0].children[0].click()
        //主界面移动到聊天页
        for(let i=0;i<document.querySelectorAll('.nickname_text').length;i++){
          //从上到下遍历聊天列表寻找发送者
          let item = document.querySelectorAll('.nickname_text')[i]
          if(item.innerHTML.replace(/<img(.*?)>/,'') === title){
            item.parentNode.parentNode.parentNode.click()
            break;
          }
        }
        ipcRenderer.removeAllListeners(ename)
      })
      ipcRenderer.send('new-message', {title,opt,ename});
    })
  }


  initSeteditArea(){//初始化缩放输入文本域事件
    let startY;
    let startBox_ftY
    let startChat_bd
    let mousedown=false
    let $chatArea = angular.element('#chatArea')[0]
    angular.element('#chatArea>.box_ft')[0].style.height=180+parseInt(AppConfig.readSettings('chat-area-offset-y'))+'px'//赋初值方便计算
    angular.element('#chatArea>.chat_bd')[0].style.marginBottom = parseInt(AppConfig.readSettings('chat-area-offset-y'))+'px'
    $chatArea.addEventListener('mousedown',(event)=>{
      if(event.target.id === 'tool_bar' ){
        startY = event.clientY;
        startBox_ftY = parseInt(angular.element('#chatArea>.box_ft')[0].style.height)
        startChat_bd = parseInt(angular.element('#chatArea>.chat_bd')[0].style.marginBottom)
        mousedown=true
      }
    })
    $chatArea.addEventListener('mousemove',(event)=>{
      if(mousedown){
        let offsetY = startY - event.clientY
        angular.element('#chatArea>.chat_bd')[0].style.marginBottom=startChat_bd+offsetY+'px'        //聊天区
        angular.element('#chatArea>.box_ft')[0].style.height=startBox_ftY+offsetY+'px'   //输入域
      }
    })
    $chatArea.addEventListener('mouseup',(event)=>{
      if(mousedown){
        mousedown=false
        AppConfig.saveSettings('chat-area-offset-y',parseInt(angular.element('#chatArea>.chat_bd')[0].style.marginBottom))
      }
    })
  }

  initIPC() {
    //clear currentUser to receive reddot of new messages from the current chat user
    ipcRenderer.on('hide-wechat-window', () => {
      this.lastUser = angular.element('#chatArea').scope().currentUser;
      angular.element('.chat_list').scope().itemClick("");
    });
    // recover to the last chat user
    ipcRenderer.on('show-wechat-window', () => {
      if (this.lastUser != null) {
        angular.element('.chat_list').scope().itemClick(this.lastUser);
      }
    });
  }
}

new Injector().init();
