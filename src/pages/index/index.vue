<template>
  <!-- ==========================================================
       首页（线稿选择页）
       ----------------------------------------------------------
       结构（自上而下）：
         1) 顶部 Logo 区：紫色渐变 ColorFun + 灰色副标题
         2) Banner 大卡片：紫色渐变背景 + 双行标语 + 装饰元素
         3) "选择线稿" 标题（带 ✨ 装饰）
         4) 双栏入口卡片：相册导入（蓝） / 内置线稿（黄）
         5) "热门推荐" 标题（带 💖 装饰）
         6) 3 列线稿缩略图网格
         7) 底部装饰文字
       注意：本页是一个普通可滚动页面，与绘画页（固定不滚动）不同。
       ========================================================== -->
  <scroll-view class="home-page" scroll-y="true">

    <!-- =========================================================
         1) 顶部 Logo 区
         ========================================================= -->
    <view class="hero-header">
      <!-- 紫色渐变 Logo 文字（背景渐变 + 文字裁剪） -->
      <text class="hero-logo">ColorFun</text>
      <!-- 灰色副标题 -->
      <text class="hero-subtitle">涂色小程序</text>

      <!-- 顶部右上角的两颗小装饰星星 -->
      <text class="hero-deco hero-deco-star1">✨</text>
      <text class="hero-deco hero-deco-star2">⭐</text>
    </view>

    <!-- =========================================================
         2) Banner 区域
         紫色渐变大卡片（无图片资源时使用纯 CSS 渐变背景）
         ========================================================= -->
    <view class="banner">
      <!-- 左上角微透明大圆点装饰 -->
      <view class="banner-blob banner-blob-1"></view>
      <view class="banner-blob banner-blob-2"></view>

      <view class="banner-content">
        <text class="banner-title">快乐涂色 · 释放想象力</text>
        <text class="banner-desc">让每一幅画都充满色彩</text>

        <!-- 标语下面的小色点装饰，呼应"色彩"主题 -->
        <view class="banner-dots">
          <view class="banner-dot" style="background:#FFD56B"></view>
          <view class="banner-dot" style="background:#FF8FB1"></view>
          <view class="banner-dot" style="background:#7BD9F2"></view>
          <view class="banner-dot" style="background:#A8E6CF"></view>
        </view>
      </view>

      <!-- 右侧 emoji 装饰（让 banner 更有活力） -->
      <text class="banner-emoji">🎨</text>
    </view>

    <!-- =========================================================
         3) "选择线稿" 标题
         ========================================================= -->
    <view class="section-title">
      <text class="section-deco">✨</text>
      <text class="section-text">选择线稿</text>
      <text class="section-deco">✨</text>
    </view>

    <!-- =========================================================
         4) 双栏入口卡片
         ========================================================= -->
    <view class="entry-grid">
      <!-- 左：相册导入 - 浅蓝 #e9f3ff -->
      <view class="entry-card entry-card-album" @tap="chooseAlbum">
        <text class="entry-emoji">📷</text>
        <text class="entry-title entry-title-album">相册导入</text>
        <text class="entry-desc">导入照片开始涂色</text>
        <!-- 卡片右下角小箭头，提示可点 -->
        <text class="entry-arrow">→</text>
      </view>

      <!-- 右：内置线稿 - 浅黄 #fff3d8 -->
      <view class="entry-card entry-card-builtin" @tap="goGallery">
        <text class="entry-emoji">🖼️</text>
        <text class="entry-title entry-title-builtin">内置线稿</text>
        <text class="entry-desc">选择喜欢的线稿</text>
        <text class="entry-arrow">→</text>
      </view>
    </view>

    <!-- =========================================================
         5) "热门推荐" 标题
         ========================================================= -->
    <view class="section-title">
      <text class="section-deco">💖</text>
      <text class="section-text">热门推荐</text>
      <text class="section-deco">💖</text>
    </view>

    <!-- =========================================================
         6) 3 列线稿缩略图网格
         点击任一缩略图 -> 跳转 paint 页并通过 url query 传 img 路径
         ========================================================= -->
    <view class="lineart-grid">
      <view
        v-for="item in builtinLinearts"
        :key="item.path"
        class="lineart-card"
        @tap="goPaint(item)"
      >
        <view class="lineart-thumb">
          <!-- 加载失败时切到 emoji 占位（防止破图） -->
          <image
            v-if="!failedThumbs[item.path]"
            class="lineart-thumb-img"
            :src="item.path"
            mode="aspectFit"
            @error="onThumbError(item)"
          ></image>
          <view v-else class="lineart-thumb-fallback">
            <text class="fallback-emoji">🖼️</text>
          </view>
        </view>
        <text class="lineart-name">{{ item.name }}</text>
      </view>
    </view>

    <!-- =========================================================
         7) 底部装饰文字
         ========================================================= -->
    <view class="footer-deco">
      <text class="footer-text">涂出你的世界 🌈</text>
    </view>

    <!-- 底部安全区占位，避免最后一行被刘海/Home 指示器遮挡 -->
    <view class="safe-bottom"></view>
  </scroll-view>
