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
    // this.lastUser = null
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


          $rootScope.$on('root:notification:click', () => {
            if(AppConfig.readSettings('click-notification') === 'on'){
              ipcRenderer.send('click-notification');
            }
          });


          ipcRenderer.send('wx-rendered', MMCgi.isLogin);

          $rootScope.$on('newLoginPage', () => {
            ipcRenderer.send('user-logged', '');
          });

          if(AppConfig.readSettings('history') === 'on'){
            $rootScope.$on("message:add:success", function(e, originMsg){
              self.ChatHistorys.saveHistory({type:'add',originMsg});
            });
            $rootScope.$on("root:msgSend:success", function(e, originMsg){
              self.ChatHistorys.saveHistory({type:'loaclsend',originMsg});
            });
          }

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
      if(AppConfig.readSettings('history') === 'on'){
        this.ChatHistorys = new ChatHistorys();
        this.ChatHistorys.init()
      }
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
          if(/&lt;msg&gt;&lt;emoji fromusername/.test(msg.Content)){
            //非商店表情
            // Injector.lock(msg, 'MMDigest', '[Emoticon]');
            // Injector.lock(msg, 'MsgType', constants.MSGTYPE_EMOTICON);
            if(msg.ImgHeight >= Common.EMOJI_MAXIUM_SIZE){
              Injector.lock(msg, 'MMImgStyle', { height: `${Common.EMOJI_MAXIUM_SIZE}px`, width: 'auto' });
            } else if(msg.ImgWidth >= Common.EMOJI_MAXIUM_SIZE){
              Injector.lock(msg, 'MMImgStyle', { height: 'auto', width: `${Common.EMOJI_MAXIUM_SIZE}px` });
            } else{
              Injector.lock(msg, 'MMImgStyle', { height: msg.ImgHeight, width: 'auto' });
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
              if(window.getSelection().type === 'Range'){
                clipboard.writeText(event.target.innerText.substr(Math.min(window.getSelection().baseOffset,window.getSelection().focusOffset),Math.abs(window.getSelection().baseOffset - window.getSelection().focusOffset)))
              } else {
                clipboard.writeText(event.target.innerText)
              }
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
            $video.setAttribute("controls","controls")
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
      if (AppConfig.readSettings('select-notification-body') === 'on') {
        let option = AppConfig.readSettings('select-notification-body-ex')
        let isTeam = /username=@@/.test(opt.icon)
        let info = opt.body.match(/^(.*?):(.*?)$/)
        if(!option.includes('head')){
          opt.icon = 'data:image/png;base64,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'
        }
        if(!option.includes('teamName') && isTeam){
          title = Common.TEAM_MESSAGE
        }
        if(!option.includes('name')){
          if(isTeam){
            info[1] = ''
          }else{
            title = Common.WECHAT_MESSAGE
          }
        }
        if(!option.includes('body')){//隐藏body
          if(isTeam){
            info[2] = ''
          }else{
            opt.body = ''
          }
        }
        if(isTeam){
          opt.body = ''
          if(info[1]){
            opt.body = info[1] + ':'
          }
          if(info[2]){
            opt.body += info[2]
          }else{
            opt.body += Common.RECEIVED_TEAM_MESSAGE
          }
        }
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
    webFrame.setZoomFactor(AppConfig.readSettings('zoom')?AppConfig.readSettings('zoom'):1.0)
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

    ipcRenderer.on('clearHistory', (e,css) => {
      this.ChatHistorys.clearHistory()
    });
  }
}

new Injector().init();
