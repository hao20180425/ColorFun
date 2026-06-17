<!--
  pages/paint/paint.vue
  ----------------------------------------------------------------
  绘画 / 填色页面
  ----------------------------------------------------------------
  功能要点：
    1. Canvas 2D 接口（type="2d"）+ DPR 适配，保证移动端清晰度
    2. 支持两种模式：
       - brush  自由画笔（touchstart / touchmove / touchend）
       - fill   油漆桶填色（touchstart，调用 floodFill 算法）
    3. 顶部操作栏：返回 / 标题 / 清空 / 保存
    4. 颜色面板：14 色圆形色块，选中态紫色描边 + 放大
    5. 线宽滑块：2 ~ 20
    6. 保存到相册：本页 saveCanvas 内实现
-->
<template>
  <view class="paint-page">
    <!-- 状态栏占位：高度 = 系统状态栏高度 -->
    <view :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 胶囊行：高度与微信胶囊等高，返回按钮 + 标题在左侧，右侧留给胶囊 -->
    <view class="nav-row" :style="navRowStyle">
      <view class="top-bar-left">
        <view class="back" hover-class="hover-light" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="title">填色 ✨</view>
      </view>
    </view>

    <!-- 按钮行：在胶囊下方，清空和保存向右对齐 -->
    <view class="action-row" :style="actionRowStyle">
      <view class="action-btn" hover-class="hover-light" @tap="clearCanvas">
        <view class="action-icon-box clear-box">
          <text class="action-icon">🗑️</text>
        </view>
        <text class="action-label clear-label">清空</text>
      </view>
      <view class="action-btn" hover-class="hover-light" @tap="saveCanvas">
        <view class="action-icon-box save-box">
          <text class="action-icon">💾</text>
        </view>
        <text class="action-label save-label">保存</text>
      </view>
    </view>

    <!-- ============ 画布卡片 ============ -->
    <view class="canvas-box">
      <canvas
        type="2d"
        id="bindpaintCanvas"
        class="canvas"
        disable-scroll="true"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchCancel"
      ></canvas>
    </view>

    <!-- ============ 模式切换栏 ============ -->
    <view class="mode-bar">
      <view
        class="mode-btn"
        :class="{ active: currentMode === 'brush' }"
        @tap="currentMode = 'brush'"
      >
        <text class="mode-icon">✏️</text>
        <text class="mode-text">画笔</text>
      </view>
      <view
        class="mode-btn"
        :class="{ active: currentMode === 'fill' }"
        @tap="currentMode = 'fill'"
      >
        <text class="mode-icon">🪣</text>
        <text class="mode-text">填色</text>
      </view>
    </view>

    <!-- ============ 颜色面板 ============ -->
    <view class="color-panel">
      <view
        v-for="(item, index) in colors"
        :key="index"
        class="color-item"
        :class="{ active: currentColor.toLowerCase() === item.toLowerCase() }"
        :style="{ background: item }"
        @tap="changeColor(item)"
      ></view>
    </view>

    <!-- ============ 线宽滑块（仅画笔模式） ============ -->
    <view v-if="currentMode === 'brush'" class="slider-box">
      <text class="slider-label">粗细</text>
      <slider
        class="slider"
        :value="lineWidth"
        :min="2"
        :max="20"
        :step="1"
        block-size="20"
        activeColor="#7b61ff"
        backgroundColor="#e6e0ff"
        block-color="#7b61ff"
        @changing="changeWidth"
        @change="changeWidth"
      />
      <text class="slider-value">{{ lineWidth }}</text>
    </view>
  </view>
</template>

<script setup>
/* eslint-disable camelcase */
import { ref, getCurrentInstance, nextTick, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createFloodFillTask } from '@/utils/floodFill.js'

/* =====================================================================
 * 响应式状态
 * ===================================================================== */

