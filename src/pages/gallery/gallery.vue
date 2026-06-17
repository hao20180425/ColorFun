<!--
  pages/gallery/gallery.vue
  ----------------------------------------------------------------
  内置线稿库页面（第三个页面）
  ----------------------------------------------------------------
  功能要点：
    1. 自定义导航栏：状态栏占位 + 胶囊行（避让微信右上胶囊）
    2. 顶部搜索框：按名称模糊过滤 draftList
    3. 顶部 Tab：全部 / 最新（仅视觉切换，不参与过滤）
    4. 左侧分类菜单：带 emoji 图标，点击切换激活态
    5. 右侧 3 列线稿网格：点击跳 paint 页（带 encodeURIComponent 路径）
    6. 主题：紫色 #7b61ff + 浅紫底 #f7f7fb + 白色卡片大圆角
-->
<template>
  <view class="page">
    <!-- 状态栏占位：高度 = 系统状态栏高度 -->
    <view :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 顶部胶囊行：左侧返回 + 标题，右侧给微信原生胶囊留位 -->
    <view class="header" :style="headerStyle">
      <view class="left-box">
        <view class="back" hover-class="hover-light" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="title">内置线稿 ✨</view>
      </view>
    </view>

    <!-- 搜索框（暂隐藏） -->
    <view v-if="showSearch" class="search-box">
      <text class="search-icon">🔍</text>
      <input
        class="search-input"
        placeholder="搜索你喜欢的线稿"
        placeholder-class="search-ph"
        v-model="keyword"
      />
    </view>

    <!-- 顶部 Tab：全部 / 最新 + 右侧布局按钮 -->
    <view class="top-tabs">
      <view
        v-for="(tab, i) in topTabs"
        :key="tab"
        class="top-tab"
        :class="{ active: activeTab === i }"
        @tap="activeTab = i"
      >
        {{ tab }}
      </view>
      <view class="layout-btn">☷</view>
    </view>

    <!-- 主体：左侧分类 + 右侧网格 -->
    <view class="content">
      <!-- 左侧分类菜单 -->
      <scroll-view class="sidebar" scroll-y>
        <view
          class="menu-item"
          :class="{ active: activeCategory === -1 }"
          @tap="activeCategory = -1"
        >
          ✨ 全部
        </view>
        <view
          v-for="(item, index) in categoryList"
          :key="index"
          class="menu-item"
          :class="{ active: activeCategory === index }"
          @tap="activeCategory = index"
        >
          {{ item.icon }} {{ item.name }}
        </view>
      </scroll-view>

      <!-- 右侧线稿网格 -->
      <scroll-view class="draft-scroll" scroll-y>
        <view class="draft-grid">
          <view
            v-for="(item, index) in filterList"
            :key="index"
            class="draft-card"
            hover-class="card-hover"
            @tap="goPaint(item)"
          >
            <view class="draft-thumb">
              <image
                v-if="!failedThumbs[item.img]"
                class="draft-img"
                :src="item.img"
                mode="aspectFill"
                @error="onThumbError(item)"
              />
              <view v-else class="draft-fallback">
                <text class="fallback-emoji">🖼️</text>
              </view>
            </view>
            <view class="draft-name">{{ item.name }}</view>
            <view class="heart">♡</view>
          </view>
        </view>

        <view v-if="filterList.length === 0" class="empty-tip">
          没有找到相关线稿 🥺
        </view>

        <view class="footer-tip">✨ 更多线稿持续更新中...</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
/* =====================================================================
 * pages/gallery/gallery.vue —— 内置线稿库
 * Vue 3 Composition API（<script setup>）
 * ===================================================================== */
import { ref, computed } from 'vue'

/* =====================================================================
 * 1) 自定义导航栏：状态栏高度 + 胶囊避让
 *    - statusBarHeight: 状态栏占位高度（px）
 *    - headerStyle: 胶囊行高度 + 右侧留出胶囊宽度（避免遮挡）
 * ===================================================================== */
const statusBarHeight = ref(0)
const headerStyle = ref({})

