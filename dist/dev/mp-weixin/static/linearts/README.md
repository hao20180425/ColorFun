# 内置线稿资源目录

此目录用于放置应用内置的线稿图（黑白涂色底图）。

## 使用方式（新增一张线稿）

本目录采用**手动维护硬编码数组**的方式管理线稿列表。

新增一张线稿需要 3 步：

1. 把图片素材放进本目录（推荐 `jpg` 格式以控制包体积）
2. 在 `/src/pages/index/index.vue` 的 `builtinLinearts` 数组中追加一项：
   ```js
   { name: '显示名', path: '/static/linearts/<文件名>' }
   ```
3. 在 `/src/pages/gallery/gallery.vue` 的 `draftList` 数组中追加一项：
   ```js
   { name: '显示名', img: '/static/linearts/<文件名>' }
   ```

> 注意：两处的名称应保持一致。

## 资源要求

- 推荐格式：JPG（体积小），也支持 PNG
- 线稿图请使用纯黑线 + 纯白底，方便油漆桶填色识别封闭区域
- 文件名建议使用英文（如 `flower.jpg`、`Airplane.jpg`）

## 优雅降级

页面中的缩略图会监听 `@error` 事件：当某张图片加载失败时，会自动切换为
 emoji 占位符，不会出现破图。