</template>

<script setup>
/* =====================================================================
 * pages/index/index.vue
 * ---------------------------------------------------------------------
 * 首页 —— 线稿选择入口页面
 *   - 顶部 Logo + Banner 标语
 *   - 「相册导入」：功能开发中，弹窗提示
 *   - 「内置线稿」：跳转线稿库页；热门推荐网格共用 data/linearts.js
 * ===================================================================== */
import { ref } from 'vue'
import { linearts } from '@/data/linearts.js'

const builtinLinearts = linearts

/* 缩略图加载失败记录：path -> true */
const failedThumbs = ref({})

/* =====================================================================
 * 2) 相册导入：功能开发中，弹窗提示
 * ===================================================================== */
function chooseAlbum() {
  uni.showModal({
    title: '相册导入',
    content: '功能开发中，敬请期待～',
    showCancel: false,
    confirmText: '知道了'
  })
}

/* =====================================================================
 * 3) 跳转到绘画页（点击具体内置线稿）
 * @param {{name: string, path: string}} item
 * ===================================================================== */
function goPaint(item) {
  if (!item || !item.path) return
  uni.navigateTo({
    url: '/pages/paint/paint?img=' + encodeURIComponent(item.path)
  })
}

/* =====================================================================
 * 4) 「内置线稿」卡片点击 —— 跳转到 gallery 线稿库页
 * ===================================================================== */
function goGallery() {
  uni.navigateTo({
    url: '/pages/gallery/gallery'
  })
}

/* =====================================================================
 * 5) 缩略图加载失败回调：标记该 path 已失败，模板自动切占位符
 * ===================================================================== */
function onThumbError(item) {
  if (!item || !item.path) return
  console.warn('[Thumb] 缩略图加载失败:', item.path)
  failedThumbs.value[item.path] = true
}
</script>

<style lang="scss" scoped>
/* =====================================================================
 * 设计语言：柔粉糖果 × 紫调主视觉
 *   - 主色：紫 #7b61ff（强调 / Logo / Banner 渐变）
 *   - 背景：#f7f7fb 极浅紫灰，干净、温柔
 *   - 卡片：白底 + 大圆角 + 轻投影
 *   - 字体：PingFang SC 优先，带圆润字重对比
 * ===================================================================== */

/* ---------- 设计变量 ---------- */
$color-primary:   #7b61ff;
$color-bg:        #f7f7fb;
$color-card:      #ffffff;
$color-text:      #1f1f2c;
$color-sub:       #8a8aa3;

$radius-card:     30rpx;

$shadow-card:     0 8rpx 24rpx rgba(123, 97, 255, 0.06);
$shadow-soft:     0 6rpx 18rpx rgba(31, 31, 44, 0.05);

$font-stack:      'PingFang SC', 'PingFangSC-Regular', 'Hiragino Sans GB', sans-serif;

/* ---------- 页面根容器 ---------- */
.home-page {
  width: 100%;
  min-height: 100vh;
  background: $color-bg;
  font-family: $font-stack;
  color: $color-text;
  /* scroll-view 在某些机型上需要显式高度 */
  height: 100vh;
  box-sizing: border-box;
}

/* =====================================================================
 * 1) 顶部 Logo 区
 * ===================================================================== */
.hero-header {
  position: relative;
  padding: 80rpx 40rpx 30rpx;
  /* 状态栏占位（沉浸式自定义导航栏下，安全区由系统留出） */
  padding-top: calc(80rpx + constant(safe-area-inset-top));
  padding-top: calc(80rpx + env(safe-area-inset-top));

  .hero-logo {
    display: block;
    font-size: 64rpx;
    font-weight: 800;
    letter-spacing: 2rpx;
    line-height: 1.1;
    /* 紫色渐变文字（背景裁剪） */
    background: linear-gradient(135deg, #7b61ff 0%, #b58dff 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: $color-primary; /* 兼容老内核 */
  }

  .hero-subtitle {
    display: block;
    margin-top: 10rpx;
    font-size: 26rpx;
    font-weight: 500;
    color: $color-sub;
    letter-spacing: 4rpx;
  }

  /* 装饰星星：小尺寸 + 微旋转 */
  .hero-deco {
    position: absolute;
    font-size: 36rpx;
    line-height: 1;
    opacity: 0.85;
  }
  .hero-deco-star1 {
    top: calc(60rpx + env(safe-area-inset-top));
    right: 60rpx;
    transform: rotate(12deg);
  }
  .hero-deco-star2 {
    top: calc(120rpx + env(safe-area-inset-top));
    right: 130rpx;
    font-size: 24rpx;
    transform: rotate(-18deg);
    opacity: 0.6;
  }
}

/* =====================================================================
 * 2) Banner 大卡片
 * ===================================================================== */
.banner {
  position: relative;
  margin: 20rpx 32rpx 0;
  padding: 48rpx 40rpx;
  border-radius: $radius-card;
  overflow: hidden;
  /* 紫色多段渐变背景 */
  background:
    linear-gradient(135deg, #7b61ff 0%, #9d8bff 55%, #b89dff 100%);
  box-shadow: 0 16rpx 36rpx rgba(123, 97, 255, 0.28);
  color: #ffffff;
  min-height: 220rpx;
}

/* Banner 内的两个柔和大圆点（背景装饰） */
.banner-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(2rpx);
}
.banner-blob-1 {
  top: -60rpx;
  right: -40rpx;
  width: 220rpx;
  height: 220rpx;
  background: rgba(255, 255, 255, 0.18);
}
.banner-blob-2 {
  bottom: -80rpx;
  left: -60rpx;
  width: 260rpx;
  height: 260rpx;
  background: rgba(255, 255, 255, 0.10);
}

.banner-content {
  position: relative;
  z-index: 1;

  .banner-title {
    display: block;
    font-size: 40rpx;
    font-weight: 800;
    letter-spacing: 1rpx;
    line-height: 1.3;
    text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.08);
  }

  .banner-desc {
    display: block;
    margin-top: 14rpx;
    font-size: 26rpx;
    font-weight: 400;
    letter-spacing: 1rpx;
    opacity: 0.92;
  }
}

