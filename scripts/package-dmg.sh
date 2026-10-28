#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

VERSION=$(node -p "require('./package.json').version")
ARCH=$(uname -m)

echo "📦 1. 构建 macOS 原生应用包 (跳过直接安装)..."
SKIP_INSTALL=1 bash scripts/build-mac-app.sh

echo "📀 2. 准备打包 DMG 磁盘映像 (架构: $ARCH, 版本: $VERSION)..."
DMG_NAME="Open-Easy-${VERSION}-${ARCH}.dmg"
DMG_PATH="release/${DMG_NAME}"
STAGING_DIR="release/dmg-staging"

rm -rf "$STAGING_DIR" "$DMG_PATH"
mkdir -p "$STAGING_DIR"

# 复制应用程序到暂存目录
cp -R "release/Open-Easy.app" "$STAGING_DIR/"

# 创建 Applications 软链接 (支持用户双击 DMG 后直接拖入应用程序)
ln -s /Applications "$STAGING_DIR/Applications"

# 生成紧凑压缩的 UDZO 格式 DMG 镜像
hdiutil create \
  -volname "Open-Easy" \
  -srcfolder "$STAGING_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

rm -rf "$STAGING_DIR"

echo "🤐 3. 额外生成便携 ZIP 归档包 (保留 macOS 资源元数据)..."
ZIP_NAME="Open-Easy-${VERSION}-${ARCH}.zip"
ZIP_PATH="release/${ZIP_NAME}"
rm -f "$ZIP_PATH"
ditto -c -k --sequesterRsrc --keepParent "release/Open-Easy.app" "$ZIP_PATH"

echo ""
echo "🎉 恭喜！发布包制作完成："
echo "   ▶ DMG 安装镜像: $DMG_PATH ($(du -h "$DMG_PATH" | cut -f1))"
echo "   ▶ ZIP 便携压缩: $ZIP_PATH ($(du -h "$ZIP_PATH" | cut -f1))"
