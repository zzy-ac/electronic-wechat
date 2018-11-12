# 自定义CSS的一些例子

自定义的CSS会注入到<head\>的<style\>里面一般来说优先级已经比较高了
如果不生效尝试加!important后缀

```css
.test{
  width:100px;
  width:100px!important;
}
```

### 1、添加聊天背景

```css
.box{
  background-image:url(file:///home/user/Pictures/welcome.png);
  background-size:60%;
  background-position:right;
  background-repeat:no-repeat;
}
```
![img](http://ww2.sinaimg.cn/large/007eZ24Wly1fx54uu32ymj30s80k7ajk)

### 2、改变气泡颜色

```css
.bubble.bubble_default{
  background-color: #97c9eb;
}
.bubble.left:after{
  border-right-color: #97c9eb;
}
.bubble.bubble_primary{
  background-color: #fcd3f3;
}
.bubble.bubble_primary.right:after{
  border-left-color: #fcd3f3;
}
```
![img](http://ww2.sinaimg.cn/large/007eZ24Wgy1fx5klcpdq0j30ug0mmmy2)
