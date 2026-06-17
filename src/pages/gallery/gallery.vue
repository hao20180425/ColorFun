<!--
  内置线稿库：搜索 / Tab / 左侧分类 + 右侧网格（分类过滤后续开发）
-->
<template>
  <view class="page">
    <view :style="{ height: statusBarHeight + 'px' }"></view>

    <view class="header" :style="headerStyle">
      <view class="left-box">
        <view class="back" hover-class="hover-light" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="title">内置线稿 ✨</view>
      </view>
    </view>

    <!-- 搜索框（showSearch 控制显示，后续可开启） -->
    <view v-if="showSearch" class="search-box">
      <text class="search-icon">🔍</text>
      <input
        class="search-input"
        placeholder="搜索你喜欢的线稿"
        placeholder-class="search-ph"
        v-model="keyword"
      />
    </view>

    <!-- 顶部 Tab：全部 / 最新 + 布局按钮（Tab 过滤后续开发） -->
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

      <scroll-view class="draft-scroll" scroll-y>
        <view class="draft-grid">
          <view
            v-for="item in filterList"
            :key="item.path"
            class="draft-card"
            hover-class="card-hover"
            @tap="goPaint(item)"
          >
            <view class="draft-thumb">
              <image
                v-if="!failedThumbs[item.path]"
                class="draft-img"
                :src="item.path"
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
import { ref, computed } from 'vue'
import { linearts } from '@/data/linearts.js'

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

const showSearch = false
const keyword = ref('')
const topTabs = ['全部', '最新']
const activeTab = ref(0)
const activeCategory = ref(-1)

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

const failedThumbs = ref({})

function onThumbError(item) {
  if (!item || !item.path) return
  failedThumbs.value[item.path] = true
}

// 当前仅关键字过滤；activeTab / activeCategory 待后续接入
const filterList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return linearts
  return linearts.filter(item => item.name.includes(kw))
})

function goBack() {
  uni.navigateBack()
}

function goPaint(item) {
  if (!item || !item.path) return
  uni.navigateTo({
    url: '/pages/paint/paint?img=' + encodeURIComponent(item.path)
  })
}
</script>

<style lang="scss" scoped>
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

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.content {
  display: flex;
  margin-top: 24rpx;
  height: calc(100vh - 320rpx);
}

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