// 状态栏高度（px）
const statusBarHeight = ref(0)
// 胶囊行：高度与微信胶囊等高，返回+标题与胶囊垂直对齐
const navRowStyle = ref({})
// 按钮行：在胶囊下方，向右对齐到胶囊右边
const actionRowStyle = ref({})
try {
  const _info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
  statusBarHeight.value = _info.statusBarHeight || 0

  const capsule = uni.getMenuButtonBoundingClientRect ? uni.getMenuButtonBoundingClientRect() : null
  if (capsule && capsule.top && capsule.bottom) {
    const capsuleH = capsule.bottom - capsule.top
    // 胶囊行高度 = 胶囊高度，右侧留出胶囊左边的空间
    navRowStyle.value = {
      height: capsuleH + 'px',
      paddingRight: (_info.windowWidth - capsule.left + 4) + 'px'
    }
    // 按鈕行右边距 = 屏幕宽 - 胶囊右边，将按鈕对齐到胶囊右边
    actionRowStyle.value = {
      paddingRight: (_info.windowWidth - capsule.right) + 'px'
    }
  } else {
    navRowStyle.value = { height: '44px' }
    actionRowStyle.value = { paddingRight: '12px' }
  }
} catch (e) {
  statusBarHeight.value = 0
  navRowStyle.value = { height: '44px' }
  actionRowStyle.value = { paddingRight: '12px' }
}

// 当前模式：'brush' 自由画笔 | 'fill' 油漆桶
const currentMode = ref('brush')

// 当前画笔颜色（默认主题紫）
const currentColor = ref('#7B61FF')

// 当前线宽（CSS 像素，2 ~ 20）
const lineWidth = ref(6)

// 是否正在绘制中（仅画笔模式使用）
const isDrawing = ref(false)

// 颜色面板（14 色，参考设计图 2）
const colors = [
  '#FFFFFF', '#FF6B6B', '#FF922B', '#FFD93D',
  '#6BCB77', '#00D2D3', '#845EF7',
  '#FFB5B5', '#FFCBA4', '#DEB887', '#A0522D',
  '#8B4513', '#95A5A6', '#000000'
]


/* =====================================================================
 * Canvas 相关：使用普通变量保存（避免 ref 包装大对象带来的代理开销）
 * ===================================================================== */
let ctx = null              // Canvas 2D 上下文
let canvasNode = null       // <canvas type="2d"> 的原生节点
let canvasWidth = 0         // 物理像素宽（CSS 宽 * dpr）
let canvasHeight = 0        // 物理像素高
let cssWidth = 0            // CSS 像素宽（用于触摸坐标转换）
let cssHeight = 0           // CSS 像素高
let dpr = 1                 // 设备像素比（上限 2，避免 3x 屏像素过多触发 timeout）
const MAX_DPR = 2

let currentImgPath = ''     // 当前加载的线稿路径
let lineArtImage = null     // 缓存线稿 Image，用于笔触后重绘线条
let lineArtRect = null      // 线稿在画布上的位置与尺寸（CSS 像素）
let lineArtLoadId = 0       // 线稿加载版本号，防止异步竞态
let initRetries = 0         // 画布初始化重试次数
let initTimer = null        // 初始化延迟定时器
let fillBusy = false        // 填色进行中，防止连点叠加阻塞
let brushMoved = false      // 当前笔触是否发生移动（用于单击画点）
let brushStartPoint = null  // 起笔坐标（用于 touchend 画点）
const instance = getCurrentInstance()

/* =====================================================================
 * 生命周期
 * ===================================================================== */

// 接收上一个页面（画廊）传入的线稿路径
onLoad((options) => {
  if (options && options.img) {
    // 路径在传递前已被 encodeURIComponent，需要解码
    currentImgPath = decodeURIComponent(options.img)
  }
})

// onMounted 后初始化 Canvas（需等待节点渲染完成）
onMounted(() => {
  setupSavePrivacyListener()
  nextTick(() => {
    initTimer = setTimeout(() => {
      initTimer = null
      initCanvas()
    }, 300)
  })
})

onUnmounted(() => {
  if (initTimer) {
    clearTimeout(initTimer)
    initTimer = null
  }
  lineArtLoadId += 1
  fillBusy = false
  isDrawing.value = false
})

/* =====================================================================
 * Canvas 初始化
 * ===================================================================== */

/**
 * 初始化 Canvas 2D：
 *   1. 通过 SelectorQuery 获取节点 + 上下文
 *   2. 根据屏幕 DPR 设置物理像素分辨率
 *   3. ctx.scale(dpr, dpr) 让后续绘制按 CSS 像素坐标即可
 *   4. 铺白色背景，加载线稿
 */
