<template>
  <div class="coupon-detail">
    <!-- 导航栏 -->
    <div class="nav-header">
      <button class="nav-icon-btn back-btn" @click="handleBackClick" :aria-label="$t('common.back')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="nav-title">{{ $t('nav.couponDetail') }}</div>
      <button class="nav-icon-btn share-btn" @click="shareCoupon" :aria-label="$t('common.share')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- 加载状态 -->
    <!-- 骨架屏：在数据加载时显示页面结构 -->
    <div v-if="!coupon || !coupon.id" class="skeleton-content">
      <div class="skeleton-image"></div>
      <div class="skeleton-info">
        <div class="skeleton-title"></div>
        <div class="skeleton-price"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      </div>
      <div class="skeleton-button"></div>
    </div>

    <!-- 优惠券详情 -->
    <div v-else-if="coupon" class="coupon-content">
      <!-- 优惠券图片轮播 -->
      <div class="image-carousel">
        <!-- 多张图片/视频时显示轮播 -->
        <template v-if="getMediaList().length > 1">
          <Swiper
            :modules="swiperModules"
            :pagination="{ clickable: true, dynamicBullets: true }"
            :navigation="getMediaList().length > 1"
            :autoplay="{ delay: 3000, disableOnInteraction: false }"
            :loop="true"
            :space-between="0"
            :centered-slides="true"
            :allow-touch-move="true"
            class="image-swiper"
          >
            <SwiperSlide v-for="(media, index) in getMediaList()" :key="index">
              <video 
                v-if="media.type === 'video'"
                :src="media.url" 
                class="coupon-video"
                controls
                playsinline
                preload="metadata"
              />
              <img 
                v-else
                :src="media.url" 
                :alt="getLocalizedTitle"
                class="coupon-image"
                loading="lazy"
              />
            </SwiperSlide>
          </Swiper>
        </template>
        
        <!-- 单张媒体时直接显示 -->
        <template v-else>
          <video 
            v-if="getMediaList()[0]?.type === 'video'"
            :src="getMediaList()[0]?.url" 
            class="coupon-video single"
            controls
            playsinline
            preload="metadata"
          />
          <img 
            v-else
            :src="getMainImage()" 
            :alt="getLocalizedTitle"
            class="coupon-image single"
            loading="lazy"
          />
        </template>
        
        <!-- 优惠徽章 -->
        <div v-if="getBadgeText()" class="badge">
          {{ getBadgeText() }}
        </div>
      </div>

      <!-- 优惠券信息 -->
      <div class="coupon-info">
        <h1 class="title">{{ getLocalizedTitle }}</h1>

        <!-- 价格信息（根据券类型显示） -->
        <div class="price-block">
          <!-- 最终价券：显示原价和折后价 -->
          <div v-if="coupon.coupon_type === 'final_price'" class="price-row">
            <span v-if="getOriginalPrice()" class="price-original">{{ getCurrencySymbol() }}{{ getOriginalPrice() }}</span>
            <span class="price-current">
              <span class="price-currency">{{ getCurrencySymbol() }}</span>
              <span class="price-main">{{ getMainPrice() }}</span>
            </span>
            <span v-if="shouldShowDiscountBadge()" class="price-badge">{{ $t('coupon.percentOffBadge', { percent: getLocalizedDiscountValue(getDiscountPercent()) }) }}</span>
          </div>
          
          <!-- 其他券类型：显示券类型特定信息 -->
          <div v-else class="price-row">
            <span class="price-description">{{ getCouponPriceDescription() }}</span>
          </div>
        </div>

        <!-- 有效期（上移显示到最近门店之前） -->
        <div class="validity-info moved">
          <span class="label">{{ $t('coupon.validPeriod') }}</span>
          <span class="period">{{ formatDate(coupon.valid_from) }} — {{ formatDate(coupon.valid_to) }}</span>
        </div>

        <!-- 最近三家门店（横向条状） -->
        <div v-if="nearestStores.length" class="nearest-stores">
          <div class="ns-header">
            <span>{{ $t('coupon.nearbyStores') }}</span>
            <small class="ns-tip">{{ $t('coupon.recommendedByLocation') }}</small>
          </div>
          <div class="ns-list">
            <div
              v-for="(s, index) in validNearestStores"
              :key="s.code || s.id || s.name || index"
              class="ns-item"
            >
              <img
                class="ns-img"
                :src="getStoreImageUrl(s)"
                :alt="$t('coupon.storeImageAlt')"
                referrerpolicy="no-referrer"
              />
              <div class="ns-meta">
                <div class="ns-name">{{ getLocalizedStoreName(s) }}</div>
                <div class="ns-dist">
                  {{ $t('coupon.distanceFormat', { distance: (s._distanceKm ?? 0).toFixed(1) }) }}
                </div>
                <!-- 门店电话 -->
                <a 
                  v-if="s.phone" 
                  :href="`tel:${s.phone}`" 
                  class="ns-phone"
                  @click.stop
                >
                  📞 {{ s.phone }}
                </a>
              </div>
              <button class="ns-nav" @click.stop="navigateToStore(s)">
                {{ $t('coupon.navigation') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 使用规则（移到门店下方；可折叠） -->
        <div class="rules-section moved">
          <div class="rules-header" @click="toggleRules">
            <span>{{ $t('coupon.usageRules') }}</span>
            <span class="arrow" :class="{ open: rulesExpanded }">›</span>
          </div>
          <div v-if="rulesExpanded" class="rules-content" v-html="getRulesHtml()"></div>
        </div>

        <!-- 旧：门店信息（已弃用；隐藏渲染） -->
        <div v-if="false && coupon.stores && coupon.stores.length > 0" class="store-info legacy-store" @click="navigateToStore">
          <div class="store-avatar">
            {{ getStoreInitial(coupon.stores[0].name) }}
          </div>
          <div class="store-details">
            <div class="store-name">{{ coupon.stores[0].name }}</div>
            <div class="store-address">{{ coupon.stores[0].address || $t('coupon.storeDetails') }}</div>
            <div v-if="coupon.stores[0].phone" class="store-phone">{{ coupon.stores[0].phone }}</div>
          </div>
          <div class="arrow">→</div>
        </div>

        <!-- 旧：使用规则（已上移；隐藏渲染） -->
        <div class="rules-section legacy-rules" v-if="false">
          <div class="rules-header" @click="toggleRules">
            <span>{{ $t('coupon.usageRules') }}</span>
            <span class="toggle-icon" :class="{ expanded: rulesExpanded }">▼</span>
          </div>
          <div v-if="rulesExpanded" class="rules-content">
            {{ getLocalizedDescription || $t('coupon.noRulesAvailable') }}
          </div>
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else class="error-container">
      <div class="error-message">{{ $t('coupon.notFound') }}</div>
      <button class="retry-btn" @click="goBack">{{ $t('common.back') }}</button>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="coupon" class="action-footer">
      <button 
        class="claim-btn"
        :class="{ 
          claiming: claiming,
          disabled: !canClaim
        }"
        :disabled="!canClaim || claiming"
        @click="onClaimClick"
      >
        {{ claimButtonText }}
      </button>
    </div>
    
    <!-- ClaimGuard 弹窗组件 -->
    <ClaimGuard 
      v-model="showGuard" 
      :require-follow="requireFollow" 
      :follow-bonus="followBonus" 
      @proceed="onProceed" 
    />
    
    <!-- TikTok/IG 广告合规页脚 -->
    <SiteFooter />
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showDialog, showSuccessToast, showFailToast, showConfirmDialog } from 'vant'
import userApi from '@/api/user'
import ClaimGuard from '@/components/ClaimGuard.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import { track } from '@/utils/track'
import { trackCouponDetail, trackCouponClaim } from '@/services/analytics'
import { isLineWebView, buildLiffDeepLink, currentRouteWithQuery } from '@/utils/env'
import { claimCoupon } from '@/services/coupons'
import { shareFlex, isInLineApp } from '@/line/liffClient'
import { persistUtmFromUrl, readUtm } from '@/utils/utm'
import { showLoginDialog } from '@/utils/loginDialog'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import { resolveMediaUrl, getSafeImageUrl } from '@/utils/mediaUrl.js'
import { getLocalizedTitle as getLocalizedTitleUtil, getLocalizedDescription as getLocalizedDescriptionUtil, getLocalizedStoreName as getLocalizedStoreNameUtil, normalizeLocale } from '@/utils/i18n'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export default defineComponent({
  name: 'CouponDetail',
  components: {
    ClaimGuard,
    SiteFooter,
    Swiper,
    SwiperSlide
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const { t, locale } = useI18n()
    
    // 简化返回逻辑：优先返回首页
    const goBack = () => {
      // 使用Vue Router进行客户端路由，避免页面重载
      router.push('/');
    };
    
    // Swiper 模块配置
    const swiperModules = [Navigation, Pagination, Autoplay]
    
    // 响应式数据
    const coupon = ref(null)
    const loading = ref(false)  // 初始化为false，提供流畅的跳转体验
    const claiming = ref(false)
    const rulesExpanded = ref(false)
    const currentCarouselIndex = ref(0)
    const userLocation = ref(null) // {lat, lng}
    const nearestStores = ref([])  // 计算后的最近三家
    
    // ClaimGuard 相关状态
    const showGuard = ref(false)

    // 计算属性
    const canClaim = computed(() => {
      if (!coupon.value) {
        console.log('🚫 canClaim=false: 没有优惠券数据')
        return false
      }
      // 如果已领取，不能再领
      if (coupon.value.is_claimed) {
        console.log('🚫 canClaim=false: 用户已领取', { is_claimed: coupon.value.is_claimed })
        return false
      }
      const now = new Date()
      const validFrom = new Date(coupon.value.valid_from)
      const validTo = new Date(coupon.value.valid_to)
      const result = now >= validFrom && now <= validTo && coupon.value.status === 'active'
      console.log('✅ canClaim判断:', {
        result,
        is_claimed: coupon.value.is_claimed,
        now: now.toISOString(),
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        status: coupon.value.status,
        nowInRange: now >= validFrom && now <= validTo,
        isActive: coupon.value.status === 'active'
      })
      return result
    })

    const claimButtonText = computed(() => {
      if (coupon.value?.is_claimed) return t('coupon.claimed')
      if (claiming.value) return t('coupon.claiming')
      if (!canClaim.value) return t('coupon.cannotClaim')
      return t('coupon.claimNow')
    })
    
    // ClaimGuard 计算属性
    const requireFollow = computed(()=> !!(coupon?.value?.requireFollow))
    const followBonus  = computed(()=> Number(coupon?.value?.followBonus || 0))

    // 过滤有效的最近门店（避免在模板中使用filter）
    const validNearestStores = computed(() => {
      return nearestStores.value.filter(store => {
        if (!store || typeof store !== 'object') return false
        // 检查是否有任何名称字段（基本或多语言）
        return getLocalizedStoreName(store) || store.name || store.name_zh_cn || store.name_en_us || store.name_th_th
      })
    })

    // 使用统一的多语言处理函数（已在顶部import）

    // 返回优惠券标题的多语言版本
    const getLocalizedTitle = computed(() => {
      if (!coupon.value) return ''
      return getLocalizedTitleUtil(coupon.value, locale.value)
    })

    // 返回优惠券描述的多语言版本
    const getLocalizedDescription = computed(() => {
      if (!coupon.value) return ''
      return getLocalizedDescriptionUtil(coupon.value, locale.value)
    })

    // 返回门店名称的多语言版本
    const getLocalizedStoreName = (store) => {
      if (!store) return ''
      try {
        return getLocalizedStoreNameUtil(store, locale.value || 'th-th')
      } catch (error) {
        console.warn('获取门店名称失败:', error, store)
        return store.name || store.name_zh_cn || store.name_en_us || store.name_th_th || ''
      }
    }

    // 获取门店图片URL（只显示门店自己的图片，不fallback到活动图片）
    const getStoreImageUrl = (store) => {
      if (!store) return '/default-store.jpg'
      
      try {
        return getSafeImageUrl(store.imageUrl || store.image_url, '/default-store.jpg')
      } catch (error) {
        console.warn('获取门店图片失败:', error)
        return '/default-store.jpg'
      }
    }

    // 方法
    const loadCouponDetail = async () => {
      try {
        const couponId = route.params.id
        
        // ⚠️ 临时禁用缓存，确保每次都获取最新数据（用于调试）
        const cacheKey = `coupon_${couponId}`
        // 清除旧缓存
        sessionStorage.removeItem(cacheKey)
        
        // const cached = sessionStorage.getItem(cacheKey)
        // if (cached) {
        //   try {
        //     const cachedData = JSON.parse(cached)
        //     // 缓存时间不超过5分钟
        //     if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
        //       console.log('🚀 使用缓存数据, ID:', couponId)
        //       coupon.value = cachedData.data
        //       computeNearestStores()
        //       return
        //     }
        //   } catch (e) {
        //     console.warn('缓存数据解析失败:', e)
        //   }
        // }
        
        console.log('🔄 开始加载优惠券详情, ID:', couponId)
        const response = await userApi.getCouponDetail(couponId)
        console.log('📝 API响应:', response)
        
        // 兼容不同的响应格式
        if (response?.data?.success || response?.success || response?.data) {
          const couponData = response.data?.data || response.data || response
          console.log('✅ 优惠券数据:', couponData)
          
          if (couponData && (couponData.id || couponData.title)) {
            coupon.value = couponData
            console.log('✅ 优惠券设置成功')
            
            // 添加优惠券详情查看埋点
            trackCouponDetail(couponData.id, couponData.campaign_id)
            
            // 缓存数据到本地存储
            try {
              const cacheData = {
                data: couponData,
                timestamp: Date.now()
              }
              sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
            } catch (e) {
              console.warn('缓存数据失败:', e)
            }
            
            // 如果已有定位，则计算最近门店
            computeNearestStores()
          } else {
            console.error('❌ 优惠券数据无效:', couponData)
            coupon.value = null
          }
        } else {
          console.error('❌ API响应无效:', response)
          coupon.value = null
        }
      } catch (error) {
        console.error('❌ 加载优惠券详情失败:', error)
        coupon.value = null
        
        // 友好错误提示
        if (error.response?.status === 404 || error.status === 404) {
          showFailToast(t('coupon.notFound') || '优惠券不存在或已下架')
          // 2秒后返回首页
          setTimeout(() => {
            router.replace('/')
          }, 2000)
        } else if (error.response?.status === 400 || error.status === 400) {
          showFailToast(t('coupon.invalidId') || '无效的优惠券ID')
          setTimeout(() => {
            router.replace('/')
          }, 2000)
        } else {
          showFailToast(t('coupon.loadFailed') || '加载优惠券失败，请稍后重试')
        }
      } finally {
        // loading.value = false // 已移除加载状态
        console.log('🏁 数据加载完成, coupon:', !!coupon.value)
      }
    }

    // 领取前统一入口
    // 新的实际领取逻辑（根据文档修改）
    const doClaim = async () => {
      const id = route.params.id || route.query.id
      await claimCoupon(id)
      
      // 添加优惠券领取成功埋点
      trackCouponClaim(id, coupon.value?.campaign_id)
      
      // 领取成功后，立即更新本地状态
      if (coupon.value) {
        coupon.value.is_claimed = true
      }
      
      showSuccessToast(t('coupon.claimOk'))
      // 领取成功后跳转到我的优惠券页面
      setTimeout(() => {
        router.push('/my-coupons')
      }, 1500)
    }

    // 统一的领取逻辑：智能检测环境并处理登录
    const onClaimClick = async () => {
      if (!canClaim.value || claiming.value) return
      
      // 确保 UTM 写入，便于领取归因
      persistUtmFromUrl()

      // 1. 检查登录状态（检查后端会话Cookie）
      const sessionValid = await checkBackendSession()
      
      if (!sessionValid) {
        // 未登录：使用智能登录对话框（自动检测平台）
        try {
          // 传递完整的i18n对象给showLoginDialog
          const i18n = { t, locale }
          await showLoginDialog(i18n)
          // 登录成功后，loginDialog 会自动刷新页面
          // 页面刷新后会重新进入这个函数，此时 sessionValid 为 true
        } catch (e) {
          // 用户取消登录或登录失败
          console.log('👤 用户取消登录或登录失败:', e)
        }
        return
      }
      
      // 2. 已登录：执行领取逻辑
      try {
        claiming.value = true
        const id = route.params.id || route.query.id
        
        await claimCoupon(id)
        trackCouponClaim(id, coupon.value?.campaign_id)
        
        // 领取成功后，立即更新本地状态
        if (coupon.value) {
          coupon.value.is_claimed = true
        }
        
        // 优化后的提示信息
        showDialog({
          title: '🎉 领取成功！',
          message: '您的卡券已经收藏在首页"我的"优惠券里！',
          confirmButtonText: '查看我的优惠券',
          showCancelButton: true,
          cancelButtonText: '继续浏览'
        }).then(() => {
          // 用户点击"查看我的优惠券" - 跳转到首页并切换到Profile标签
          router.push({ path: '/', query: { tab: 'me' } })
        }).catch(() => {
          // 用户点击"继续浏览"，留在当前页面
          console.log('用户选择继续浏览')
        })
      } catch (e) {
        const errorMessage = e?.message || ''
        console.error('❌ 领取失败:', errorMessage, e)
        
        // 检查是否是认证错误（401/403）
        if (e?.isAuthError || e?.status === 401 || e?.status === 403 || errorMessage.includes('缺少认证') || errorMessage.includes('token')) {
          console.log('🔐 检测到认证错误，会话已失效，提示重新登录')
          
          // 使用智能登录对话框（自动检测平台）
          try {
            // 传递完整的i18n对象给showLoginDialog
            const i18n = { t, locale }
            await showLoginDialog(i18n)
            // 登录成功后会自动刷新页面
          } catch (err) {
            console.log('👤 用户取消重新登录')
          }
        }
        // 检查是否是已经领取的错误
        else if (errorMessage.includes('已经领取') || errorMessage.includes('already claimed') || errorMessage.includes('duplicate')) {
          showDialog({ 
            title: t('coupon.alreadyClaimedTitle'),
            message: t('coupon.alreadyClaimedMsg')
          }).then(() => {
            router.push({ path: '/', query: { tab: 'me' } })
          })
        } else {
          showDialog({ message: t('coupon.claimFail') + ' ' + errorMessage }) 
        }
      } finally {
        claiming.value = false
      }
    }
    
    // ClaimGuard处理函数（保持兼容）
    const onProceed = ({ following }) => { 
      track('claim_proceed_ok', { following, couponId: coupon.value?.id })
      onClaimClick() // 使用新的统一领取逻辑
    }

    // 检查后端会话是否有效
    const checkBackendSession = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          return data.success === true && data.data
        }
        return false
      } catch (e) {
        return false
      }
    }

    // 确保 LINE 登录：优先 liff；否则跳 LIFF 深链（已废弃，使用line.js的ensureLogin）
    const ensureLineLogin = async () => {
      try {
        if (typeof window !== 'undefined' && window.liff) {
          if (!window.liff.isLoggedIn()) {
            window.liff.login({ redirectUri: window.location.href })
            return false
          }
          return true
        }
        const liffId = import.meta?.env?.VITE_LINE_LIFF_ID || ''
        const devMode = import.meta?.env?.VITE_DEV_MODE !== 'false'
        
        // 开发环境下，如果LIFF ID是测试用的，直接跳过LINE登录验证
        if (devMode || liffId === 'test-liff-id-for-development') {
          console.log('🔧 开发环境：跳过LINE登录验证')
          return true
        }
        
        if (liffId) {
          const url = `https://liff.line.me/${liffId}?redirect_uri=${encodeURIComponent(window.location.href)}`
          window.location.href = url
          return false
        } else {
          alert(t('common.missingLiffConfig'))
          return false
        }
      } catch (e) {
        console.error('ensureLineLogin error:', e)
        return true
      }
    }

    // 旧的doClaim函数已被新的分享页面逻辑替代

    const navigateToStore = (store) => {
      const s = store || coupon.value?.stores?.[0]
      if (!s) return
      const lat = s.lat || s.latitude
      const lng = s.lng || s.longitude
      if (lat && lng) {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        window.open(mapUrl, '_blank')
      } else {
        console.log('门店缺少经纬度:', s)
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      // 统一使用 DD/MM/YYYY 格式（简洁且国际通用）
      return `${day}/${month}/${year}`
    }

    // 获取适合当前语言的折扣显示值
    const getLocalizedDiscountValue = (percent) => {
      const currentLocale = normalizeLocale(locale.value || 'th-th')
      
      if (currentLocale === 'zh-cn') {
        // 中文使用"折"概念：20% OFF = 8折
        const fold = (100 - percent) / 10
        return Math.round(fold * 10) / 10 // 保留一位小数但去掉不必要的.0
      } else {
        // 英文和泰文使用百分比
        return percent
      }
    }

    const toggleRules = () => {
      rulesExpanded.value = !rulesExpanded.value
    }

    const getMainImage = () => {
      if (!coupon.value) return '/default-coupon.jpg'
      
      try {
        // 尝试多个图片来源
        const sources = [
          coupon.value.image_url,
          coupon.value.cover,
          coupon.value.thumbnail,
          coupon.value.media_files?.[0]
        ]
        
        for (const source of sources) {
          if (source) {
            try {
              const resolved = resolveMediaUrl(source)
              if (resolved) return resolved
            } catch (resolveError) {
              console.warn('解析图片URL失败:', resolveError, source)
              continue
            }
          }
        }
      } catch (error) {
        console.warn('获取主图片失败:', error)
      }
      
      return '/placeholder-coupon.png'
    }

    const getMediaList = () => {
      if (!coupon.value?.media_files) {
        return [{ type: 'image', url: getMainImage() }]
      }
      
      try {
        const mediaItems = coupon.value.media_files
          .map(file => {
            try {
              const url = resolveMediaUrl(file)
              return url ? { type: file.type || 'image', url } : null
            } catch (resolveError) {
              console.warn('解析媒体URL失败:', resolveError, file)
              return null
            }
          })
          .filter(item => item !== null)
        
        return mediaItems.length > 0 ? mediaItems : [{ type: 'image', url: getMainImage() }]
      } catch (error) {
        console.warn('获取媒体列表失败:', error)
        return [{ type: 'image', url: getMainImage() }]
      }
    }
    
    // 兼容旧的getImageList函数
    const getImageList = () => {
      return getMediaList().map(item => item.url)
    }

    const getDiscountPercent = () => {
      if (!coupon.value || !coupon.value.original_price || !coupon.value.discount_price) return 0
      const original = parseFloat(coupon.value.original_price)
      const discount = parseFloat(coupon.value.discount_price)
      if (original <= 0) return 0
      return Math.round(((original - discount) / original) * 100)
    }

    const getCouponSubtitle = () => {
      if (!coupon.value) return ''
      const type = coupon.value.coupon_type || 'final_price'
      switch (type) {
        case 'final_price':
          return t('coupon.finalPriceSubtitle')
        case 'gift_card':
          return t('coupon.giftCardSubtitle')
        case 'cash_voucher':
          return t('coupon.cashVoucherSubtitle')
        default:
          return ''
      }
    }

    
    // 获取门店名称首字母
    const getStoreInitial = (storeName) => {
      if (!storeName) return 'S'
      // 提取第一个字符，如果是中文则返回第一个字，如果是英文则返回第一个字母
      return storeName.charAt(0).toUpperCase()
    }
    
    // 获取徽章文本
    const getBadgeText = () => {
      if (!coupon.value) return ''
      
      const type = coupon.value.coupon_type || 'final_price'
      const currency = coupon.value.currency || 'THB'
      
      switch (type) {
        case 'final_price':
          const percent = getDiscountPercent()
          return percent > 0 ? t('coupon.percentOffBadge', { percent: getLocalizedDiscountValue(percent) }) : ''
        case 'gift_card':
          return t('coupon.giftCardBadge')
        case 'cash_voucher':
          return t('coupon.cashVoucherBadge')
        case 'full_reduction':
          return t('coupon.fullReductionBadge')
        case 'percentage_discount':
          const discountPercent = coupon.value.discount_percent || 0
          return t('coupon.percentOffBadge', { percent: getLocalizedDiscountValue(discountPercent) })
        case 'fixed_discount':
          return t('coupon.fixedDiscountBadge')
        default:
          return ''
      }
    }
    
    // 获取货币符号
    const getCurrencySymbol = () => {
      if (!coupon.value) return '฿'
      const currency = coupon.value.currency || 'THB'
      return currency === 'CNY' ? '¥' : '฿'
    }

    // 获取主价格（根据优惠券类型）
    const getMainPrice = () => {
      if (!coupon.value) return '0.00'
      const type = coupon.value.coupon_type || 'final_price'
      
      switch (type) {
        case 'final_price':
          const price = coupon.value.discount_price || coupon.value.price_final || 0
          return parseFloat(price).toFixed(2)
        case 'gift_card':
          return parseFloat(coupon.value.card_value || 0).toFixed(2)
        case 'cash_voucher':
          return parseFloat(coupon.value.voucher_amount || 0).toFixed(2)
        default:
          return parseFloat(coupon.value.price_final || 0).toFixed(2)
      }
    }

    // 获取原价（仅为 final_price 类型且有折扣时显示）
    const getOriginalPrice = () => {
      if (!coupon.value) return null
      const type = coupon.value.coupon_type || 'final_price'
      
      if (type !== 'final_price') return null
      if (!coupon.value.original_price || !coupon.value.discount_price) return null
      
      return parseFloat(coupon.value.original_price).toFixed(2)
    }

    // 是否显示折扣徽章
    const shouldShowDiscountBadge = () => {
      if (!coupon.value) return false
      const type = coupon.value.coupon_type || 'final_price'
      return type === 'final_price' && getDiscountPercent() > 0
    }

    // 获取规则HTML（使用多语言描述并增强安全处理）
    const getRulesHtml = () => {
      if (!coupon.value) return ''
      
      // 优先使用多语言描述，如果没有则使用rules字段
      const content = getLocalizedDescription.value || coupon.value.rules_html || coupon.value.rules
      let contentStr = typeof content === 'string' ? content : String(content || '')
      
      // 强化的HTML安全处理 - 白名单方式
      contentStr = contentStr
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:\s*[^"'\s>]*/gi, '')
        .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
        .replace(/<embed[^>]*>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<meta[^>]*>/gi, '')
      
      // 如果内容没有HTML标签，进行格式化处理
      if (!/<[^>]+>/.test(contentStr)) {
        // 按句号、分号、问号等分段，并添加换行
        contentStr = contentStr
          .replace(/([。！？；])\s*/g, '$1<br><br>') // 中文标点后换行
          .replace(/([.!?;])\s*/g, '$1<br><br>')    // 英文标点后换行
          .replace(/(\d+[、)])\s*/g, '<br>$1 ')     // 数字列表项换行
          .replace(/([\u4e00-\u9fff]{20,})/g, '$1<br>') // 长中文段落换行
          .replace(/(\d+[.)\u0e51-\u0e59])\s*/g, '<br>$1 ') // 泰文数字列表
          .replace(/([\u0e00-\u0e7f]{30,})\s+/g, '$1<br><br>') // 长泰文段落（30个字符以上）换行
          .replace(/([ๆๅ])\s*/g, '$1<br><br>')     // 泰文句号等标点后换行
          .replace(/(<br><br>)+/g, '<br><br>')     // 避免过多换行
          .trim()
        
        // 如果有冒号，可能是标题或要点，添加格式
        contentStr = contentStr
          .replace(/([：:])\s*([^<\n]*?)(<br>|$)/g, '<strong>$1</strong> $2$3')
        
        // 泰文特殊格式化：处理常见的规则格式
        if (/[\u0e00-\u0e7f]/.test(contentStr)) {
          contentStr = contentStr
            .replace(/(กฎ|เงื่อนไข|ข้อกำหนด|หมายเหตุ)/g, '<strong>$1</strong>')
            .replace(/(\d+\.?\s*)([\u0e00-\u0e7f])/g, '<br><strong>$1</strong>$2')
            .replace(/(-\s*)([\u0e00-\u0e7f])/g, '<br><strong>•</strong> $2')
        }
      }
      
      return contentStr
    }

    // 获取券类型特定的价格描述（国际化版本）
    const getCouponPriceDescription = () => {
      if (!coupon.value) return ''
      
      const type = coupon.value.coupon_type || 'final_price'
      const currency = getCurrencySymbol()
      
      switch (type) {
        case 'gift_card':
          return coupon.value.face_value 
            ? `${t('coupon.cardValue')} ${currency}${coupon.value.face_value}` 
            : t('coupon.faceValuePending')
          
        case 'cash_voucher':
          return coupon.value.amount_off 
            ? `${t('coupon.voucherValue')} ${currency}${coupon.value.amount_off}` 
            : t('coupon.faceValuePending')
          
        case 'full_reduction':
          if (coupon.value.min_spend && coupon.value.amount_off) {
            return t('coupon.fullReductionFormat', {
              minSpend: `${currency}${coupon.value.min_spend}`,
              discount: `${currency}${coupon.value.amount_off}`
            })
          }
          return t('coupon.fullReductionPending')
          
        case 'percentage_discount':
          if (coupon.value.discount_percent) {
            const dp = coupon.value.discount_percent
            let description = t('coupon.percentOffBadge', { percent: getLocalizedDiscountValue(dp) })
            if (coupon.value.min_spend) {
              description += ` (${t('coupon.minSpend')} ${currency}${coupon.value.min_spend})`
            }
            return description
          }
          return t('coupon.discountPending')
          
        case 'fixed_discount':
          if (coupon.value.amount_off) {
            let description = `${t('coupon.off')} ${currency}${coupon.value.amount_off}`
            if (coupon.value.min_spend) {
              description += ` (${t('coupon.minSpend')} ${currency}${coupon.value.min_spend})`
            }
            return description
          }
          return t('coupon.discountPending')
          
        default:
          return t('coupon.pricePending')
      }
    }

    const onCarouselChange = (index) => {
      currentCarouselIndex.value = index
    }

    // 分享功能
    const shareCoupon = async () => {
      try {
        const title = getLocalizedTitle.value || t('nav.couponDetail')
        const description = getCouponSubtitle() || getLocalizedDescription.value || ''
        const url = window.location.href
        
        // 优先使用 LINE 富文本分享（Flex Message）
        if (isInLineApp()) {
          // 获取完整的图片 URL
          const imageUrl = getMainImage()
          const fullImageUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${window.location.origin}${imageUrl}`
          
          // 使用 LIFF ShareTargetPicker 分享富文本消息
          const shared = await shareFlex({
            imageUrl: fullImageUrl,
            title: title,
            description: description,
            linkUrl: url,
            buttonText: t('common.viewDetails') || '查看详情'
          })
          
          if (shared) {
            showSuccessToast(t('common.shareSuccess') || '分享成功')
            return
          }
        }
        
        // 回退到系统原生分享
        if (navigator.share) {
          await navigator.share({
            title: title,
            text: description,
            url: url
          })
          return
        }
        
        // 最后回退：显示复制链接选项
        showShareOptions()
      } catch (error) {
        console.log('分享失败:', error)
        // 如果分享被取消或失败，显示复制链接选项
        if (error.name !== 'AbortError') {
          showShareOptions()
        }
      }
    }
    
    // 显示分享选项（复制链接）
    const showShareOptions = () => {
      const url = window.location.href
      const title = getLocalizedTitle.value || t('nav.couponDetail')
      
      // 使用 Vant 的对话框显示分享选项
      showDialog({
        title: t('common.share') || '分享',
        message: `${title}\n\n${url}`,
        confirmButtonText: t('common.copyLink') || '复制链接',
        showCancelButton: true,
        cancelButtonText: t('common.cancel') || '取消'
      }).then(() => {
        // 复制链接到剪贴板
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            showSuccessToast(t('common.linkCopied') || '链接已复制')
          }).catch(() => {
            showFailToast(t('common.copyFailed') || '复制失败')
          })
        } else {
          // 回退方案：使用旧的复制方法
          const textarea = document.createElement('textarea')
          textarea.value = url
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          try {
            document.execCommand('copy')
            showSuccessToast(t('common.linkCopied') || '链接已复制')
          } catch (err) {
            showFailToast(t('common.copyFailed') || '复制失败')
          }
          document.body.removeChild(textarea)
        }
      }).catch(() => {
        // 用户取消
      })
    }

    // 返回按钮点击处理（使用兜底逻辑）
    const handleBackClick = goBack

    // 获取用户位置
    const getUserLocation = () => {
      try {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            userLocation.value = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            }
            computeNearestStores()
          },
          (err) => {
            console.warn('定位失败/被拒绝:', err?.message)
          },
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 }
        )
      } catch (e) {
        console.warn('getUserLocation error:', e)
      }
    }

    // 计算最近门店（最多3家）
    const computeNearestStores = () => {
      const stores = coupon.value?.stores || []
      if (!stores.length || !userLocation.value) {
        nearestStores.value = []
        return
      }
      const withDistance = stores
        .filter(s => (s.lat || s.latitude) && (s.lng || s.longitude))
        .map(s => {
          const lat = s.lat || s.latitude
          const lng = s.lng || s.longitude
          const d = haversineKm(userLocation.value.lat, userLocation.value.lng, lat, lng)
          return { ...s, _distanceKm: d }
        })
        .sort((a, b) => (a._distanceKm ?? 0) - (b._distanceKm ?? 0))
        .slice(0, 3)
      nearestStores.value = withDistance
    }

    // Haversine 公式（公里）
    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const toRad = (x) => (x * Math.PI) / 180
      const R = 6371
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }

    onMounted(() => {
      loadCouponDetail()
      getUserLocation()
    })
    
    return {
      // 数据
      coupon,
      loading,
      claiming,
      rulesExpanded,
      currentCarouselIndex,
      userLocation,
      nearestStores,
      showGuard,
      // 计算属性
      canClaim,
      claimButtonText,
      validNearestStores,
      requireFollow,
      followBonus,
      // 多语言函数
      getLocalizedTitle,
      getLocalizedDescription,
      getLocalizedStoreName,
      // 媒体相关方法
      getMediaList,
      // 方法
      onClaimClick,
      onProceed,
      navigateToStore,
      formatDate,
      getLocalizedDiscountValue,
      toggleRules,
      getMainImage,
      getImageList,
      getDiscountPercent,
      getCouponSubtitle,
      getStoreInitial,
      onCarouselChange,
      getBadgeText,
      getCurrencySymbol,
      getMainPrice,
      getOriginalPrice,
      shouldShowDiscountBadge,
      getRulesHtml,
      getCouponPriceDescription,
      shareCoupon,
      computeNearestStores,
      getStoreImageUrl, // ✅ 将该函数暴露给模板使用
      goBack,
      handleBackClick,
      // Swiper配置
      swiperModules,
      // 翻译函数
      t
    }
  }
})
</script>

<style scoped>
.coupon-detail {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8f9fa 0%, #f2f3f5 100%);
  padding-bottom: 100px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 导航栏 */
.nav-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid #f0f0f0;
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.nav-icon-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
}

.nav-icon-btn:hover {
  background-color: rgba(0, 0, 0, 0.04);
  transform: scale(1.05);
}

.nav-icon-btn:active {
  background-color: rgba(0, 0, 0, 0.08);
  transform: scale(0.98);
}

.nav-icon {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.back-btn .nav-icon {
  color: #1a1a1a;
}

.share-btn .nav-icon {
  color: #ff6600;
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.02em;
}

/* 加载状态 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading {
  color: #969799;
}

/* 优惠券内容 */
.coupon-content {
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  margin-top: -10px;
  overflow: hidden;
}

/* 图片轮播 - 正方形容器（使用padding-top技巧确保1:1比例） */
.image-carousel {
  position: relative !important;
  width: 100% !important;
  height: 0 !important;
  padding-top: 100% !important; /* 创建1:1正方形 */
  padding-bottom: 0 !important;
  overflow: hidden !important;
  background: #f8f9fa;
}

.coupon-image {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0;
}

.coupon-image.single {
  display: block;
}

/* 视频样式 */
.coupon-video {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.coupon-video.single {
  display: block;
}

/* Swiper轮播样式 */
.image-swiper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.image-swiper .swiper-slide {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
}

/* 分页器样式 */
.image-swiper :deep(.swiper-pagination) {
  bottom: 16px !important;
  left: 50%;
  transform: translateX(-50%);
  width: auto !important;
  z-index: 20;
}

.image-swiper :deep(.swiper-pagination-bullet) {
  width: 10px !important;
  height: 10px !important;
  background: rgba(255, 255, 255, 0.6) !important;
  border-radius: 50% !important;
  opacity: 1 !important;
  margin: 0 6px !important;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.image-swiper :deep(.swiper-pagination-bullet-active) {
  background: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transform: scale(1.2);
}

/* 导航按钮样式 */
.image-swiper :deep(.swiper-button-next),
.image-swiper :deep(.swiper-button-prev) {
  width: 24px !important;
  height: 24px !important;
  margin-top: -12px !important;
  background: transparent !important;
  border-radius: 0 !important;
  color: #ffffff !important;
  box-shadow: none !important;
  z-index: 20;
  transition: all 0.3s ease;
}

.image-swiper :deep(.swiper-button-next:hover),
.image-swiper :deep(.swiper-button-prev:hover) {
  background: transparent !important;
  transform: scale(1.2);
  color: #ffffff !important;
}

.image-swiper :deep(.swiper-button-next:after),
.image-swiper :deep(.swiper-button-prev:after) {
  font-size: 18px !important;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.image-swiper :deep(.swiper-button-next) {
  right: 12px !important;
}

.image-swiper :deep(.swiper-button-prev) {
  left: 12px !important;
}

.badge {
  z-index: 30 !important;
  position: absolute;
  top: 16px;
  right: 16px;
  background: #ff6600;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* 优惠券信息 */
.coupon-info {
  padding: 32px 12px 24px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 15px;
  color: #6b7280;
  margin: 0 0 20px 0;
  line-height: 1.4;
}

/* 价格信息（重新设计） */
.price-block {
  margin: 16px 0 12px;
  padding: 8px 0;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
}

.price-current {
  display: flex;
  align-items: baseline;
}

.price-currency {
  font-size: 18px;
  color: #ff6600;
  font-weight: 600;
  margin-right: 3px;
}

.price-main {
  font-size: 22px;
  font-weight: 700;
  color: #ff6600;
  line-height: 1.1;
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
}

.price-original {
  font-size: 16px;
  color: #969799;
  text-decoration: line-through;
  font-weight: 500;
  margin-right: 4px;
}

.price-badge {
  font-size: 13px;
  color: #ff6600;
  background: #fff1e6;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 700;
  border: 1px solid #ffe0cc;
}

.price-description {
  font-size: 22px;
  font-weight: 700;
  color: #ff6600;
  line-height: 1.1;
  letter-spacing: -0.3px;
}

/* 有效期 */
.validity-info {
  display: flex;
  align-items: center;
  margin: 20px 0;
  padding: 16px 10px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.validity-info .label {
  font-size: 14px;
  color: #64748b;
  margin-right: 12px;
  font-weight: 500;
}

.validity-info .period {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* 上移区块的额外间距 */
.validity-info.moved { margin: 8px 0 6px; }
.rules-section.moved { margin: 4px 0 12px; }

/* 隐藏旧的门店卡片块 */
.store-info { display: none !important; }

/* 如果页面底部仍有旧的有效期/规则块，统一隐藏 */
.legacy-validity, .legacy-rules { display: none !important; }

/* 最近门店 */
.nearest-stores { margin: 8px 0 16px; }
.ns-header {
  display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;
  font-weight: 600; color: #323233;
}
.ns-header .ns-tip {
  font-size: 12px; color: #969799; font-weight: 400;
}
.ns-list { display: flex; flex-direction: column; gap: 10px; }
.ns-item {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 5px;
  background: #f7f8fa;
  border-radius: 12px;
}
.ns-img {
  width: 72px; height: 48px; object-fit: cover; border-radius: 8px;
  background: #eee;
}
.ns-meta { display: flex; flex-direction: column; gap: 2px; }
.ns-name { font-size: 14px; font-weight: 600; color: #323233; }
.ns-dist { font-size: 12px; color: #969799; }
.ns-phone { 
  font-size: 12px; 
  color: #1989fa; 
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  transition: color 0.2s;
  margin-top: 2px;
}
.ns-phone:active { 
  color: #0c6ac4; 
}
.ns-nav {
  padding: 6px 12px; background: #ff6600; color: white; border: none;
  border-radius: 12px; font-size: 12px; cursor: pointer; white-space: nowrap;
}
.ns-nav:active { background: #e55a00; }

/* 门店信息 */
.store-info {
  display: flex;
  align-items: center;
  margin: 20px 0;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.store-info:active {
  background: #ebedf0;
}

.store-avatar {
  width: 48px;
  height: 48px;
  background: #ff6600;
  color: white;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  margin-right: 12px;
}

.store-details {
  flex: 1;
}

.store-name {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.store-address {
  font-size: 14px;
  color: #969799;
  margin-bottom: 2px;
}

.store-phone {
  font-size: 12px;
  color: #07c160;
  font-weight: 500;
}

.arrow {
  color: #c8c9cc;
  font-size: 16px;
  transition: transform 0.3s ease;
}

.arrow.open {
  transform: rotate(90deg);
}

/* 使用说明 */
.rules-section {
  margin: 24px 0;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: #f7f8fa;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.toggle-icon {
  transition: transform 0.3s;
  color: #c8c9cc;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.rules-content {
  padding: 16px;
  background: white;
  border: 1px solid #ebedf0;
  border-top: none;
  border-radius: 0 0 12px 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #646566;
}

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  padding: 20px;
}

.error-message {
  font-size: 16px;
  color: #646566;
  margin-bottom: 20px;
}

.retry-btn {
  padding: 12px 24px;
  background: #ff6600;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

/* 底部操作栏 */
.action-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #ebedf0;
  z-index: 100;
}

.claim-btn {
  width: 100%;
  height: 48px;
  background: #ff6600;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.claim-btn:active {
  background: #e55a00;
}

.claim-btn.disabled {
  background: #c8c9cc;
  cursor: not-allowed;
}

.claim-btn.claiming {
  background: #c8c9cc;
  cursor: not-allowed;
}

.action-footer .van-button {
  height: 56px;
  font-size: 18px;
  font-weight: 600;
  background: #ff6600;
  border: none;
  border-radius: 28px;
}

.action-footer .van-button:not(.van-button--disabled) {
  background: #ff6600;
  border-color: #ff6600;
}

.action-footer .van-button:not(.van-button--disabled):active {
  background: #e55a00;
  border-color: #e55a00;
}

/* 骨架屏样式 */
.skeleton-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.skeleton-image {
  width: 100%;
  height: 250px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.5s infinite;
  border-radius: 12px;
  margin-bottom: 20px;
}

.skeleton-info {
  margin-bottom: 30px;
}

.skeleton-title {
  width: 80%;
  height: 32px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 15px;
}

.skeleton-price {
  width: 60%;
  height: 28px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.5s infinite;
  border-radius: 6px;
  margin-bottom: 15px;
}

.skeleton-text {
  width: 100%;
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-text.short {
  width: 70%;
}

.skeleton-button {
  width: 100%;
  height: 50px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.5s infinite;
  border-radius: 25px;
  margin-top: 20px;
}

@keyframes loading-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>