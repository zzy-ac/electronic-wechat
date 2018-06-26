/**
 * Created by kooritea on 26/6/18.
 */
'use strict';
const { ipcRenderer } = require('electron');
var easyIDB = require('../lib/easyIDB.js')

class ChatHistorys{

  init(){
    this.initIndexDB()
  }

  async initIndexDB(){
    //angular.element('.header').scope().account.Uin
    // console.log(angular.element('.header').scope().account.UserName)
    if (!angular.element('.header').scope().account) {
      setTimeout(()=>{
        this.initIndexDB()
      }, 1000);
      return
    }
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
    // angular.element('#chatArea').scope().$watch('chatContent',this.saveSelfChat.bind(this),true);
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
        saveHistory(msg)
      },1000)
      return
    }
    msg.NickName = msg.ToUserName==='filehelper'?'filehelper':window._contacts[msg.FromUserName].NickName
    msg.PYQuanPin = msg.ToUserName==='filehelper'?'filehelper':window._contacts[msg.FromUserName].PYQuanPin
    msg.RemarkPYQuanPin = msg.ToUserName==='filehelper'?'filehelper':window._contacts[msg.FromUserName].RemarkPYQuanPin
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
    setTimeout(()=>{
      this.myIDB.push('history',msg)
    })
  }

  async restoreChatContent(user) {
    const scope = angular.element('#chatArea').scope();
    if (!scope.chatContent || scope.chatContent.length === 0) {
      const his = await this.getHistory(user);
      for (let i in his) {
        if(/@@/.test(user)){
          //群聊
          //根据NickName在群成员中查找MMActualSender
          for(let member of window._contacts[user].MemberList){
            if(member.NickName === his[i].MMActualSenderNickName){
              his[i].MMActualSender = member.UserName
              break
            }
          }
        }
        else{
          //私聊
          his[i].MMActualSender=user
        }
        his[i].MMPeerUserName = user;
        his[i].FromUserName = user
        his[i].MMUnread = false;
        his[i].ToUserName = angular.element('.header').scope().account.UserName;
        scope.chatContent.push(his[i]);
      }
    }
  }

  getHistory(user){//PYQuanPin,RemarkPYQuanPin
    try{
      if(!user){
        return
      }
      this.myIDB.DB.tmp=false
      if(!this.myIDB.DB.name){
        throw 'error'
      }
    }
    catch(e){
      console.log(e)
      console.log('indexDB未初始化完成，1s后重试(2)')
      setTimeout(()=>{
        this.getHistory(user)
      },1000)
      return
    }
    let NickName = user==='filehelper'?'filehelper':window._contacts[user].NickName
    let PYQuanPin = user==='filehelper'?'filehelper':window._contacts[user].PYQuanPin
    let RemarkPYQuanPin = user==='filehelper'?'filehelper':window._contacts[user].RemarkPYQuanPin
    if(/@@/.test(user)){
      //群聊优先匹配NickName
      if(NickName){
        return this.myIDB.get('history','NickName',NickName)
      }else if(PYQuanPin){
        return this.myIDB.get('history','PYQuanPin',PYQuanPin)
      }else if(RemarkPYQuanPin){
        return this.myIDB.get('history','RemarkPYQuanPin',RemarkPYQuanPin)
      }
    }
    else{
      if(RemarkPYQuanPin){
        return this.myIDB.get('history','RemarkPYQuanPin',RemarkPYQuanPin)
      }
      else if(PYQuanPin){
        return this.myIDB.get('history','PYQuanPin',PYQuanPin)
      }
      else if(NickName){
        return this.myIDB.get('history','NickName',NickName)
      }
    }
  }
}
module.exports = ChatHistorys;
