<img src="assets/icon.png" alt="logo" height="120" align="right" />

# Electronic WeChat

[![Gitter](https://badges.gitter.im/geeeeeeeeek/electronic-wechat.svg)](https://gitter.im/geeeeeeeeek/electronic-wechat?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)  [![Build Status](https://travis-ci.org/geeeeeeeeek/electronic-wechat.svg?branch=master)](https://travis-ci.org/geeeeeeeeek/electronic-wechat)  [![Build Status](https://img.shields.io/badge/README-切换语言-yellow.svg)](README_en.md)

**Mac OS X 和 Linux 下更好用的微信客户端. 更多功能, 更少bug. 使用[Electron](https://github.com/atom/electron)构建.**

# 停止维护
> 可能大家都发现了,网页微信正在用肉眼可见的速度砍掉各种功能,越来越多的用户包括我的两个账号也没办法登录网页微信版了,所以也没有动力继续维护了  
> 感谢大家这段时间的支持

其他方案

- [https://github.com/Riceneeder/electronic-wechat](https://github.com/Riceneeder/electronic-wechat)
- [arch用户 com.qq.weixin.deepin](https://aur.archlinux.org/packages/com.qq.weixin.deepin)


## 该分支针对使用Dock的ubuntu进行改造

### 测试环境 ubuntu 18.04 gnome 3.28.2

#### 改造记录如下

> 1、更新所有依赖到最新版本(180511),其中Electronic@2.0.0

> ~~2、主窗体关闭按钮改为直接退出程序，不再是隐藏窗体~~

> 3、~~取消多实例检查~~，托管图标能正常使用了(偶然不能出来，感觉是Gnome的问题，关掉再开就好了。。),如果依然不行参考[#8](https://github.com/kooritea/electronic-wechat/issues/8)和[#12](https://github.com/kooritea/electronic-wechat/issues/12)

> 4、修复菜单栏不能正常显示的BUG(通过ALT唤出)(无边框模式是没有菜单栏的)

> ~~5、删除偏好设置中是否使用多实例的设置选项(多实例可以通过右键dock图标新建窗口实现)~~

> ~~6、检查更新选项不再调用更新脚本，而是打开浏览器到Github发布页~~

> 7、添加全局快捷键CommandOrControl+Alt+W 显示微信

> 8、点击消息通知会打开微信(可以到设置页面关闭此功能)

> 9、修复设置页面不知为什么addEventListener不生效导致设置页形同虚设的bug

> 10、通过点击桌面的通知进入微信，现在可以直接自动打开对话框啦！

> 11、优化多语言的实现方式，系统托盘的菜单汉化以及添加偏好的选项

> ~~12、修复了当对方昵称或备注中有emoji时不能定位到该聊天框的bug~~(点击打开的实现方式已改变，这已经是不需要的了)

> 13、炫酷无边框，鼠标移到左上角显示菜单按钮(审美设计有点菜，等一个设计师)，设置页可以选择是否无边框(感谢[@waffiet-张](http://www.iconfont.cn/user/detail?spm=a313x.7781069.0.d214f71f6&uid=4435557)和[@竹尔](http://www.iconfont.cn/user/detail?spm=a313x.7781069.0.d214f71f6&uid=51853)的漂亮图标！！)

> 14、托盘菜单栏加上漂亮的icon

--- v2.0.5 ---

> 15、更改播放视频的背景色，解决打开视频后关闭按钮看不见的问题

> 16、加快了5倍左上角菜单的出现速度(0.5s → 0.1s)

--- v2.0.6 ---

> 17、可在偏好设置中选择关闭主窗口是否退出程序

> 18、偏好设置中设置是否在程序启动的时候检查是否有可用更新

--- v2.0.7 ---

> 19、退出图标换回黑白色,状态栏菜单的图标也能根据选择的主题更换颜色了

> 20、支持记录窗体大小

--- v2.0.8 ---

> 21、阻止消息撤回功能能够看到是谁撤回了消息

--- v2.0.9 ---

> 22、修复当主窗体处于显示状态时使用快捷键ctrl+alt+w会导致聊天窗口切换的问题

--- v2.1.0 ---

> 23、修复无法切换主界面语言的问题

> 24、隐藏下载pc版的提示

--- v2.1.1 ---

> 25、修复无法点击登录和切换账号的问题

--- v2.1.2 ---

> 26、允许设置代理模式

    (1)跟随系统：使用系统的代理设置

    (2)直接连接：无视系统代理直接连接

    (3)设置代理：格式[<proxy-scheme>://]<proxy-host>[:<proxy-port>]

      理论支持协议：socks5(测试通过)、socks4(未测试)、http(未测试)

      例如:socks5://127.0.0.1:1080

    可能有的桌面环境没有托盘图标又卡在初始化界面(卡在初始化界面一般都是网络不通)无法打开设置界面

    可以直接修改~/.ew.json

    proxy:

      on:跟随系统(默认);

      off:直接连接;

      setProxy:设置代理地址

    proxy-url:代理地址

--- v2.1.3 ---

>27、可自由改变文字输入区域的大小

--- v2.1.4 ---

>28、历史消息记录,主要参考了 @iamcc 的[思路](https://github.com/geeeeeeeeek/electronic-wechat/pull/159/commits/9abbe6e177d4f02aae6529136e4d48b3ef6a2c36)

>29、艾特的时候显示群名片，PS：这个是暴力艾特，对方并不会收到提醒(手动笑哭)

>30、不再解析表情商店的表情(直接显示文本)，因为微信已经关闭了这个接口了

--- v2.1.5 ---

>31、更换点击通知打开微信的实现方式(这次应该不会缺消息了)

>32、稍微改了一下设置页的样式

>33、优化微信休眠机制(微信被隐藏的时候不会把新消息设为已读)

--- v2.1.6 ---

>34、修复右键复制无效问题 ~~(仅限文字消息，不包括链接)~~ 2.1.9已经可以复制链接了

>35、可以正确地使用是否允许多实例运行

--- v2.1.7 ---

>36、可设置失焦时是否进入挂起状态

--- v2.1.8 ---

>37、修复无法刷新二维码的问题

>38、修复文件助手无法保存记录问题

>39、历史记录显示包括日期的详细时间

--- v2.1.9 ---

>40、electron更新到2.0.8 修复若干bug

>41、修复若干地方报错

>42、修复链接无法复制问题

>43、修复视频无法暂停问题

--- v2.2.0 ---

>44、修复加载全部历史纪录后提示错误问题

>45、优化历史记录获取体验

>46、聚焦时自动切换到最后一次聊天窗口

>47、修复手机上发送的私聊消息保存错误问题

--- v2.2.1 ---

>48、程序退出时自动退出网页版登录

>49、登陆后保持窗体位置

>50、隐藏通知内容（默认关闭）

>51、electron 3.0.6

>52、修复无法下载历史记录中的文件问题

--- v2.3.0 ---

>53、自定义CSS [样例](https://github.com/kooritea/electronic-wechat/blob/master/CSSSAMPLE.md)

>54、支持使用ctrl+滑轮 缩放调整

>55、electron 3.0.8

>56、当有文本被选中时复制会只复制选中的文本

>58、可在设置中清除聊天记录和选择是否保存聊天记录

>59、自由选择在桌面通知上显示的内容

--- v2.3.1 ---

>60、跟随官方更改消息对象结构

>61、electron 4.0.5

<br>
<br>
<br>

#### 已知BUG

> ~~提示更新的弹框不能显示微信图标~~(原来是electron的锅 wechat2.2.1 electron3.0.6 已经没有这个问题)

> 历史消息无法右键

> 在允许多实例的情况下，当打开第二个实例的时候会自动登录前一个账号，需要手动退出(有需要的话最好就先打开两个实例再登录)

<br>
<br>
<br>

#### todo

> 快速艾特

> 临时关闭群通知

> snap

~~虽然想做保留本地聊天记录，可是我不会angular(摊手)，给各位前端丢脸了！~~

虽然做了保存历史记录，可我还不会angular

#### [下载构建好的应用](https://github.com/kooritea/electronic-wechat/releases)

### 创建快捷方式
修改electronic-wechat.desktop中的路径
复制到/usr/share/applications/或者~/.local/share/applications/
即可在应用程序中找到electronic-wechat的图标

或者参考[issues19](https://github.com/kooritea/electronic-wechat/issues/19)


# 以下是原仓库的Readme



**Important:** 如果你希望在自己的电脑上构建 Electronic WeChat，请使用 [production branch](https://github.com/geeeeeeeeek/electronic-wechat/tree/production)，master branch 包含正在开发的部分，并且不能保证是稳定的版本——尽管 production 版本也有bug ：D

![qq20160428-0 2x](https://cloud.githubusercontent.com/assets/7262715/14876747/ff691ade-0d49-11e6-8435-cb1fac91b3c2.png)

## 应用特性 ([更新日志](CHANGELOG.md))

-  **来自网页版微信的更现代的界面和更丰富的功能**
-  **阻止消息撤回**
-  **显示表情贴纸** [[?]](https://github.com/geeeeeeeeek/electronic-wechat/issues/2)
-  公众号文章支持一键分享到微博、QQ 空间、Facebook、Twitter、Evernote 和邮件
-  拖入图片、文件即可发送
-  群聊 @ 提及成员
-  原生应用体验，未读消息小红点、消息通知等数十项优化
-  去除外链重定向，直接打开淘宝等网站
-  没有原生客户端万年不修复的bug

## 如何使用

在下载和运行这个项目之前，你需要在电脑上安装 [Git](https://git-scm.com) 和 [Node.js](https://nodejs.org/en/download/) (来自 [npm](https://www.npmjs.com/))。在命令行中输入:

``` bash
# 下载仓库
git clone https://github.com/geeeeeeeeek/electronic-wechat.git
# 进入仓库
cd electronic-wechat
# 安装依赖, 运行应用
npm install && npm start
```

根据你的平台打包应用:

``` shell
npm run build:osx
npm run build:linux
npm run build:win
```

**提示:** 如果 `npm install` 下载缓慢，你可以使用 [淘宝镜像(cnpm)](http://npm.taobao.org/) 替代 npm 。

**新渠道:** 使用你熟悉的包管理工具安装。请查看 [社区贡献的镜像](https://github.com/geeeeeeeeek/electronic-wechat/wiki/System-Support-Matrix#%E7%A4%BE%E5%8C%BA%E8%B4%A1%E7%8C%AE%E7%9A%84%E5%AE%89%E8%A3%85%E5%8C%85) 。

**新渠道:** homebrew 安装也已支持 (更新至 electronic-wechat v1.2.0)！

```bash
brew cask install electronic-wechat
```

#### [下载开箱即用的稳定版应用](https://github.com/geeeeeeeeek/electronic-wechat/releases)

#### 项目使用 [MIT](LICENSE.md) 许可

*Electronic WeChat* 是这个开源项目发布的产品。网页版微信是其中重要的一部分，但请注意这是一个社区发布的产品，而 *不是* 官方微信团队发布的产品。
