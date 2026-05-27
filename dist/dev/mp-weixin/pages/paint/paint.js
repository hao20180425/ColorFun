"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_floodFill = require("../../utils/floodFill.js");
const MAX_DPR = 2;
const _sfc_main = {
  __name: "paint",
  setup(__props) {
    const statusBarHeight = common_vendor.ref(0);
    const navRowStyle = common_vendor.ref({});
    const actionRowStyle = common_vendor.ref({});
    try {
      const _info = common_vendor.index.getWindowInfo ? common_vendor.index.getWindowInfo() : common_vendor.index.getSystemInfoSync();
      statusBarHeight.value = _info.statusBarHeight || 0;
      const capsule = common_vendor.index.getMenuButtonBoundingClientRect ? common_vendor.index.getMenuButtonBoundingClientRect() : null;
      if (capsule && capsule.top && capsule.bottom) {
        const capsuleH = capsule.bottom - capsule.top;
        navRowStyle.value = {
          height: capsuleH + "px",
          paddingRight: _info.windowWidth - capsule.left + 4 + "px"
        };
        actionRowStyle.value = {
          paddingRight: _info.windowWidth - capsule.right + "px"
        };
      } else {
        navRowStyle.value = { height: "44px" };
        actionRowStyle.value = { paddingRight: "12px" };
      }
    } catch (e) {
      statusBarHeight.value = 0;
      navRowStyle.value = { height: "44px" };
      actionRowStyle.value = { paddingRight: "12px" };
    }
    const currentMode = common_vendor.ref("brush");
    const currentColor = common_vendor.ref("#7B61FF");
    const lineWidth = common_vendor.ref(6);
    const isDrawing = common_vendor.ref(false);
    const colors = [
      "#FFFFFF",
      "#FF6B6B",
      "#FF922B",
      "#FFD93D",
      "#6BCB77",
      "#00D2D3",
      "#845EF7",
      "#FFB5B5",
      "#FFCBA4",
      "#DEB887",
      "#A0522D",
      "#8B4513",
      "#95A5A6",
      "#000000"
    ];
    let ctx = null;
    let canvasNode = null;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let cssWidth = 0;
    let cssHeight = 0;
    let dpr = 1;
    let currentImgPath = "";
    let lineArtImage = null;
    let lineArtRect = null;
    let lineArtLoadId = 0;
    let initRetries = 0;
    let initTimer = null;
    let fillBusy = false;
    let brushMoved = false;
    let brushStartPoint = null;
    const instance = common_vendor.getCurrentInstance();
    common_vendor.onLoad((options) => {
      if (options && options.img) {
        currentImgPath = decodeURIComponent(options.img);
      }
    });
    common_vendor.onMounted(() => {
      common_vendor.nextTick$1(() => {
        initTimer = setTimeout(() => {
          initTimer = null;
          initCanvas();
        }, 300);
      });
    });
    common_vendor.onUnmounted(() => {
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }
      lineArtLoadId += 1;
      fillBusy = false;
      isDrawing.value = false;
    });
    function initCanvas() {
      try {
        const info = common_vendor.index.getWindowInfo ? common_vendor.index.getWindowInfo() : common_vendor.index.getSystemInfoSync();
        dpr = Math.min(info.pixelRatio || 1, MAX_DPR);
      } catch (e) {
        dpr = 1;
      }
      const query = common_vendor.index.createSelectorQuery().in(instance.proxy);
      query.select("#bindpaintCanvas").fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          if (initRetries < 3) {
            initRetries += 1;
            setTimeout(initCanvas, 200);
            return;
          }
          common_vendor.index.showToast({ title: "画布初始化失败", icon: "none" });
          return;
        }
        const nextCssWidth = res[0].width;
        const nextCssHeight = res[0].height;
        if (!nextCssWidth || !nextCssHeight) {
          if (initRetries < 3) {
            initRetries += 1;
            setTimeout(initCanvas, 200);
            return;
          }
          common_vendor.index.showToast({ title: "画布尺寸异常", icon: "none" });
          return;
        }
        initRetries = 0;
        canvasNode = res[0].node;
        ctx = canvasNode.getContext("2d");
        cssWidth = nextCssWidth;
        cssHeight = nextCssHeight;
        canvasWidth = Math.floor(cssWidth * dpr);
        canvasHeight = Math.floor(cssHeight * dpr);
        canvasNode.width = canvasWidth;
        canvasNode.height = canvasHeight;
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        fillWhiteBackground();
        if (currentImgPath) {
          loadLineArt(currentImgPath);
        }
      });
    }
    function fillWhiteBackground() {
      if (!ctx) return;
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.restore();
    }
    function loadLineArt(localPath) {
      if (!ctx || !canvasNode) return;
      const loadId = ++lineArtLoadId;
      const img = canvasNode.createImage();
      img.onload = () => {
        if (loadId !== lineArtLoadId) return;
        lineArtImage = img;
        drawLineArt("source-over");
      };
      img.onerror = () => {
        if (loadId !== lineArtLoadId) return;
        common_vendor.index.showToast({ title: "线稿加载失败", icon: "none" });
      };
      img.src = localPath;
    }
    function drawLineArt(compositeMode) {
      if (!ctx || !lineArtImage) return;
      const iw = lineArtImage.width;
      const ih = lineArtImage.height;
      if (!iw || !ih) return;
      const scale = Math.min(cssWidth / iw, cssHeight / ih);
      const drawW = iw * scale;
      const drawH = ih * scale;
      const dx = (cssWidth - drawW) / 2;
      const dy = (cssHeight - drawH) / 2;
      lineArtRect = { dx, dy, drawW, drawH };
      ctx.save();
      if (compositeMode !== "source-over") {
        ctx.globalCompositeOperation = compositeMode;
      }
      ctx.drawImage(lineArtImage, dx, dy, drawW, drawH);
      ctx.restore();
    }
    function overlayLineArt() {
      if (!lineArtImage || !lineArtRect) return;
      drawLineArt("darken");
    }
    function getTouchPos(e) {
      if (e.touches && e.touches.length > 1) return null;
      const t = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0];
      if (!t) return null;
      return { x: t.x, y: t.y };
    }
    function onTouchStart(e) {
      if (!ctx) return;
      if (e.touches && e.touches.length > 1) return;
      if (currentMode.value === "fill") {
        const p2 = getTouchPos(e);
        if (!p2) return;
        doFloodFill(p2.x, p2.y);
        return;
      }
      if (currentMode.value !== "brush") return;
      const p = getTouchPos(e);
      if (!p) return;
      isDrawing.value = true;
      brushMoved = false;
      brushStartPoint = p;
      ctx.lineWidth = lineWidth.value;
      ctx.strokeStyle = currentColor.value;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function onTouchMove(e) {
      if (currentMode.value !== "brush" || !ctx || !isDrawing.value) return;
      if (e.touches && e.touches.length > 1) return;
      const p = getTouchPos(e);
      if (!p) return;
      brushMoved = true;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      overlayLineArt();
    }
    function drawBrushDot(x, y) {
      if (!ctx) return;
      const radius = lineWidth.value / 2;
      ctx.save();
      ctx.fillStyle = currentColor.value;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function onTouchEnd(e) {
      if (currentMode.value !== "brush") return;
      if (isDrawing.value && !brushMoved && ctx) {
        const p = getTouchPos(e) || brushStartPoint;
        if (p) {
          drawBrushDot(p.x, p.y);
          overlayLineArt();
        }
      }
      isDrawing.value = false;
      brushMoved = false;
      brushStartPoint = null;
      if (ctx) ctx.beginPath();
    }
    function onTouchCancel() {
      if (currentMode.value !== "brush") return;
      isDrawing.value = false;
      brushMoved = false;
      brushStartPoint = null;
      if (ctx) ctx.beginPath();
    }
    function doFloodFill(cx, cy) {
      if (fillBusy || !ctx) return;
      const px = Math.floor(cx * dpr);
      const py = Math.floor(cy * dpr);
      if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) return;
      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      } catch (err) {
        common_vendor.index.showToast({ title: "读取像素失败", icon: "none" });
        return;
      }
      const fillRGBA = hexToRGBA(currentColor.value);
      const { task } = utils_floodFill.createFloodFillTask(
        imageData.data,
        canvasWidth,
        canvasHeight,
        px,
        py,
        fillRGBA,
        12
      );
      if (!task) {
        return;
      }
      fillBusy = true;
      function runBatch() {
        const done = task.step();
        if (!done) {
          setTimeout(runBatch, 0);
          return;
        }
        try {
          ctx.putImageData(imageData, 0, 0);
          overlayLineArt();
        } catch (err) {
          common_vendor.index.showToast({ title: "填色失败", icon: "none" });
        }
        fillBusy = false;
      }
      setTimeout(runBatch, 0);
    }
    function hexToRGBA(hex) {
      if (!hex || typeof hex !== "string") return [0, 0, 0, 255];
      let h = hex.trim().replace(/^#/, "");
      if (h.length === 3) {
        h = h.split("").map((c) => c + c).join("");
      }
      if (h.length !== 6) return [0, 0, 0, 255];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
        return [0, 0, 0, 255];
      }
      return [r, g, b, 255];
    }
    function changeColor(color) {
      currentColor.value = color;
    }
    function changeWidth(e) {
      lineWidth.value = Number(e.detail.value);
    }
    function clearCanvas() {
      if (!ctx) return;
      lineArtLoadId += 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
      fillWhiteBackground();
      if (lineArtImage) {
        drawLineArt("source-over");
      } else if (currentImgPath) {
        loadLineArt(currentImgPath);
      }
      common_vendor.index.showToast({ title: "已清空", icon: "none" });
    }
    function saveCanvas() {
      if (!canvasNode) {
        common_vendor.index.showToast({ title: "画布未就绪", icon: "none" });
        return;
      }
      common_vendor.index.canvasToTempFilePath(
        {
          canvas: canvasNode,
          x: 0,
          y: 0,
          width: cssWidth,
          height: cssHeight,
          destWidth: Math.floor(cssWidth * dpr),
          destHeight: Math.floor(cssHeight * dpr),
          fileType: "png",
          success: (res) => {
            common_vendor.index.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                common_vendor.index.showToast({ title: "保存成功" });
              },
              fail: (err) => {
                const isAuth = err && err.errMsg && err.errMsg.indexOf("auth") >= 0;
                if (isAuth) {
                  common_vendor.index.showModal({
                    title: "需要相册权限",
                    content: "请在设置中允许保存图片到相册",
                    confirmText: "去设置",
                    success: (modalRes) => {
                      if (modalRes.confirm) {
                        common_vendor.index.openSetting();
                      }
                    }
                  });
                  return;
                }
                common_vendor.index.showToast({ title: "保存失败", icon: "none" });
              }
            });
          },
          fail: () => {
            common_vendor.index.showToast({ title: "导出失败", icon: "none" });
          }
        },
        instance.proxy
      );
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: statusBarHeight.value + "px",
        b: common_vendor.o(goBack, "33"),
        c: common_vendor.s(navRowStyle.value),
        d: common_vendor.o(clearCanvas, "9e"),
        e: common_vendor.o(saveCanvas, "4f"),
        f: common_vendor.s(actionRowStyle.value),
        g: common_vendor.o(onTouchStart, "12"),
        h: common_vendor.o(onTouchMove, "a6"),
        i: common_vendor.o(onTouchEnd, "52"),
        j: common_vendor.o(onTouchCancel, "0b"),
        k: currentMode.value === "brush" ? 1 : "",
        l: common_vendor.o(($event) => currentMode.value = "brush", "4f"),
        m: currentMode.value === "fill" ? 1 : "",
        n: common_vendor.o(($event) => currentMode.value = "fill", "0b"),
        o: common_vendor.f(colors, (item, index, i0) => {
          return {
            a: index,
            b: currentColor.value.toLowerCase() === item.toLowerCase() ? 1 : "",
            c: item,
            d: common_vendor.o(($event) => changeColor(item), index)
          };
        }),
        p: currentMode.value === "brush"
      }, currentMode.value === "brush" ? {
        q: lineWidth.value,
        r: common_vendor.o(changeWidth, "e3"),
        s: common_vendor.o(changeWidth, "fc"),
        t: common_vendor.t(lineWidth.value)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-d0d3b748"]]);
wx.createPage(MiniProgramPage);
