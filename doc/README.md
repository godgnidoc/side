<h1>Side 项目框架使用说明</h1>

Side $_{(Smooth\ Integrated\ Development\ Environment)}$ 平滑集成开发环境，side 被设计用于提供简单的开发环境搭建体验以及平滑的开发环境切换体验。

Side 工具主要面向两类用户：环境搭建人员和应用开发人员。本文档将全面阐述 side 工具的使用方法，用户可以根据自身情况选取片段查阅。

# 0. 目录

- [0. 目录](#0-目录)
- [1. 快速开始](#1-快速开始)
  - [1.1. 安装 side](#11-安装-side)
  - [1.1. 当前项目状态](#11-当前项目状态)
  - [1.3. 搭建环境](#13-搭建环境)
  - [1.4. 编译构建](#14-编译构建)
  - [1.5. 打包](#15-打包)
  - [1.6. 获得帮助](#16-获得帮助)
- [2. side 工具简介](#2-side-工具简介)
  - [2.1. 项目开发流程](#21-项目开发流程)
  - [2.2. 资源分发管理](#22-资源分发管理)
- [3. 搭建项目](#3-搭建项目)
  - [3.1. 清单与目标](#31-清单与目标)
    - [3.1.1. 清单的分类](#311-清单的分类)
    - [3.1.2. 层叠清单信息](#312-层叠清单信息)
    - [3.1.3. 清单结构](#313-清单结构)
    - [3.1.4. 主清单专有字段](#314-主清单专有字段)
    - [3.1.5. 目标清单专有字段](#315-目标清单专有字段)
  - [3.2. 子仓库](#32-子仓库)
  - [3.3. 层叠资源](#33-层叠资源)
  - [3.4. 项目钩子](#34-项目钩子)
  - [3.5. 环境变量](#35-环境变量)
- [4. 打包与分发](#4-打包与分发)
  - [4.1. 包标识](#41-包标识)
  - [4.2. 包结构](#42-包结构)
  - [4.3. 打包](#43-打包)
  - [4.4. 分发](#44-分发)
  - [3.7. 部署](#37-部署)
- [5. 参考](#5-参考)
  - [5.1. 设置参考](#51-设置参考)
    - [5.1.1. 全局设置](#511-全局设置)
      - [5.1.1.1. offline](#5111-offline)
      - [5.1.1.2. dist](#5112-dist)
    - [5.1.2. 本地设置](#512-本地设置)
      - [5.1.2.1. modules](#5121-modules)
  - [5.2. 变量参考](#52-变量参考)
    - [5.2.1. 常驻变量](#521-常驻变量)
    - [5.2.2. 项目变量](#522-项目变量)
    - [5.2.3. dist 变量](#523-dist-变量)
    - [5.2.4. 开关变量](#524-开关变量)
  - [5.3. 路径参考](#53-路径参考)
    - [5.3.1. Side 家路径](#531-side-家路径)
    - [5.3.2. Side 项目路径](#532-side-项目路径)
      - [5.3.2.1. 项目元信息路径](#5321-项目元信息路径)
      - [5.3.2.2. 项目系统根路径](#5322-项目系统根路径)
      - [5.3.2.3. 项目资产路径](#5323-项目资产路径)
    - [5.3.3. side 系统根路径](#533-side-系统根路径)
    - [5.3.4. 通用查找路径](#534-通用查找路径)
      - [5.3.4.1. NODE\_PATH](#5341-node_path)
      - [5.3.4.2. LD\_LIBRARY\_PATH](#5342-ld_library_path)
      - [5.3.4.3. PATH](#5343-path)

# 1. 快速开始

## 1.1. 安装 side

从0安装side需要两个步骤：

1. 设置分发服务器地址，安装side的步骤以及安装后的side将与此服务器沟通
2. 获取并执行自动安装脚本
    
```bash
#!/bin/bash

export HOST=IP:PORT
curl -s http://${HOST}/api/dl?p=install.sh | bash
```

若安装成功，终端将打印如下字样：

```
Side installed successfully, please restart your terminal.
Enjoy!
```

> side 工具安装后立即可以使用，但自动命令行提示符需要重启终端才能显示。

## 1.1. 当前项目状态

side 向 `~/.bashrc` 注入了一些环境修改语句，这使得 side 可以在 bash 即将打印命令行提示符之前检查当前项目的状态并附加文本描述。

若当前路径不在 side 项目中，则不显示任何额外的提示文本。

项目状态信息的格式：` 项目名 : 当前目标 : 项目状态 `

## 1.3. 搭建环境

在 side 项目路径下任意位置执行如下指令即可面向指定的**目标**搭建环境：

```bash
#!/bin/bash

side setup 目标名
```

选定**目标**意味着选择了编译项目使用的SDK、开放或关闭的功能集合以及其它编译发布前可以选择的设定项。

目标的详细情况被记录于目标配置文件，由环境搭建人员负责编写。Side 会根据目标信息自动获取项目依赖的工具、库或源码子仓库，并执行环境搭建人员指定的钩子脚本。

若环境搭建成功，项目状态将被改写为 `ready`

## 1.4. 编译构建

当项目处于 `ready` 状态时，可以执行如下指令以构建项目：

```bash
#!/bin/bash

side build ...
```

build 指令可以携带参数，具体语义由环境搭建人员指定的钩子脚本决定。

若编译流程顺利结束，且 build 指令没有携带参数，则项目状态将被改写为 `built`

## 1.5. 打包

当项目处于 `built` 状态时，可以执行如下指令以打包项目编译产物：

```bash
#!/bin/bash

side package
```

package 指令会执行环境搭建人员指定的钩子脚本，若打包成功，则项目状态被改写为 `packed`

## 1.6. 获得帮助

指令 `side help` 可以展示 side 工具的帮助页面。`help` 指令可以携带参数，展示更详细的功能或选项介绍。譬如 `side help shell` 可以打印 `side shell` 指令的帮助页面。

指令 `side doc` 可以唤出文档菜单，通过文档菜单可以打开side内置文档阅览。

# 2. side 工具简介

Side 工具是一组由 NodeJS 驱动的 JavaScript 脚本，提供的功能主要分为**项目开发流程**和**资源分发管理**两个方面。

## 2.1. 项目开发流程

Side 为项目定义了状态和用于改变项目状态的指令，以此构建了项目开发流程的规范化模型。

Side 项目总是从**起草**状态开始，顺次经历**就绪**、**已构建**和**已打包**状态。Side 项目不能跳过中间状态，但是可以从任何状态回到**起草**状态。用户可以编写特定的脚本，Side 会在状态转换过程中调用它们，这些脚本被成为钩子脚本。

Side 为项目开发引入了**目标**概念，用于确定项目开发环境和目标产物的可设定细节。通过目标确定的大部分设定都可以以环境变量的形式在钩子脚本被引用。

## 2.2. 资源分发管理

> 大部分情况下应用开发人员不需要直接接触 dist 工具，如果您对此部分内容不感兴趣，可以跳过。

Side 工具包提供了 dist 和 dist-server 用于处理与资源分发相关的事务。dist 工具可以用于打包、发布以及安装资源分发包。dist-server 则被用于实现一个持久化的资源托管分发服务器。

dist 定义了一种包结构以及它的状态和状态间的转换指令。dist 包可以使用 dist 工具创建，也可以手工打造。dist 包可以被发布到 dist-server 上托管，可以被获取、解包、安装、卸载。

除此之外 dist 包还可以在某个具体的项目中被测试、激活和灭活。Side 依赖这些细分的资源状态令多个互斥的资源可以同时被安装在一台机器上，但仅在局部环境激活，以避免冲突。

# 3. 搭建项目

项目负责人或集成负责人可能需要为开发人员搭建环境，本节介绍如何基于 side 工具搭建一个项目环境。

## 3.1. 清单与目标

Side 工具的大部分行为由 `清单` 文件控制。为了基于同一套技术资产面向不同项目或相同项目的不同业务基线执行开发或发布工作， side 允许用户将 `清单` 文件拆分为多片段。

执行 `起草` 过程时，side 工具以 `目标` 为中心挑选恰当的清单片段文件，按照特定的顺序层叠其中的信息，生成 `最终目标清单` 文件用于指导 side 后续工作中的大部分行为。

### 3.1.1. 清单的分类

`清单` 文件都是yaml文件，其片段有三种类型，不同类型的清单文件服务于不同的复用性目的。

- 主清单 ${SIDE_PROJECT_META}/manifest
- 目标清单 ${SIDE_PROJECT_META}/targets/target-*
- 切面清单 ${SIDE_PROJECT_META}/targets/aspect-*

主清单用于配置项目顶层设置或公共设置，无论选取哪个目标起草项目，主清单的内容都被用作基础配置。

目标清单用于引领清单片段的选择，也用于确定当前目标特有的配置信息。目标可以相互继承，子目标可以覆盖父目标的配置信息。

切面清单用于将不同目标继承树上相同的信息抽取并复用。

### 3.1.2. 层叠清单信息

执行 `side draft <target>` 指令时，side 根据选定的目标选取相关联的目标文件，将其中信息安装特定次序层叠后生成 `最终目标清单` 文件，存储在 ${SIDE_PROJECT_META}/.target 文件中。

清单文件选取和层叠规则如下：

1. 选择目标清单 `target-<target>` 为当前目标
2. 将当前目标清单入栈
3. 将当前目标清单文件聚合的切面清单文件全部入栈
4. 选择当前目标清单继承的目标清单，重复2操作
5. 将主清单入栈
6. 将栈中清单逐一弹出，将起内容 **层叠** 在一起。

层叠规则如下：

1. 两个字典合并，字段名相同则递归应用层叠规则，字段名不冲突者并存于层叠结果中
2. 两个数组合并，将两个数组的元素都保留，按先后顺序排列
3. 其它情况使用新值覆盖旧值

### 3.1.3. 清单结构

不同类型的清单片段文件其结构只有少部分细节不同。本章后续小节重点介绍差异项，后续章节会按照段落功能分别介绍其他部分。

### 3.1.4. 主清单专有字段

|字段名|语义|类型|取值|
|---|---|---|---|
|project|当前项目名|string|默认取项目文件夹名|
|engine|当前side版本号|string||

~~~yaml
project: MyProj
engine: 1.0.104
~~~

### 3.1.5. 目标清单专有字段

|字段名|语义|类型|取值|
|---|---|---|---|
|inerit|指定继承目标|string|可选，填写指定目标清单文件的目标名|
|composites|指定聚合目标|string[]|可选，取切面清单文件的切面名|

## 3.2. 子仓库

若当前项目需要多个仓库联合编译，side 工具可以在配置文件的指导下自动获取目标仓库，自动检出指定的分支。

在清单文件中配置 `modules` 字段，即可指定子仓库的拉取规则，示例如下：

~~~yaml
modules:
  modA:
    repo: git@host/owner/modA.git
    checkout: branch-2
    authors: ["jenkins@mail.com", "foo@mail.com"]
  modB:
    repo: git@host/owner/modB.git
    checkout: branch-2
    authors: ["jenkins@mail.com", "bar@mail.com"]
~~~

上述配置文件指定了两个子仓库，执行 `side setup` 指令时，side 会尝试获取这两个仓库并尝试检出 `branch-2` 分支。

authors 字段用于基于当前环境下 git 中配置的邮箱来筛选即将克隆的仓库。若某个仓库的 authors 列表中没有包含当前用户的邮箱，则此仓库不会被自动克隆。

除了清单以外，本地设置文件也可以用于控制子仓库的克隆和检出。使用本地设置文件的好处是它不被 git 跟踪，可以避免多人修改 manifest 文件造成冲突或损坏。

~~~yaml
# settings user: bar@mail.com
modules:
  modA:
    fetch: true
    checkout: branch-3
~~~

创建 `${SIDE_PROJECT_META}/settings` 问家，并键入上述内容，`bar@mail.com` 用户即可增加 `modA` 仓库的克隆动作。并覆盖了主清单文件的检出目标。

 
## 3.3. 层叠资源

TODO

## 3.4. 项目钩子

TODO

## 3.5. 环境变量

TODO

# 4. 打包与分发

TODO

## 4.1. 包标识

TODO

## 4.2. 包结构

TODO

## 4.3. 打包

TODO

## 4.4. 分发

TODO

## 3.7. 部署

TODO

# 5. 参考

## 5.1. 设置参考

Side 支持使用配置文件设定全局设置和本地设置，全局设置在全局范围影响 side 工具的行为，本地设置在项目内影响 side 工具的行为。

### 5.1.1. 全局设置

全局设置文件 `${SIDE_HOME}/settings` 以 YAML 格式记录 side 全局设置。

#### 5.1.1.1. offline

字段 `offline` 用于控制 side 是否进入离线模式。离线模式下 side 主动放弃所有对分发服务器的访问，并视情况给出警告或报错。

|字段|类型|默认|
|---|---|---|
|offline|boolean|false|

#### 5.1.1.2. dist

字段 dist 用于控制 side 访问分发服务器时的行为细节。dist 字段由若干可选的子字段构成，说明如下：

|字段|类型|默认|备注|
|---|---|---|---|
|dist.apiBaseUrl|string|http://localhost:5000/api|分发服务器接口访问基础地址|
|dist.ftpBaseUrl|string|ftp://localhost/dist|文件传输服务器访问基础地址|
|dist.user|string||当前登录的用户名|
|dist.token|string||当前用户的接口访问口令|

### 5.1.2. 本地设置

本地设置文件 `${SIDE_PROJECT}/.side/settings` 控制 side 与项目强相关的一些行为细节。

#### 5.1.2.1. modules

字段 modules 控制 side setup 指令将自动获取并更新哪些子模块仓库。若缺省，默认自动获取并更新全部子模块仓库。

|字段|类型|默认|备注|
|---|---|---|---|
|modules.模块名.fetch|boolean|遵循目标配置|指示 side 是否应当自动获取并更新某模块|
|modules.模块名.checkout|string||指示 side 应当自动检出的子仓库分支或特定提交|

## 5.2. 变量参考

Side 工具执行钩子脚本时，根据当前场景会为钩子脚本提供一系列环境变量供钩子脚本感知环境状况。

### 5.2.1. 常驻变量

任何时候，使用 side 工具执行外部指令时都会提供的环境变量：

|变量|取值|备注|
|---|---|---|
|LANG|C.UTF-8|去除本地化，避免部分指令执行失败|
|LANGUAGE|C.UTF-8|去除本地化，避免部分指令执行失败|
|SIDE_HOME|参考路径定义|side 工具配置和依赖缓冲的存储路径|
|SIDE_OFFLINE|离线模式下为 TRUE，否则为空|表征 side 当前是否处于离线模式下|
|SIDE_SYSROOT|参考路径定义|side 供资源包全局部署内容的路径|
|SIDE_VERSION|当前 side 的版本号||
|SIDE_REVISION|当前 side 的源码提交哈系||
|NODE_PATH|参考路径定义||
|LD_LIBRARY_PATH|参考路径定义||
|PATH|参考路径定义||

### 5.2.2. 项目变量

当执行项目钩子脚本或在项目中执行 side shell 指令时提供的环境变量：

|变量|取值|备注|
|---|---|---|
|SIDE_PROJECT|side 项目的顶层路径||
|SIDE_PROJECT_TARGET|当前项目的目标||
|SIDE_PROJECT_NAME|当前项目名||
|SIDE_PROJECT_META|参考路径定义||
|SIDE_PROJECT_SYSROOT|参考路径定义||
|SIDE_DIR_MODULE|参考路径定义||
|SIDE_DIR_BUILD|参考路径定义||
|SIDE_DIR_DOCUMENT|参考路径定义||
|SIDE_DIR_GENERATED|参考路径定义||
|SIDE_DIR_PACKAGE|参考路径定义||
|SIDE_DIR_RELEASE|参考路径定义||
|NODE_PATH|参考路径定义||
|LD_LIBRARY_PATH|参考路径定义||
|PATH|参考路径定义||

### 5.2.3. dist 变量

dist 执行资源包钩子脚本时会为提供一些与资源包安装环境相关的环境变量：

|变量|取值|备注|
|---|---|---|
|SIDE_DIST_PATH|资源包解包后的顶层路径||
|SIDE_DIST_ROOT|资源包解包后的资源根路径||
|SIDE_DIS_NAME|资源名||
|SIDE_DIST_TAGS|资源标签||
|SIDE_DIST_VERSION|资源版本号||
|SIDE_DIST_MAJOR|资源主版本号||
|SIDE_DIST_MINOR|资源次版本号||
|SIDE_DIST_PATCH|资源补丁号||
|SIDE_DIST_QUERY|资源请求|请求即ID中不包含版本号的部分|
|SIDE_DIST_SYMBOL|资源符号|符号即ID中不包含域名的部分|
|SIDE_DIST_SCOPE|资源域|资源所属的域名|
|SIDE_DIST_ID|资源ID||

### 5.2.4. 开关变量

一些变量可以用于控制 Side 的行为：

|变量|取值|备注|
|---|---|---|
|SIDE_VERBOSE|TRUE|当此变量为 TRUE 时，side在命令行打印更多提示|

## 5.3. 路径参考

side 对项目路径结构有具体定义，其中一些路径可以被定制修改，全部重要路径均有对应的环境变量：

### 5.3.1. Side 家路径

Side 家路径被用于存储 Side 设置，资源缓冲和使用 Side 安装的工具或库。Side 家路径由 `SIDE_HOME` 变量控制，若缺省，默认取值如下：

```bash
#!/bin/bash

export SIDE_HOME=~/.side
```

### 5.3.2. Side 项目路径

Side 工具执行项目相关指令时会自动判断当前路径是否处于某个项目路径或其子路径下。当且一个路径正确包含了清单文件 `./.side/manifest` 时，此路径被识别为项目路径。

项目路径通过环境变量 `SIDE_PROJECT` 向外提供。

#### 5.3.2.1. 项目元信息路径

项目元信息路径被用于存储项目清单，目标，层叠资源等内容。

```bash
#!/bin/bash

export SIDE_PROJECT_META=${SIDE_PROJECT}/.side
```

#### 5.3.2.2. 项目系统根路径

项目系统根路径在项目路径下模拟了一个系统根路径，在当前项目激活的资源包可以将可执行或可链接的文件部署在项目系统根路径下，如此即可令这些资源在项目内局部生效：

```bash
#!/bin/bash

export SIDE_PROJECT_SYSROOT=${SIDE_PROJECT_META}/sysroot
```

#### 5.3.2.3. 项目资产路径

项目资产路径用于存储与项目工作流程相关的输入或输出文件。项目资产路径均可定制，可以通过目标清单中的 dirs 字段修改资产路径的默认值。

|环境变量|自定义配置名|默认值|备注|
|---|---|---|---|
|SIDE_DIR_MODULE|MODULE|module|存放子模块仓库的默认相对路径路径|
|SIDE_DIR_BUILD|BUILD|build|存放构建内容物的默认相对路径|
||DIST|build|打包时搜集分发内容的路径|
|SIDE_DIR_DOCUMENT|DOCUMENT|doc|存放文档的默认相对路径|
|SIDE_DIR_GENERATED|GENERATED|.side/generated|存放自动生成的内容的默认相对路径|
|SIDE_DIR_PACKAGE|PACKAGE|.side/packing|打包工作环境的默认相对路径|
|SIDE_DIR_RELEASE|RELEASE|release|发布包的默认相对存储路径|

### 5.3.3. side 系统根路径

Side 系统根路径为那些希望在 side 体系内全局生效的工具或库提供部署路径。

```bash
#!/bin/bash

export SIDE_SYSROOT=${SIDE_HOME}/sysroot
```

### 5.3.4. 通用查找路径

Side 执行钩子脚本时会将 side 系统根路径和项目系统根路径中的重要路径注入到通用查找路径中。

#### 5.3.4.1. NODE_PATH

|注入路径|备注|
|---|---|
|/usr/lib/node_modules||
|${SIDE_SYSROOT}/lib/node_modules||
|${SIDE_SYSROOT}/usr/lib/node_modules||
|${SIDE_PROJECT_SYSROOT}/lib/node_modules|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/usr/lib/node_modules|在项目路径下才提供|

#### 5.3.4.2. LD_LIBRARY_PATH

|注入路径|备注|
|---|---|
|${SIDE_SYSROOT}/lib64||
|${SIDE_SYSROOT}/lib||
|${SIDE_SYSROOT}/lib/x86_64-linux-gnu||
|${SIDE_SYSROOT}/usr/lib64||
|${SIDE_SYSROOT}/usr/lib||
|${SIDE_SYSROOT}/usr/lib/x86_64-linux-gnu||
|${SIDE_PROJECT_SYSROOT}/lib64|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/lib|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/lib/x86_64-linux-gnu|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/usr/lib64|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/usr/lib|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/usr/lib/x86_64-linux-gnu|在项目路径下才提供|

#### 5.3.4.3. PATH

|注入路径|备注|
|---|---|
|${SIDE_SYSROOT}/bin||
|${SIDE_SYSROOT}/sbin||
|${SIDE_SYSROOT}/usr/bin||
|${SIDE_SYSROOT}/usr/sbin||
|${SIDE_PROJECT_SYSROOT}/bin|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/sbin|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/usr/bin|在项目路径下才提供|
|${SIDE_PROJECT_SYSROOT}/usr/sbin|在项目路径下才提供|