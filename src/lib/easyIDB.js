'use strict'

async function easyIDBMain(name,newIndex){
  return {
    DB:name?(await openDB(name,newIndex)):null,
    openDB,
    showList,
    createObjectStore,
    push,
    get,
    del,
    edit,
    lock:false
  }
}

//列出当前所有store
function showList(){
  return this.DB.objectStoreNames
}

// newIndex:{  // 创建新的objectStore
//   name:"xxx",
//   indexs:[],
//   option:{
//     keyPath:'id',
//     autoIncrement:true
//   }
// }
//创建多个store时需要await
async function createObjectStore(name,newIndex){//默认id为主键并自增
  this.DB.close();
  this.DB = await this.openDB({name:this.DB.name,ver:this.DB.version+1},{name,newIndex})
}

//
function get(storeName,key,value){
  let objectStore = this.DB.transaction(storeName).objectStore(storeName);
  let data = new Array()
  if(key){
    objectStore = objectStore.index(key)
  }
  return new Promise(async function(reslove){
    let isRegExp = value instanceof RegExp
    objectStore.openCursor().onsuccess = function(event){
      let cursor = event.target.result;
      if(cursor){
        if(key){
          if(isRegExp){
            if(value.test(cursor.value[key])){
              data.push(cursor.value)
            }
          }
          else{
            if(cursor.value[key] === value){
              data.push(cursor.value)
            }
          }
        }
        else{
          data.push(cursor.value)
        }
        cursor.continue();
      }
      else{
        reslove(data)
      }
    }
  })
}


//添加数据
//storeName:string
//data:object?array
function push(storeName,data){
  if(Array.isArray(data)){
    for(let obj of data){
      this.DB.transaction(storeName, "readwrite").objectStore(storeName).add(obj);
    }
  }
  else{
    this.DB.transaction(storeName, "readwrite").objectStore(storeName).add(data);
  }
}

//根据索引删除该值的对象
function del(storeName,key,value){
  let transaction = this.DB.transaction(storeName, "readwrite");
  let objectStore = transaction.objectStore(storeName);
  return new Promise(async function(reslove){
    if(key ===  objectStore.keyPath){
        objectStore.delete(parseInt(value));
    }
    else{
      let keypath = objectStore.index(key);
      let request = keypath.openCursor()
      request.onsuccess = function(e){
        let cursor = e.target.result;
        if(cursor){
          if(cursor.value[key] === value){
            objectStore.delete(parseInt(cursor.value[objectStore.keyPath]));
          }
          cursor.continue();
        }
        else{
          reslove()
        }
      }
    }
  })
}

//根据索引编辑一个对象
// storeName:string
// key索引名
// value 索引值
// newObject:{}需要更新的数据
function edit(storeName,key,value,newObject){
  let transaction = this.DB.transaction(storeName, "readwrite");
  let objectStore = transaction.objectStore(storeName);
  let objectStoreRequest
  return new Promise(async function(reslove){
    if(key ===  objectStore.keyPath){
      objectStoreRequest = objectStore.get(parseInt(value));
    }
    else{
      objectStoreRequest = objectStore.index(key).get(value);
    }
    objectStoreRequest.onsuccess = function(){
      let Record = objectStoreRequest.result||{}
      for(let key in newObject){
        Record[key] = newObject[key];
      }
      reslove(objectStore.put(Record))
    }
  })
}


// name有两个传入方式 1:直接传入数据库名字,2:对象{name:'xxx',ver:2}
// newIndexs:[
//   {  // 创建新的objectStore
//      name:"xxx",
//      indexs:[],
//      option:{
//        keyPath:'id',
//        autoIncrement:true
//      }
//    }
// ]
//创建
async function openDB(name,newIndexs){//name有两个传入方式 1:直接传入数据库名字,2:对象{name:'xxx',ver:2}
  return await (new Promise(async function(reslove,reject){
    let indexedDB = window.indexedDB;
    if(typeof(name) === 'string'){
      indexedDB = indexedDB.open(name);
    }else if(typeof(name) === 'object'){
      indexedDB = indexedDB.open(name.name,name.ver);
    }
    indexedDB.onupgradeneeded = function (event) {
      let db = event.target.result
      if(newIndexs){
        try{
          for(let newIndex of newIndexs){
            let objectStore = db.createObjectStore(newIndex.name,{
              keyPath: newIndex.option.keyPath||'id',
              autoIncrement: newIndex.option.autoIncrement || true
            })
            for(let item in newIndex.indexs){
              objectStore.createIndex(newIndex.indexs[item].name, newIndex.indexs[item].name, {
                  unique: newIndex.indexs[item].unique||false
              });
            }
          }
        }
        catch(e){

        }
      }
      setTimeout(function(){
          reslove(db)
      },1000)
    }
    indexedDB.onsuccess = function (event) {
      reslove(event.target.result)
    }
  }))
}

//tank you for async
// AMD / RequireJS
// if (typeof define !== 'undefined' && define.amd) {
//     define([], function () {
//         return easyIDBMain;
//     });
// }
// // Node.js
// else if (typeof module !== 'undefined' && module.exports) {
//     module.exports.default = easyIDBMain;
// }
// // included directly via <script> tag
// else {
//
// }
// export default easyIDBMain
module.exports = easyIDBMain;
