"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const builtinLinearts = [
      { name: "花朵", path: "/static/linearts/flower.jpg" },
      { name: "飞机", path: "/static/linearts/Airplane.jpg" }
    ];
    const failedThumbs = common_vendor.ref({});
    function chooseAlbum() {
      common_vendor.index.chooseImage({
        count: 1,
        sourceType: ["album"],
        success: (res) => {
          const imgPath = res && res.tempFilePaths && res.tempFilePaths[0];
          if (!imgPath) return;
          common_vendor.index.navigateTo({
            url: "/pages/paint/paint?img=" + encodeURIComponent(imgPath)
          });
        },
        fail: (err) => {
          if (err && err.errMsg && !/cancel/i.test(err.errMsg)) {
            console.error("[Album] 选图失败:", err);
            common_vendor.index.showToast({ title: "打开相册失败", icon: "none" });
          }
        }
      });
    }
    function goPaint(item) {
      if (!item || !item.path) return;
      common_vendor.index.navigateTo({
        url: "/pages/paint/paint?img=" + encodeURIComponent(item.path)
      });
    }
    function goGallery() {
      common_vendor.index.navigateTo({
        url: "/pages/gallery/gallery"
      });
    }
    function onThumbError(item) {
      if (!item || !item.path) return;
      console.warn("[Thumb] 缩略图加载失败:", item.path);
      failedThumbs.value[item.path] = true;
    }
    return (_ctx, _cache) => {
      return {
        a: common_vendor.o(chooseAlbum, "c1"),
        b: common_vendor.o(goGallery, "dd"),
        c: common_vendor.f(builtinLinearts, (item, k0, i0) => {
          return common_vendor.e({
            a: !failedThumbs.value[item.path]
          }, !failedThumbs.value[item.path] ? {
            b: item.path,
            c: common_vendor.o(($event) => onThumbError(item), item.path)
          } : {}, {
            d: common_vendor.t(item.name),
            e: item.path,
            f: common_vendor.o(($event) => goPaint(item), item.path)
          });
        })
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-83a5a03c"]]);
wx.createPage(MiniProgramPage);
