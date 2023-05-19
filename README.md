# Side 集成开发环境客户端

# 0. 开始工作

使用指令 `npm run bringup && source build/setup.sh` 搭建命令行环境。接下来您就可以使用 **side** 来构建 **side** 了。

## 0.1. 使用场景

当已经具备side服务器时使用一条指令安装side客户端

~~~bash
#bin/bash

export HOST=localhost:5000
curl -s http://${HOST}/api/dl?p=install.sh | bash
~~~