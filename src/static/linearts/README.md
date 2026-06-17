# 内置线稿资源目录

## 新增线稿（2 步）

1. 把图片放进本目录（推荐 JPG，长边 ≤ 512px）
2. 在 `src/data/linearts.js` 追加一项：
   ```js
   { name: '显示名', path: '/static/linearts/<文件名>' }
   ```

首页与线稿库共用该列表，无需改多处。

## 校验

```bash
npm run check:linearts
```

- `linearts.js` 中的路径必须对应真实文件

## 资源要求

- 纯黑线 + 白底，便于油漆桶填色
- 文件名建议英文
- 缩略图加载失败时会显示 emoji 占位，不会破图