function initCanvas() {
  // 获取设备像素比
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    dpr = Math.min(info.pixelRatio || 1, MAX_DPR)
  } catch (e) {
    dpr = 1
  }

  const query = uni.createSelectorQuery().in(instance.proxy)
  query
    .select('#bindpaintCanvas')
    .fields({ node: true, size: true })
    .exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        if (initRetries < 3) {
          initRetries += 1
          setTimeout(initCanvas, 200)
          return
        }
        uni.showToast({ title: '画布初始化失败', icon: 'none' })
        return
      }

      const nextCssWidth = res[0].width
      const nextCssHeight = res[0].height
      if (!nextCssWidth || !nextCssHeight) {
        if (initRetries < 3) {
          initRetries += 1
          setTimeout(initCanvas, 200)
          return
        }
        uni.showToast({ title: '画布尺寸异常', icon: 'none' })
        return
      }

      initRetries = 0
      canvasNode = res[0].node
      ctx = canvasNode.getContext('2d')
      cssWidth = nextCssWidth
      cssHeight = nextCssHeight

      // 物理像素尺寸 = CSS 像素 * DPR
      canvasWidth = Math.floor(cssWidth * dpr)
      canvasHeight = Math.floor(cssHeight * dpr)
      canvasNode.width = canvasWidth
      canvasNode.height = canvasHeight

      // 让后续绘制 API 使用 CSS 像素坐标系
      ctx.scale(dpr, dpr)

      // 默认笔触样式：圆头 + 圆角连接，避免锯齿
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // 铺白色背景（物理像素层面铺满）
      fillWhiteBackground()

      // 加载线稿（如果有）
      if (currentImgPath) {
        loadLineArt(currentImgPath)
      }
    })
}

/**
 * 填充白色背景（按 CSS 像素铺，scale 已应用）
 */
function fillWhiteBackground() {
  if (!ctx) return
  ctx.save()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, cssWidth, cssHeight)
  ctx.restore()
}

/* =====================================================================
 * 线稿加载与适配绘制
 * ===================================================================== */

/**
 * 加载线稿并按 contain 模式居中绘制到画布
 * @param {string} localPath 本地图片路径（assets 目录）
 */
function loadLineArt(localPath) {
  if (!ctx || !canvasNode) return
  const loadId = ++lineArtLoadId
  const img = canvasNode.createImage()
  img.onload = () => {
    if (loadId !== lineArtLoadId) return
    lineArtImage = img
    drawLineArt('source-over')
  }
  img.onerror = () => {
    if (loadId !== lineArtLoadId) return
    uni.showToast({ title: '线稿加载失败', icon: 'none' })
  }
  img.src = localPath
}

/**
 * 绘制线稿（contain 居中）
 * @param {'source-over'|'darken'} compositeMode 初次铺图用 source-over；笔触后用 darken 只压回黑线
 */
function drawLineArt(compositeMode) {
  if (!ctx || !lineArtImage) return
  const iw = lineArtImage.width
  const ih = lineArtImage.height
  if (!iw || !ih) return

  const scale = Math.min(cssWidth / iw, cssHeight / ih)
  const drawW = iw * scale
  const drawH = ih * scale
  const dx = (cssWidth - drawW) / 2
  const dy = (cssHeight - drawH) / 2
  lineArtRect = { dx, dy, drawW, drawH }

  ctx.save()
  if (compositeMode !== 'source-over') {
    ctx.globalCompositeOperation = compositeMode
  }
  ctx.drawImage(lineArtImage, dx, dy, drawW, drawH)
  ctx.restore()
}

/** 笔触/填色后重绘线稿，darken 模式保留用户颜色、只恢复黑色线条 */
function overlayLineArt() {
  if (!lineArtImage || !lineArtRect) return
  drawLineArt('darken')
}

/* =====================================================================
 * 画笔模式：触摸事件
 * ===================================================================== */

/**
 * 从触摸事件中提取相对画布的 CSS 像素坐标
 * （Canvas 2D 中 touch.x / touch.y 已是相对画布的 CSS 像素）
 */
function getTouchPos(e) {
  if (e.touches && e.touches.length > 1) return null
  const t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0])
  if (!t) return null
  return { x: t.x, y: t.y }
}

function onTouchStart(e) {
  if (!ctx) return
  if (e.touches && e.touches.length > 1) return

  // 填色模式：在 touchstart 中处理（而非 tap），因为 touches[0].x/y 是精确的画布相对坐标
  if (currentMode.value === 'fill') {
    const p = getTouchPos(e)
    if (!p) return
    doFloodFill(p.x, p.y)
    return
  }

  // 画笔模式
  if (currentMode.value !== 'brush') return
  const p = getTouchPos(e)
  if (!p) return
  isDrawing.value = true
  brushMoved = false
  brushStartPoint = p

  ctx.lineWidth = lineWidth.value
  ctx.strokeStyle = currentColor.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
}