try {
  const _info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
  statusBarHeight.value = _info.statusBarHeight || 0

  const capsule = uni.getMenuButtonBoundingClientRect
    ? uni.getMenuButtonBoundingClientRect()
    : null
  if (capsule && capsule.top && capsule.bottom) {
    const capsuleH = capsule.bottom - capsule.top
    // 胶囊行高度 = 胶囊高度；右侧 padding 留出胶囊宽度，避免标题撞到胶囊
    headerStyle.value = {
      height: capsuleH + 'px',
      paddingRight: (_info.windowWidth - capsule.left + 4) + 'px'
    }
  } else {
    headerStyle.value = { height: '44px' }
  }
} catch (e) {
  statusBarHeight.value = 0
  headerStyle.value = { height: '44px' }
}

/* =====================================================================
 * 2) 搜索关键字 + 顶部 Tab + 当前分类
 * ===================================================================== */
const showSearch = false
const keyword = ref('')
const topTabs = ['全部', '最新']
const activeTab = ref(0)
// 当前选中分类：-1 表示「全部」，>=0 对应 categoryList 索引
const activeCategory = ref(-1)

/* =====================================================================
 * 3) 分类列表（左侧菜单数据）
 * ===================================================================== */
const categoryList = [
  { name: '可爱', icon: '🐰' },
  { name: '奇幻', icon: '🦄' },
  { name: '动物', icon: '🦁' },
  { name: '人物', icon: '👧' },
  { name: '童话', icon: '🏰' },
  { name: '植物', icon: '🌷' },
  { name: '食物', icon: '🎂' },
  { name: '交通', icon: '🚗' },
  { name: '节日', icon: '🎨' },
  { name: '其他', icon: '⭐' }
]

/* =====================================================================
 * 4) 线稿数据
 *    - flower / Airplane 使用项目内真实资源（src/static/linearts/）
 *    - 其余条目暂时保留占位图路径，加载失败时由 onThumbError 切到占位
 * ===================================================================== */
const draftList = [
  { name: '端午节主题',   img: '/static/linearts/dragon-boat-theme.jpg' },
  { name: '端午节涂色',   img: '/static/linearts/dragon-boat-coloring.jpg' },
  { name: '花朵',         img: '/static/linearts/flower.jpg' },
  { name: '飞机',         img: '/static/linearts/Airplane.jpg' },
  { name: '奥特曼',       img: '/static/linearts/ultraman.jpg' },
  { name: '儿童简笔画',   img: '/static/linearts/kids-sketch.jpg' },
  { name: '大耳朵图图',   img: '/static/linearts/big-ear-tutu.jpg' },
  { name: '疯狂动物城',   img: '/static/linearts/zootopia.jpg' },
  { name: '蛋仔',         img: '/static/linearts/eggy-party.jpg' },
  { name: '蛋糕',         img: '/static/linearts/cake.jpg' }
]

/* 缩略图加载失败记录：path -> true，模板自动切到 emoji 占位 */
const failedThumbs = ref({})

function onThumbError(item) {
  if (!item || !item.img) return
  console.warn('[Gallery] 线稿缩略图加载失败:', item.img)
  failedThumbs.value[item.img] = true
}

/* =====================================================================
 * 5) 过滤列表：按关键字模糊匹配名称
 *    （分类暂未参与过滤，draftList 数据未带 category 字段；后续补齐）
 * ===================================================================== */
const filterList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return draftList
  return draftList.filter(item => item.name.includes(kw))
})

/* =====================================================================
 * 6) 交互：返回 / 跳转绘画页
 * ===================================================================== */
function goBack() {
  uni.navigateBack()
}

function goPaint(item) {
  if (!item || !item.img) return
  // 用 encodeURIComponent 编码路径，避免特殊字符导致 query 解析失败
  uni.navigateTo({
    url: '/pages/paint/paint?img=' + encodeURIComponent(item.img)
  })
}
</script>

<style lang="scss" scoped>
/* =====================================================================
 * 设计语言：与首页/绘画页保持一致
 *   - 主色：#7b61ff
 *   - 背景：#f7f7fb
 *   - 卡片：白底 + 大圆角
 * ===================================================================== */

$color-primary:   #7b61ff;
$color-primary-2: #efe8ff;
$color-bg:        #f7f7fb;
$color-card:      #ffffff;
$color-text:      #1f1f2c;
$color-sub:       #8a8aa3;

page {
  background: $color-bg;
}

.page {
  min-height: 100vh;
  padding: 0 24rpx 24rpx;
  box-sizing: border-box;
  background: $color-bg;
  font-family: 'PingFang SC', 'PingFangSC-Regular', sans-serif;
}

