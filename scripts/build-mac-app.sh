#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "📦 1. 构建前端生产资源 (Vite)..."
npx vite build

echo "🎨 2. 确保应用高清图标已就绪..."
if [ ! -f "build/icon.icns" ]; then
  python3 scripts/generate-icon.py
fi

echo "🚀 3. 组装 macOS 原生 Open-Easy.app 结构..."
mkdir -p release
touch release/.metadata_never_index
APP_DIR="release/Open-Easy.app"
rm -rf "$APP_DIR"

# 复制原生 Electron 运行时包
cp -R "node_modules/electron/dist/Electron.app" "$APP_DIR"

# 重命名主执行程序二进制文件
mv "$APP_DIR/Contents/MacOS/Electron" "$APP_DIR/Contents/MacOS/Open-Easy"

# 修改 Info.plist 元数据
PLIST="$APP_DIR/Contents/Info.plist"
APP_VER=$(node -p "require('./package.json').version")
/usr/libexec/PlistBuddy -c "Set :CFBundleName Open-Easy" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Open-Easy" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.yuteng.openeasy" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable Open-Easy" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile icon.icns" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $APP_VER" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $APP_VER" "$PLIST"

# 注入高清应用图标
cp "build/icon.icns" "$APP_DIR/Contents/Resources/icon.icns"
cp "build/icon.icns" "$APP_DIR/Contents/Resources/electron.icns"

echo "📂 4. 拷贝业务代码与运行时资源到 Resources/app..."
APP_RES="$APP_DIR/Contents/Resources/app"
mkdir -p "$APP_RES"

cp package.json "$APP_RES/"
cp -R dist "$APP_RES/"
cp -R electron "$APP_RES/"
mkdir -p "$APP_RES/src"
cp -R src/utils "$APP_RES/src/"

# 拷贝必要的运行时 node_modules
mkdir -p "$APP_RES/node_modules"
cp -R node_modules/vue "$APP_RES/node_modules/"
cp -R node_modules/@vue "$APP_RES/node_modules/"

echo "🔐 5. 给予 macOS 本地临时签名 (Ad-hoc Sign)..."
codesign --force --deep --sign - "$APP_DIR"

echo "📲 6. 安装至 macOS 应用程序目录..."
if [ -n "$SKIP_INSTALL" ]; then
  echo "⏩ 跳过安装步骤 (SKIP_INSTALL 已指定)"
else
  # 终止正在运行的旧实例，确保文件句柄释放
  pkill -f "Open-Easy.app/Contents/MacOS/Open-Easy" 2>/dev/null || true
  sleep 0.5

  # 彻底清理历史旧目录，防止 cp -R 产生嵌套
  rm -rf /Applications/Open-Easy.app 2>/dev/null || true
  rm -rf "$HOME/Applications/Open-Easy.app" 2>/dev/null || true

  # 安装到系统 /Applications (如无权限则优雅退回至 ~/Applications)
  if cp -R "$APP_DIR" /Applications/ 2>/dev/null; then
    INSTALLED_PATH="/Applications/Open-Easy.app"
  else
    mkdir -p "$HOME/Applications"
    cp -R "$APP_DIR" "$HOME/Applications/"
    INSTALLED_PATH="$HOME/Applications/Open-Easy.app"
  fi

  # 刷新 macOS Launch Services 缓存，让启动台和聚焦搜索立刻索引该应用
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$INSTALLED_PATH" || true
  touch "$INSTALLED_PATH"

  echo "✨ 打包并安装成功！应用路径: $INSTALLED_PATH"
  echo "您可以在【启动台】(Launchpad)、【访达 -> 应用程序】或使用【聚焦搜索】(Spotlight 敲 Cmd+Space) 直接搜索 Open-Easy 点击启动！"
fi