function onTouchMove(e) {
  if (currentMode.value !== 'brush' || !ctx || !isDrawing.value) return
  if (e.touches && e.touches.length > 1) return
  const p = getTouchPos(e)
  if (!p) return

  brushMoved = true
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  overlayLineArt()
}

function drawBrushDot(x, y) {
  if (!ctx) return
  const radius = lineWidth.value / 2
  ctx.save()
  ctx.fillStyle = currentColor.value
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function onTouchEnd(e) {
  if (currentMode.value !== 'brush') return
  if (isDrawing.value && !brushMoved && ctx) {
    const p = getTouchPos(e) || brushStartPoint
    if (p) {
      drawBrushDot(p.x, p.y)
      overlayLineArt()
    }
  }
  isDrawing.value = false
  brushMoved = false
  brushStartPoint = null
  if (ctx) ctx.beginPath()
}

function onTouchCancel() {
  if (currentMode.value !== 'brush') return
  isDrawing.value = false
  brushMoved = false
  brushStartPoint = null
  if (ctx) ctx.beginPath()
}

/* =====================================================================
 * 油漆桶模式：泛洪填充
 * =====================================================================
 * 改用 touchstart 中的 touches[0].x/y 作为坐标源，
 * 因为在微信小程序 Canvas 2D 中：
 *   - touches[0].x/y 是相对画布的 CSS 像素坐标（准确）
 *   - @tap 的 e.detail.x/y 可能是页面级坐标（有偏移）
 */

/**
 * 执行泛洪填充
 * @param {number} cx CSS 像素 x 坐标（相对画布）
 * @param {number} cy CSS 像素 y 坐标（相对画布）
 */
function doFloodFill(cx, cy) {
  if (fillBusy || !ctx) return

  const px = Math.floor(cx * dpr)
  const py = Math.floor(cy * dpr)

  if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) return

  let imageData
  try {
    imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  } catch (err) {
    uni.showToast({ title: '读取像素失败', icon: 'none' })
    return
  }

  const fillRGBA = hexToRGBA(currentColor.value)
  const task = createFloodFillTask(
    imageData.data,
    canvasWidth,
    canvasHeight,
    px,
    py,
    fillRGBA,
    12
  )

  if (!task) {
    return
  }

  fillBusy = true

  function runBatch() {
    const done = task.step()
    if (!done) {
      setTimeout(runBatch, 0)
      return
    }
    try {
      ctx.putImageData(imageData, 0, 0)
      overlayLineArt()
    } catch (err) {
      uni.showToast({ title: '填色失败', icon: 'none' })
    }
    fillBusy = false
  }

  setTimeout(runBatch, 0)
}

/* =====================================================================
 * 工具函数：颜色解析
 * ===================================================================== */

/**
 * 将 #RRGGBB / #RGB 颜色字符串解析为 [R, G, B, A] 数组
 * 解析失败返回黑色 [0, 0, 0, 255]
 */
function hexToRGBA(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 0, 255]
  let h = hex.trim().replace(/^#/, '')
  // 短格式 #RGB -> 扩展
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('')
  }
  if (h.length !== 6) return [0, 0, 0, 255]
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return [0, 0, 0, 255]
  }
  return [r, g, b, 255]
}

/* =====================================================================
 * UI 事件
 * ===================================================================== */

function changeColor(color) {
  currentColor.value = color
}

function changeWidth(e) {
  lineWidth.value = Number(e.detail.value)
}

/**
 * 清空画布：物理像素层面清除 -> 重铺白底 -> 重新加载线稿
 */
function clearCanvas() {
  if (!ctx) return
  lineArtLoadId += 1
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.restore()

  fillWhiteBackground()

  if (lineArtImage) {
    drawLineArt('source-over')
  } else if (currentImgPath) {
    loadLineArt(currentImgPath)
  }

  uni.showToast({ title: '已清空', icon: 'none' })
}

/* =====================================================================
 * 保存到相册
 * ===================================================================== */

const ALBUM_SCOPE = 'scope.writePhotosAlbum'
let privacyResolve = null
let privacyListenerReady = false

function getWx() {
  // #ifdef MP-WEIXIN
  return typeof wx !== 'undefined' ? wx : null
  // #endif
  // #ifndef MP-WEIXIN
  return null
  // #endif
}