/* Banner 标语下的彩色小圆点装饰 */
.banner-dots {
  display: flex;
  gap: 12rpx;
  margin-top: 22rpx;

  .banner-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.10);
  }
}

/* Banner 右上角的大 emoji 装饰 */
.banner-emoji {
  position: absolute;
  right: 32rpx;
  bottom: 32rpx;
  font-size: 96rpx;
  line-height: 1;
  opacity: 0.85;
  transform: rotate(-12deg);
  z-index: 1;
}

/* =====================================================================
 * 3) 区块标题：✨ 选择线稿 ✨ / 💖 热门推荐 💖
 * ===================================================================== */
.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin: 56rpx 32rpx 24rpx;

  .section-text {
    font-size: 32rpx;
    font-weight: 800;
    letter-spacing: 4rpx;
    color: $color-text;
  }

  .section-deco {
    font-size: 28rpx;
    line-height: 1;
  }
}

/* =====================================================================
 * 4) 双栏入口卡片
 * ===================================================================== */
.entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  margin: 0 32rpx;
}

.entry-card {
  position: relative;
  padding: 36rpx 32rpx;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  min-height: 200rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  overflow: hidden;

  .entry-emoji {
    font-size: 56rpx;
    line-height: 1;
    margin-bottom: 18rpx;
  }

  .entry-title {
    font-size: 30rpx;
    font-weight: 800;
    letter-spacing: 1rpx;
    margin-bottom: 8rpx;
  }

  .entry-desc {
    font-size: 22rpx;
    color: $color-sub;
    letter-spacing: 1rpx;
  }

  .entry-arrow {
    position: absolute;
    right: 32rpx;
    bottom: 32rpx;
    font-size: 32rpx;
    font-weight: 700;
    opacity: 0.6;
  }

  &:active {
    transform: translateY(2rpx) scale(0.98);
    box-shadow: 0 4rpx 14rpx rgba(123, 97, 255, 0.06);
  }
}

/* 相册卡：浅蓝 #e9f3ff，标题蓝色 */
.entry-card-album {
  background: #e9f3ff;

  .entry-title-album {
    color: #2f7adb;
  }
  .entry-arrow {
    color: #2f7adb;
  }
}

/* 内置卡：浅黄 #fff3d8，标题橙色 */
.entry-card-builtin {
  background: #fff3d8;

  .entry-title-builtin {
    color: #e2912a;
  }
  .entry-arrow {
    color: #e2912a;
  }
}

/* =====================================================================
 * 6) 3 列线稿缩略图网格
 *    用 grid 实现等宽 + 等间距
 * ===================================================================== */
.lineart-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin: 0 32rpx;
}

.lineart-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;
  background: $color-card;
  border-radius: 24rpx;
  box-shadow: $shadow-soft;
  transition: transform 0.18s ease;

  &:active {
    transform: scale(0.95);
  }
}

.lineart-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  /* aspect-ratio 在小程序中部分基础库不支持，叠加 padding-top 兆底 */
  padding-top: 100%;
  position: relative;
  background: #ffffff;
  border-radius: 18rpx;
  overflow: hidden;

  .lineart-thumb-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .lineart-thumb-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: repeating-linear-gradient(
      45deg,
      #efeff5,
      #efeff5 8rpx,
      #e5e5ee 8rpx,
      #e5e5ee 16rpx
    );

    .fallback-emoji {
      font-size: 48rpx;
      opacity: 0.55;
    }
  }
}

.lineart-name {
  margin-top: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: $color-text;
  letter-spacing: 1rpx;
}

/* =====================================================================
 * 7) 底部装饰文字
 * ===================================================================== */
.footer-deco {
  margin: 60rpx 32rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .footer-text {
    font-size: 26rpx;
    font-weight: 600;
    color: $color-sub;
    letter-spacing: 4rpx;
  }
}

/* 底部安全区占位 */
.safe-bottom {
  height: calc(40rpx + constant(safe-area-inset-bottom));
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
