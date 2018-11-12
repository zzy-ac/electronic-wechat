'use strict';

const { ipcRenderer, webFrame ,clipboard} = require('electron');
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
    this.initNotification();
    this.initInjectBundle();
    this.initAngularInjection();
    this.initSetZoom();
    this.lastUser = null
    this.initIPC();
    //webFrame.setZoomLevelLimits(1, 1);
    //不知道为什么webFrame.setZoomLevelLimits未定义
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

          if(AppConfig.readSettings('click-notification') === 'on'){
            $rootScope.$on('root:notification:click', () => {
              ipcRenderer.send('click-notification');
            });
          }

          ipcRenderer.send('wx-rendered', MMCgi.isLogin);

          $rootScope.$on('newLoginPage', () => {
            ipcRenderer.send('user-logged', '');
          });
          $rootScope.$on("message:add:success", function(e, originMsg){
            self.ChatHistorys.saveHistory({type:'add',originMsg});
          });
          $rootScope.$on("root:msgSend:success", function(e, originMsg){
            self.ChatHistorys.saveHistory({type:'loaclsend',originMsg});
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
      this.initcopy()
      this.initvideo()
      this.initSeteditArea();
      // this.initdrag() // 拖动文件聚焦对话窗
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
        return this.checkEmojiContent(value, constants);
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
          if(/&lt;msg&gt;&lt;emoji fromusername =/.test(msg.Content)){
            //非商店表情
            // Injector.lock(msg, 'MMDigest', '[Emoticon]');
            // Injector.lock(msg, 'MsgType', constants.MSGTYPE_EMOTICON);
            if (msg.ImgHeight >= Common.EMOJI_MAXIUM_SIZE) {
              Injector.lock(msg, 'MMImgStyle', { height: `${Common.EMOJI_MAXIUM_SIZE}px`, width: 'initial' });
            } else if (msg.ImgWidth >= Common.EMOJI_MAXIUM_SIZE) {
              Injector.lock(msg, 'MMImgStyle', { width: `${Common.EMOJI_MAXIUM_SIZE}px`, height: 'initial' });
            }
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

  initcopy(){
    angular.element('#contextMenu').scope().$on('app:contextMenu:show', (ngevent,event) => {
      setTimeout(()=>{//进入下一个事件循环
        let menuList = angular.element('.dropdown_menu>li')
        if (menuList.length === 0 ) return
        for(let i=0;i < menuList.length;i++){
          if(angular.element('.dropdown_menu>li:eq('+i+')').scope().item.copyCallBack){
            angular.element('.dropdown_menu>li:eq('+i+')')[0].onclick=function(){
              clipboard.writeText(event.target.innerText)
            }
            break
          }
        }
      })
    });
  }

  initvideo(){
    angular.element('#contextMenu').scope().$on('ngDialog.opened', (ngevent,event) => {
      setTimeout(()=>{//进入下一个事件循环
        let $video
        let setEvent = function(){
          if(event[0].children[1].children[0].children.length){
            $video = event[0].children[1].children[0].children[1]
            if(!$video) return
            $video.onclick = function(){
              if($video.paused){
                $video.play()
              }
              else{
                $video.pause()
              }
            }
          }
          else{
            setTimeout(()=>{
              setEvent()
            },100)
          }
        }
        setEvent()
      })
    });
  }

  initdrag(){
    angular.element('#J_CatchDrop')[0].addEventListener('dragenter', (event) => {
      event.preventDefault()
      if (this.lastUser !== '2233' && angular.element('#chatArea').scope().currentUser === '2233') {
        angular.element('.chat_list').scope().itemClick(this.lastUser);
        this.lastUser = ''
      }
    })
  }

  initNotification(){
    const oldNotification = window.Notification
    const newNotification = function(title,opt){
      if (AppConfig.readSettings('hide-notification-body') === 'on') {
        if(/username=@@/.test(opt.icon)){
          // 群聊
          let info = opt.body.match(/^(.*?):(.*?)$/)
          // opt.body = info[1] + ':' + Common.HIDE_NOTIFICATION_BODY
          title = title + ' > ' + info[1]
        }
        else {
          // opt.body = Common.HIDE_NOTIFICATION_BODY
        }
        opt.body = ''
      }
      return new oldNotification(title,opt)
    }
    Object.defineProperty(newNotification, 'permission', {
        get: () => {
            return oldNotification.permission;
        }
    })
    window.Notification = newNotification
  }

  initSetZoom(){
    webFrame.setZoomFactor(AppConfig.readSettings('zoom')?AppConfig.readSettings('zoom'):1)
    document.addEventListener('mousewheel',function(e){
      if(e.ctrlKey){
        let zoom = webFrame.getZoomFactor()
        if(e.deltaY > 0){
          webFrame.setZoomFactor(zoom - 0.1)
          AppConfig.saveSettings('zoom',zoom - 0.1)
        } else {
          webFrame.setZoomFactor(zoom + 0.1)
          AppConfig.saveSettings('zoom',zoom + 0.1)
        }
      }
    })
  }

  initIPC() {
    //clear currentUser to receive reddot of new messages from the current chat user
    ipcRenderer.on('hide-wechat-window', () => {
      this.lastUser = angular.element('#chatArea').scope().currentUser;
      if(this.lastUser && this.lastUser !== '2233'){
        try{
          angular.element('.chat_list').scope().itemClick('2233')
          angular.element('.chat_list').scope().itemClick("");
        }
        catch(e){
          //蜜汁bug 不先点一下别的就会报错
        }
      }
    });
    // recover to the last chat user
    ipcRenderer.on('show-wechat-window', () => {
      if (this.lastUser && this.lastUser !== '2233' && angular.element('#chatArea').scope().currentUser === '2233') {
        angular.element('.chat_list').scope().itemClick(this.lastUser);
        this.lastUser = ''
      }
    });

    ipcRenderer.on('loginout', () => {
      angular.element('.opt').scope().toggleSystemMenu()
      setTimeout(()=>{
        angular.element('.dropdown_menu').scope().loginout()
      })
    });

    ipcRenderer.on('setCss', (e,css) => {
      if(!document.getElementById('userCss')){
        let style = document.createElement("style")
        style.id = 'userCss'
        document.head.appendChild(style)
      }
      document.getElementById('userCss').innerHTML = css
    });

    ipcRenderer.on('refreshZoom', (e,css) => {
      webFrame.setZoomFactor(1)
    });
  }
}

new Injector().init();