function setupSavePrivacyListener() {
  if (privacyListenerReady) return
  // #ifdef MP-WEIXIN
  const wxApi = getWx()
  if (!wxApi || !wxApi.onNeedPrivacyAuthorization) return
  wxApi.onNeedPrivacyAuthorization((resolve) => {
    privacyResolve = resolve
    uni.showModal({
      title: '用户隐私保护提示',
      content: '保存图片等功能需要您阅读并同意《用户隐私保护指引》',
      confirmText: '同意',
      cancelText: '拒绝',
      success: (res) => {
        if (!privacyResolve) return
        privacyResolve({ event: res.confirm ? 'agree' : 'disagree' })
        privacyResolve = null
      },
      fail: () => {
        if (privacyResolve) {
          privacyResolve({ event: 'disagree' })
          privacyResolve = null
        }
      }
    })
  })
  privacyListenerReady = true
  // #endif
}

function requirePrivacyAuthorize() {
  return new Promise((resolve, reject) => {
    const wxApi = getWx()
    if (wxApi && wxApi.requirePrivacyAuthorize) {
      wxApi.requirePrivacyAuthorize({
        success: () => resolve(),
        fail: (err) => reject(err || { errMsg: 'requirePrivacyAuthorize:fail' })
      })
      return
    }
    resolve()
  })
}

function getAlbumAuthStatus() {
  return new Promise((resolve, reject) => {
    uni.getSetting({
      success: (res) => {
        const authSetting = res.authSetting || {}
        resolve(authSetting[ALBUM_SCOPE])
      },
      fail: (err) => reject(err || { errMsg: 'getSetting:fail' })
    })
  })
}

function requestAlbumAuthorize() {
  return new Promise((resolve, reject) => {
    uni.authorize({
      scope: ALBUM_SCOPE,
      success: () => resolve(),
      fail: (err) => reject(err || { errMsg: 'authorize:fail' })
    })
  })
}

function promptOpenSetting() {
  return new Promise((resolve, reject) => {
    uni.showModal({
      title: '授权提示',
      content: '需要您授权保存图片到相册，是否去设置中打开？',
      success: (modalRes) => {
        if (!modalRes.confirm) {
          reject({ errMsg: 'auth deny', handled: true })
          return
        }
        uni.openSetting({
          success: (settingRes) => {
            const authSetting = settingRes.authSetting || {}
            if (authSetting[ALBUM_SCOPE]) {
              resolve()
              return
            }
            uni.showToast({ title: '您拒绝了授权', icon: 'none' })
            reject({ errMsg: 'auth deny', handled: true })
          },
          fail: (err) => reject(err || { errMsg: 'openSetting:fail' })
        })
      }
    })
  })
}

function ensureAlbumAuth() {
  return getAlbumAuthStatus().then((authStatus) => {
    if (authStatus === true) return
    if (authStatus === false) return promptOpenSetting()
    return requestAlbumAuthorize().catch((err) => {
      uni.showToast({ title: '授权失败，无法保存', icon: 'none' })
      return Promise.reject(err)
    })
  })
}

function saveFileToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (err) => reject(err || { errMsg: 'saveImageToPhotosAlbum:fail' })
    })
  })
}

function showSaveError(err) {
  if (err && err.handled) return
  const msg = (err && err.errMsg) || ''
  if (msg.indexOf('privacy') >= 0 || msg.indexOf('banned') >= 0 || msg.indexOf('not declared') >= 0) {
    uni.showModal({
      title: '需要隐私授权',
      content: '保存图片需同意《用户隐私保护指引》。请阅读并同意隐私协议后重试。',
      confirmText: '查看协议',
      success: (res) => {
        if (!res.confirm) return
        const wxApi = getWx()
        if (wxApi && wxApi.openPrivacyContract) wxApi.openPrivacyContract()
      }
    })
    return
  }
  if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0) {
    uni.showModal({
      title: '需要相册权限',
      content: '请在设置中允许保存图片到相册',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) uni.openSetting()
      }
    })
    return
  }
  uni.showToast({ title: '保存失败', icon: 'none' })
}

function saveImageToAlbum(filePath) {
  uni.showLoading({ title: '正在保存...', mask: true })
  return requirePrivacyAuthorize()
    .then(() => ensureAlbumAuth())
    .then(() => saveFileToAlbum(filePath))
    .then(() => {
      uni.showToast({ title: '保存成功', icon: 'success' })
    })
    .catch((err) => {
      showSaveError(err)
      return Promise.reject(err)
    })
    .finally(() => {
      uni.hideLoading()
    })
}

