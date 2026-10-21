# Lucky Picker 部署与打包

当前应用由 Vue 静态页面、Node HTTP 服务和 SQLite 组成。完整功能必须通过 Node 服务运行，不能只上传 `dist/` 到 GitHub Pages、Nginx 静态目录或直接双击 HTML。

## 1. 环境与适用范围

- 构建机：Node.js >= 22.12、npm，以及 `tar` 命令。macOS/Linux 通常已提供 tar；Windows 可使用系统 tar 或 Git Bash。
- 运行机：Node.js >= 22.12；启动脚本已包含 `--experimental-sqlite` 参数。无需安装独立数据库，也无需安装 npm 依赖。
- 构建依赖尚未安装时，打包会执行 `npm ci`，此步骤需要访问 npm registry。依赖齐全后，测试和构建不主动抓取股票池或行情。
- 行情、热榜和彩票开奖查询需要运行机能连接对应上游站点；暂时失败会显示错误并保留已有结果。
- 当前版本是单用户本地应用，没有用户登录或数据隔离。数据接口只接受 `localhost`、`127.0.0.1`、`[::1]` 的同源访问。适合直接在自己电脑运行，或部署到服务器后通过 SSH 隧道访问。

不要直接向公网开放服务，也不要仅把 HOST 改为 0.0.0.0 就当作公网部署。远程域名访问还需要专门增加鉴权、允许域名及访问控制；当前包不包含这些改动。同一服务的访问者共享同一个数据库。

## 2. 一键生成部署包

在源码项目根目录执行：

```sh
npm run package
```

脚本自动检查 tar、按需安装构建依赖、执行完整测试、执行 TypeScript 检查与前端构建，然后打包。任一步失败立即停止。不会主动更新源码内的股票池或热榜快照。

默认输出到 `releases/`（已加入 Git 忽略）：

```text
releases/
  lucky-picker-1.0.0-<北京时间戳>.tar.gz
  lucky-picker-1.0.0-<北京时间戳>.tar.gz.sha256
```

自定义输出目录：

```sh
npm run package -- --out /absolute/path/to/packages
npm run package -- --help
```

包名时间使用北京时间；包内 `release.json` 的构建时间使用 UTC。部署包包含前端产物、服务端依赖模块、热榜筛选所需的完整股票池、启动脚本、服务配置模板和本文档。**不包含 SQLite、个人历史和观察、运行缓存、node_modules、Git 仓库或测试文件。** 不会把开发机的个人数据发到运行机。

## 3. 本机部署

将 tar.gz 和 sha256 文件放在同一目录，先校验：

```sh
# Linux
sha256sum -c lucky-picker-<版本与时间>.tar.gz.sha256
# macOS
shasum -a 256 -c lucky-picker-<版本与时间>.tar.gz.sha256
```

上面的文件名需要替换成实际生成的名称。解压并启动：

```sh
tar -xzf lucky-picker-<版本与时间>.tar.gz
cd lucky-picker-<版本与时间>
./start.sh
```

Windows 可解压后双击 `start.cmd`，或在解压目录中执行 `npm start`。macOS/Linux 也可用 `sh start.sh` 或 `npm start`。这些启动方式不需要先运行 `npm install`。

浏览器打开 <http://127.0.0.1:5173/>。前台启动时保持终端运行；按 Ctrl+C 停止。运行包的 `start.mjs` 会定位到自己的解压目录，因此启动脚本不依赖调用者的工作目录。

### 自定义端口和数据目录

macOS/Linux：

```sh
PORT=3000 LUCKY_PICKER_DATA_DIR="$HOME/.lucky-picker-production" ./start.sh
```

Windows PowerShell：

```powershell
$env:PORT = '3000'
$env:LUCKY_PICKER_DATA_DIR = 'D:\LuckyPicker\data'
.\start.cmd
```

| 变量 | 默认值（部署包） | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 保持仅监听本机 |
| `PORT` | `5173` | HTTP 端口；被占用时换端口 |
| `LUCKY_PICKER_DATA_DIR` | 当前运行用户的 `~/.lucky-picker` | SQLite 所在目录，必须可写；建议使用绝对路径 |
| `LUCKY_DATA_DIR` | 上述目录下的 `cache/` | 热榜及日线缓存目录，必须可写；可以重建 |

前端地址必须是这个 Node 服务的地址。`file://`、纯静态托管及其他域名均不能代替它。源码 `npm run dev` 默认热榜缓存仍在项目 `.lucky-data/`；部署包启动器则把缓存放到上述数据目录，避免升级包时丢失。

## 4. Linux 常驻运行（systemd，可选）

以下以 Debian/Ubuntu 类系统为例。需要管理员安装服务；部署包本身不执行这些系统修改。先确认系统 Node 路径和版本：

```sh
command -v node
/usr/bin/node --version
```

模板使用 `/usr/bin/node`。实际路径不同时，先修改 `lucky-picker.service` 的 `ExecStart`，并确保运行用户可以访问该 Node。不要引用只有个人登录 shell 才能找到的 nvm 别名。

首次创建专用用户（已存在则跳过）：