/* ---------- 顶部胶囊行 ---------- */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* height / paddingRight 由 headerStyle 动态注入 */
}

.left-box {
  display: flex;
  align-items: center;
  height: 100%;
}

.back {
  width: 64rpx;
  height: 64rpx;
  background: $color-primary-2;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-primary;

  .back-icon {
    font-size: 44rpx;
    line-height: 1;
    font-weight: 700;
    margin-top: -4rpx;
  }
}

.hover-light {
  opacity: 0.7;
}

.title {
  font-size: 36rpx;
  font-weight: 800;
  margin-left: 20rpx;
  color: $color-text;
  letter-spacing: 1rpx;
}

/* ---------- 搜索框 ---------- */
.search-box {
  height: 80rpx;
  background: $color-card;
  border-radius: 40rpx;
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  box-shadow: 0 4rpx 14rpx rgba(123, 97, 255, 0.05);

  .search-icon {
    font-size: 30rpx;
    color: #aaa;
  }

  .search-input {
    flex: 1;
    margin-left: 16rpx;
    font-size: 26rpx;
    color: $color-text;
  }

  .search-ph {
    color: #b8b8c8;
  }
}

/* ---------- 顶部 Tab ---------- */
.top-tabs {
  display: flex;
  align-items: center;
  margin-top: 26rpx;
}

.top-tab {
  min-width: 132rpx;
  height: 64rpx;
  padding: 0 24rpx;
  background: $color-card;
  border-radius: 20rpx;
  text-align: center;
  line-height: 64rpx;
  font-size: 26rpx;
  margin-right: 16rpx;
  font-weight: 600;
  color: $color-text;

  &.active {
    background: $color-primary;
    color: #fff;
    box-shadow: 0 6rpx 18rpx rgba(123, 97, 255, 0.28);
  }
}

.layout-btn {
  margin-left: auto;
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: $color-card;
  text-align: center;
  line-height: 64rpx;
  font-size: 32rpx;
  color: $color-primary;
}

/* ---------- 主体：左侧 + 右侧 ---------- */
.content {
  display: flex;
  margin-top: 24rpx;
  /* 视口高度 - 顶部各区域估算高度，保证两侧 scroll-view 有高度 */
  height: calc(100vh - 320rpx);
}

/* 左侧分类菜单 */
.sidebar {
  width: 150rpx;
  flex-shrink: 0;
  height: 100%;
}

.menu-item {
  height: 80rpx;
  line-height: 80rpx;
  padding-left: 16rpx;
  font-size: 26rpx;
  color: #666;
  border-radius: 18rpx;
  margin-bottom: 10rpx;

  &.active {
    background: $color-primary-2;
    color: $color-primary;
    font-weight: bold;
  }
}

/* 右侧线稿网格 */
.draft-scroll {
  flex: 1;
  height: 100%;
  margin-left: 12rpx;
}

.draft-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding: 0 4rpx;
}

.draft-card {
  width: auto;
  background: $color-card;
  border-radius: 22rpx;
  overflow: hidden;
  margin-bottom: 4rpx;
  position: relative;
  padding-bottom: 14rpx;
  box-shadow: 0 4rpx 12rpx rgba(31, 31, 44, 0.04);
  transition: transform 0.18s ease;
}

.card-hover {
  transform: scale(0.96);
}

.draft-thumb {
  width: 100%;
  height: 200rpx;
  background: #f4f4fa;
  position: relative;
  overflow: hidden;

  .draft-img {
    width: 100%;
    height: 100%;
  }

  .draft-fallback {
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

.draft-name {
  font-size: 24rpx;
  padding: 0 14rpx;
  margin-top: 10rpx;
  color: $color-text;
  font-weight: 600;
}

.heart {
  position: absolute;
  right: 14rpx;
  bottom: 12rpx;
  font-size: 26rpx;
  color: #c8c8d4;
}

.empty-tip {
  text-align: center;
  color: $color-sub;
  font-size: 26rpx;
  padding: 60rpx 0 30rpx;
}

.footer-tip {
  text-align: center;
  color: #b39cff;
  font-size: 24rpx;
  padding: 24rpx 0 60rpx;
  letter-spacing: 2rpx;
}
</style>
