/**
 * Created by kooritea on 26/6/18.
 */
'use strict';
const { ipcRenderer } = require('electron');
var easyIDB = require('../lib/easyIDB.js')

class ChatHistorys{

  init(){
    this.initIndexDB()
    this.initEvent()
  }

  async initIndexDB(){
    let self = this
    if (!angular.element('.header').scope().account) {
      setTimeout(()=>{
        this.initIndexDB()
      }, 1000);
      return
    }
    this.selfUserName = angular.element('.header').scope().account.UserName
    this.DBName = 'Uin'+angular.element('.header').scope().account.Uin
    this.myIDB = await easyIDB({name:this.DBName,ver:1},[
      {
        name:'history',
        indexs:[
          {
            name:'PYQuanPin',
            unique:false
          },
          {
            name:'RemarkPYQuanPin',
            unique:false
          },
          {
            name:'NickName',
            unique:false
          }
        ],
        option:{
          keyPath:'id',//主键,默认 'id'
          autoIncrement:true//是否自增,默认 true
        }
      }
    ])
    angular.element('#chatArea').scope().$watch('currentUser',this.restoreChatContent.bind(this));
    this.initData()
  }

  initData(){
    //把所有历史信息读取到内存中
    this.AllChatHistorys={}
    window.AllChatHistorys = this.AllChatHistorys
    this.myIDB.get('history').then((data)=>{
      for(let item of data){
        if(!this.AllChatHistorys[item.NickName]){
          this.AllChatHistorys[item.NickName]={
            chats:[],
            get:0//已读取到聊天对象的条数
          }
        }
        this.AllChatHistorys[item.NickName].chats.push(item)
      }
      this.readAllChats=true
    })
  }

  initEvent(){
    let target = angular.element('#chatArea .scroll-wrapper>.scroll-content')[0]
    target.addEventListener('scroll',()=>{
      if(target.scrollTop===0){
        this.getHistory(angular.element('#chatArea').scope().currentUser)
      }
    })
  }

  saveHistory(msg){//保存聊天记录到indexDB
    if(!msg.Content){
      return
    }
    try{
      this.myIDB.DB.tmp=false
      if(!this.myIDB.DB.name){
        throw 'error'
      }
    }
    catch(e){
      console.log(e)
      console.log('indexDB未初始化完成，1s后重试(1)')
      setTimeout(()=>{
        this.saveHistory(msg)
      },1000)
      return
    }
    setTimeout(()=>{
      msg.MMStatus=2
      if(msg.sendByLocal){
        msg.NickName = msg.FromUserName==='filehelper'?'filehelper':window._contacts[msg.ToUserName].NickName
        msg.PYQuanPin = msg.FromUserName==='filehelper'?'filehelper':window._contacts[msg.ToUserName].PYQuanPin
        msg.RemarkPYQuanPin = msg.FromUserName==='filehelper'?'filehelper':window._contacts[msg.ToUserName].RemarkPYQuanPin
      }
      else{
        msg.NickName = msg.ToUserName==='filehelper'?'filehelper':window._contacts[msg.FromUserName].NickName
        msg.PYQuanPin = msg.ToUserName==='filehelper'?'filehelper':window._contacts[msg.FromUserName].PYQuanPin
        msg.RemarkPYQuanPin = msg.ToUserName==='filehelper'?'filehelper':window._contacts[msg.FromUserName].RemarkPYQuanPin
      }

      if(/@@/.test(msg.FromUserName)){
        //群聊需要记录发送者的信息
        //在群的memberlist里查找
        let info = msg.Content.match(/@(.*)?:<br\/>(.*)?/)
        let members= window._contacts[msg.FromUserName].MemberList
        for(let member of members){
          if(member.UserName === '@'+info[1]){
            msg.MMActualSenderNickName = member.NickName
            msg.MMActualSenderPYQuanPin = member.PYQuanPin
            msg.MMActualSenderRemarkPYQuanPin = member.RemarkPYQuanPin
            break
          }
        }
      }
      if(msg.$$hashKey){
        delete msg.$$hashKey
      }
      this.myIDB.push('history',msg)
    })
  }