```sh
sudo useradd --system --user-group --home-dir /var/lib/lucky-picker --no-create-home --shell /usr/sbin/nologin luckypicker
sudo mkdir -p /opt/lucky-picker
```

将已校验的部署包上传到服务器，下面将 `/tmp/实际部署包.tar.gz` 替换为真实路径：

```sh
lucky_archive=/tmp/实际部署包.tar.gz
sudo tar -xzf "$lucky_archive" -C /opt/lucky-picker
lucky_release=$(tar -tzf "$lucky_archive" | sed -n '1s,/.*,,p')
sudo ln -sfn "/opt/lucky-picker/$lucky_release" /opt/lucky-picker/current
sudo install -m 644 /opt/lucky-picker/current/lucky-picker.service /etc/systemd/system/lucky-picker.service
sudo systemctl daemon-reload
sudo systemctl enable --now lucky-picker
sudo systemctl status lucky-picker
```

`StateDirectory=lucky-picker` 会创建 `/var/lib/lucky-picker` 并交给服务用户。历史和观察存到 `/var/lib/lucky-picker/data.sqlite`，缓存存到 `/var/lib/lucky-picker/cache`，不放在版本目录。

查看日志、重启和停止：

```sh
sudo journalctl -u lucky-picker -n 100 --no-pager
sudo systemctl restart lucky-picker
sudo systemctl stop lucky-picker
```

### 从自己的电脑访问服务器

在自己电脑的终端保持下面命令运行：

```sh
ssh -N -L 5173:127.0.0.1:5173 user@your-server
```

然后在自己电脑打开 <http://127.0.0.1:5173/>。本机 5173 被占用时，可将命令左侧端口改为 5174，再打开 `http://127.0.0.1:5174/`。无需在服务器防火墙开放应用端口。

## 5. 数据迁移、备份与恢复

- 浏览器旧记录：打开 Node 页面时自动合并当前地址下的旧 localStorage；重复项保留数据库现有记录。不同浏览器、端口或域名的旧存储需要分别访问原地址或先导出备份。
- 换电脑、换运行用户或迁移到服务器：优先使用页面右上角「数据与备份」导出 JSON，再在新服务中导入。导入是合并操作，不会替换全部数据，相同标识保留新服务已有内容。
- 备注、观察结果及行情快照随 JSON 记录一起导出。打包代码不会替你迁移这些数据。
- 整库备份：先停止**所有使用该数据目录的项目进程**，复制整个 `LUCKY_PICKER_DATA_DIR` 到独立备份位置。运行中的 SQLite 可能使用 `data.sqlite-wal`、`data.sqlite-shm`，不要运行中只复制主文件。
- 整库恢复：停止服务后恢复完整数据目录，并确保属主/权限属于服务运行用户，再启动。恢复目录前先备份当前目录；整库恢复会回到备份时点。
- 不要把数据库或备份放进 `dist/`，不要通过 HTTP 静态目录提供下载。

开发和本机部署若使用同一用户、未指定独立数据目录，默认共享 `~/.lucky-picker/data.sqlite`。需要隔离测试数据时务必指定不同目录。

## 6. 升级与回退

1. 在源码项目运行 `npm run package`，校验新包。
2. 停止旧服务，备份数据目录，记录当前解压目录或 `current` 链接指向。
3. 新包解压到新的版本目录，不覆盖 SQLite 目录。systemd 部署切换 `current` 链接；保持原服务配置中的数据目录和端口。
4. 启动服务，检查首页、历史、两份观察列表及备注。确认保存、刷新与备份功能正常。
5. 需要回退时停止服务，切回旧版本目录。若未来版本修改了数据库格式，应同时恢复与旧版匹配的整库备份，不能假设旧代码兼容新格式。

## 7. 验收与排查

```sh
curl -f http://127.0.0.1:5173/
curl -f http://127.0.0.1:5173/api/local-data
```

第二个接口包含个人记录，只在自己的终端检查，不要把完整输出发到公开日志。验证生成一次记录、加入观察并填写备注，刷新页面确认仍在，再导出一份备份。

| 现象 | 检查方法 |
| --- | --- |
| `node:sqlite` 不存在 | 检查 Node >= 22.12，使用随包启动脚本；Node 22.12 需要实验参数 |
| 端口占用 `EADDRINUSE` | 停止旧服务或通过 `PORT` 换端口；同步修改访问地址和隧道 |
| 无法连接本地数据库 | 检查 Node 日志、数据目录写权限、磁盘空间，确认运行的是完整 Node 服务 |
| 403 同源错误 | 使用本机地址/SSH 隧道；不要直接用远程 IP、域名或绕过允许主机限制 |
| 新电脑看不到旧记录 | 数据在原运行用户/原电脑的目录；通过 JSON 或停服整库备份迁移 |
| 热榜同步失败 | 检查运行机出站网络及上游返回；旧快照不会被不完整数据覆盖 |
| 股票池文件找不到 | 使用完整打包目录，保留 `src/data/stock-pool.json`；不要只复制 dist 和 server.mjs |
| 其他页面更新了数据 | 刷新旧页面后再操作，避免旧状态覆盖已保存的新内容 |