function saveCanvas() {
  if (!canvasNode) {
    uni.showToast({ title: '画布未就绪', icon: 'none' })
    return
  }
  uni.canvasToTempFilePath(
    {
      canvas: canvasNode,
      x: 0,
      y: 0,
      width: cssWidth,
      height: cssHeight,
      destWidth: Math.floor(cssWidth * dpr),
      destHeight: Math.floor(cssHeight * dpr),
      fileType: 'png',
      success: (res) => {
        saveImageToAlbum(res.tempFilePath).catch(() => {})
      },
      fail: () => {
        uni.showToast({ title: '导出失败', icon: 'none' })
      }
    },
    instance.proxy
  )
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
/* ============ 页面容器 ============ */
.paint-page {
  min-height: 100vh;  /* 最小满屏，内容超出则自然延伸，不产生底部空白 */
  background: #f7f7fb;
  padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx);
  box-sizing: border-box;
}

/* ============ 胶囊行：返回 + 标题，与胶囊等高 ============ */
.nav-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-left: 24rpx;
  box-sizing: border-box;
  /* height 和 paddingRight 由 JS 动态设置 */
}

/* 左侧：返回按钮 + 标题 */
.top-bar-left {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.back {
  width: 70rpx;
  height: 70rpx;
  background: #eee7ff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-icon {
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1;
  color: #7b61ff;
  margin-top: -4rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f1b3a;
  margin-left: 20rpx;
}

/* ============ 按钮行：清空 + 保存，在胶囊下方右对齐 ============ */
.action-row {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;  /* 向右对齐 */
  align-items: flex-start;
  padding: 20rpx 0 24rpx;
  box-sizing: border-box;
  /* paddingRight 由 JS 动态设置，对齐胶囊右边 */
}

/* 单个竖排图标按钮 */
.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-left: 20rpx;
}

/* 图标圆角方块 */
.action-icon-box {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-box {
  background: #ffe6e6;
}

.save-box {
  background: #eee7ff;
}

.action-icon {
  font-size: 40rpx;
  line-height: 1;
}

.action-label {
  font-size: 24rpx;
  margin-top: 8rpx;
  font-weight: 500;
}

.clear-label {
  color: #ff4d4f;
}

.save-label {
  color: #7b61ff;
}

.hover-light {
  opacity: 0.7;
}

/* ============ 画布卡片 ============ */
.canvas-box {
  height: 50vh;
  margin: 20rpx 24rpx;
  background: #ffffff;
  border-radius: 40rpx;
  overflow: hidden;
  position: relative;
  box-shadow: 0 8rpx 32rpx rgba(123, 97, 255, 0.08);
}

.canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* ============ 模式切换栏 ============ */
.mode-bar {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 16rpx 0 12rpx;
}

.mode-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 200rpx;
  height: 80rpx;
  border-radius: 40rpx;
  margin: 0 8rpx;
  background: #ffffff;
  color: #888888;
  border: 2rpx solid #e0e0e8;
  box-sizing: border-box;
}

.mode-btn.active {
  background: #7b61ff;
  color: #ffffff;
  border-color: #7b61ff;
  box-shadow: 0 8rpx 20rpx rgba(123, 97, 255, 0.3);
}

.mode-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
  line-height: 1;
}

.mode-text {
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1;
}

/* ============ 颜色面板 ============ */
.color-panel {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-around;
  padding: 16rpx 24rpx 4rpx;
}

/* 88rpx 大圆圈色块，对齐设计图 */
.color-item {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  border: 4rpx solid #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.10);
  margin-bottom: 24rpx;
  box-sizing: border-box;
}

.color-item.active {
  border-color: #7b61ff;
  transform: scale(1.15);
  box-shadow: 0 6rpx 18rpx rgba(123, 97, 255, 0.4);
}

/* ============ 线宽滑块 ============ */
.slider-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 4rpx 32rpx 24rpx;
  padding: 12rpx 24rpx;
  background: #ffffff;
  border-radius: 30rpx;
}

.slider-label {
  font-size: 26rpx;
  color: #666666;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.slider {
  flex: 1;
  margin: 0 8rpx;
}

.slider-value {
  font-size: 26rpx;
  color: #7b61ff;
  font-weight: 600;
  min-width: 40rpx;
  text-align: right;
}
</style>