  restoreChatContent(user) {
    const scope = angular.element('#chatArea').scope();
    if (!scope.chatContent || scope.chatContent.length === 0) {
      this.getHistory(user)
    }
  }

  getHistory(user){
    try{
      const scope = angular.element('#chatArea').scope();
      if(!this.readAllChats){
        setTimeout(()=>{
          this.restoreChatContent(user)
        },500)
        return
      }
      if(!user){
        return
      }
      let his
      if(user === 'filehelper'){
        if(!this.AllChatHistorys.filehelper){
          return
        }
        his = this.AllChatHistorys.filehelper.chats
      }
      else{
        if(!this.AllChatHistorys[window._contacts[user].NickName]){
          //没有聊天记录自然AllChatHistorys里没有对应的键
          return
        }
        his = this.AllChatHistorys[window._contacts[user].NickName].chats
      }
      let start = his.length - this.AllChatHistorys[window._contacts[user].NickName].get - 1
      let end = start-10>=0?start-10:0;
      console.log(start)
      for (let i=start;i>=end;i--) {
        if(his[i].MsgType === 10000){
          //撤回消息的提示
          //暂时没找到复原方法
          continue
        }
        if(/@@/.test(user)){
          //群聊
          //根据NickName在群成员中查找MMActualSender
          for(let member of window._contacts[user].MemberList){
            if(member.NickName === his[i].MMActualSenderNickName){
              his[i].MMActualSender = member.UserName
              break
            }
          }
          his[i].MMPeerUserName = user;
          his[i].FromUserName = user
          his[i].ToUserName = this.selfUserName;
        }
        else{
          //私聊
          if(his[i].sendByLocal){
            //自己发的消息
            his[i].MMActualSender=this.selfUserName
            his[i].FromUserName = this.selfUserName
            his[i].ToUserName = user;
          }
          else{
            his[i].MMActualSender=user
            his[i].FromUserName = user
            his[i].ToUserName = this.selfUserName;
          }
          his[i].MMPeerUserName = user;
        }
        his[i].MMUnread = false;
        scope.chatContent.unshift(his[i]);
        this.AllChatHistorys[window._contacts[user].NickName].get++
      }
    }
    catch(e){
      console.error(e)
      console.error(user)
    }
  }

  // getHistory(user){//PYQuanPin,RemarkPYQuanPin
  //   try{
  //     if(!user){
  //       return
  //     }
  //     this.myIDB.DB.tmp=false
  //     if(!this.myIDB.DB.name){
  //       throw 'error'
  //     }
  //   }
  //   catch(e){
  //     console.log(e)
  //     console.log('indexDB未初始化完成，1s后重试(2)')
  //     setTimeout(()=>{
  //       this.getHistory(user)
  //     },1000)
  //     return
  //   }
  //   let NickName = user==='filehelper'?'filehelper':window._contacts[user].NickName
  //   let PYQuanPin = user==='filehelper'?'filehelper':window._contacts[user].PYQuanPin
  //   let RemarkPYQuanPin = user==='filehelper'?'filehelper':window._contacts[user].RemarkPYQuanPin
  //   if(/@@/.test(user)){
  //     //群聊优先匹配NickName
  //     if(NickName){
  //       return this.myIDB.get('history','NickName',NickName)
  //     }else if(PYQuanPin){
  //       return this.myIDB.get('history','PYQuanPin',PYQuanPin)
  //     }else if(RemarkPYQuanPin){
  //       return this.myIDB.get('history','RemarkPYQuanPin',RemarkPYQuanPin)
  //     }
  //   }
  //   else{
  //     if(RemarkPYQuanPin){
  //       return this.myIDB.get('history','RemarkPYQuanPin',RemarkPYQuanPin)
  //     }
  //     else if(PYQuanPin){
  //       return this.myIDB.get('history','PYQuanPin',PYQuanPin)
  //     }
  //     else if(NickName){
  //       return this.myIDB.get('history','NickName',NickName)
  //     }
  //   }
  // }
}
module.exports = ChatHistorys;
