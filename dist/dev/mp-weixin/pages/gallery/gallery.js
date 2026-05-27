"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "gallery",
  setup(__props) {
    const statusBarHeight = common_vendor.ref(0);
    const headerStyle = common_vendor.ref({});
    try {
      const _info = common_vendor.index.getWindowInfo ? common_vendor.index.getWindowInfo() : common_vendor.index.getSystemInfoSync();
      statusBarHeight.value = _info.statusBarHeight || 0;
      const capsule = common_vendor.index.getMenuButtonBoundingClientRect ? common_vendor.index.getMenuButtonBoundingClientRect() : null;
      if (capsule && capsule.top && capsule.bottom) {
        const capsuleH = capsule.bottom - capsule.top;
        headerStyle.value = {
          height: capsuleH + "px",
          paddingRight: _info.windowWidth - capsule.left + 4 + "px"
        };
      } else {
        headerStyle.value = { height: "44px" };
      }
    } catch (e) {
      statusBarHeight.value = 0;
      headerStyle.value = { height: "44px" };
    }
    const keyword = common_vendor.ref("");
    const topTabs = ["全部", "最新"];
    const activeTab = common_vendor.ref(0);
    const activeCategory = common_vendor.ref(-1);
    const categoryList = [
      { name: "可爱", icon: "🐰" },
      { name: "奇幻", icon: "🦄" },
      { name: "动物", icon: "🦁" },
      { name: "人物", icon: "👧" },
      { name: "童话", icon: "🏰" },
      { name: "植物", icon: "🌷" },
      { name: "食物", icon: "🎂" },
      { name: "交通", icon: "🚗" },
      { name: "节日", icon: "🎨" },
      { name: "其他", icon: "⭐" }
    ];
    const draftList = [
      { name: "花朵", img: "/static/linearts/flower.jpg" },
      { name: "飞机", img: "/static/linearts/Airplane.jpg" }
    ];
    const failedThumbs = common_vendor.ref({});
    function onThumbError(item) {
      if (!item || !item.img) return;
      console.warn("[Gallery] 线稿缩略图加载失败:", item.img);
      failedThumbs.value[item.img] = true;
    }
    const filterList = common_vendor.computed(() => {
      const kw = keyword.value.trim();
      if (!kw) return draftList;
      return draftList.filter((item) => item.name.includes(kw));
    });
    function goBack() {
      common_vendor.index.navigateBack();
    }
    function goPaint(item) {
      if (!item || !item.img) return;
      common_vendor.index.navigateTo({
        url: "/pages/paint/paint?img=" + encodeURIComponent(item.img)
      });
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: statusBarHeight.value + "px",
        b: common_vendor.o(goBack, "c9"),
        c: common_vendor.s(headerStyle.value),
        d: keyword.value,
        e: common_vendor.o(($event) => keyword.value = $event.detail.value, "9f"),
        f: common_vendor.f(topTabs, (tab, i, i0) => {
          return {
            a: common_vendor.t(tab),
            b: tab,
            c: activeTab.value === i ? 1 : "",
            d: common_vendor.o(($event) => activeTab.value = i, tab)
          };
        }),
        g: activeCategory.value === -1 ? 1 : "",
        h: common_vendor.o(($event) => activeCategory.value = -1, "83"),
        i: common_vendor.f(categoryList, (item, index, i0) => {
          return {
            a: common_vendor.t(item.icon),
            b: common_vendor.t(item.name),
            c: index,
            d: activeCategory.value === index ? 1 : "",
            e: common_vendor.o(($event) => activeCategory.value = index, index)
          };
        }),
        j: common_vendor.f(filterList.value, (item, index, i0) => {
          return common_vendor.e({
            a: !failedThumbs.value[item.img]
          }, !failedThumbs.value[item.img] ? {
            b: item.img,
            c: common_vendor.o(($event) => onThumbError(item), index)
          } : {}, {
            d: common_vendor.t(item.name),
            e: index,
            f: common_vendor.o(($event) => goPaint(item), index)
          });
        }),
        k: filterList.value.length === 0
      }, filterList.value.length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-baf60e71"]]);
wx.createPage(MiniProgramPage);
