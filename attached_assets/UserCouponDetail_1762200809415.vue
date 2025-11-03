<template>
  <div class="user-coupon-detail">
    <!-- 导航栏 -->
    <van-nav-bar 
      left-arrow
      @click-left="goBack"
    >
      <template #title>
        <div class="nav-title">{{ getLocalizedTitle() }}</div>
      </template>
    </van-nav-bar>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <van-loading size="24px" vertical>{{ $t('common.loading') }}</van-loading>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <van-empty 
        image="error" 
        :description="error"
      >
        <van-button round type="primary" @click="loadCouponDetail">
          {{ $t('common.retry') }}
        </van-button>
      </van-empty>
    </div>

    <!-- 优惠券核销详情 -->
    <div v-else-if="userCoupon" class="coupon-content">
      
      <!-- 优惠券标题区域 -->
      <div class="coupon-header">
        <h1 class="coupon-title">{{ getLocalizedTitle() }}</h1>
        
        <!-- 价格信息 -->
        <div class="price-section">
          <div class="price-row">
            <span class="price-label">{{ $t('coupon.originalPrice') }}:</span>
            <span class="price-original">{{ getCurrencySymbol() }}{{ getOriginalPrice() }}</span>
          </div>
          <div class="price-row main">
            <span class="price-label">{{ $t('coupon.couponPrice') }}:</span>
            <span class="price-current">{{ getCurrencySymbol() }}{{ getCurrentPrice() }}</span>
          </div>
          <div class="price-row savings">
            <span class="price-label">{{ $t('coupon.savings') }}:</span>
            <span class="price-savings">{{ getCurrencySymbol() }}{{ getSavings() }}</span>
          </div>
        </div>
      </div>

      <!-- 二维码区域 -->
      <div class="qr-section">
        <div class="qr-container">
          <div id="qr-code" ref="qrCodeRef" class="qr-code"></div>
          
          <!-- 有效期倒计时 -->
          <div class="validity-info">
            <van-icon name="clock-o" />
            <span class="validity-text">
              {{ $t('coupon.validityRemaining') }}: {{ countdownText }}
            </span>
          </div>
          
          <!-- 手动核销码 -->
          <div class="manual-code">
            <span class="manual-code-label">{{ $t('coupon.manualCode') }}:</span>
            <span class="manual-code-value">{{ userCoupon.redemption_code }}</span>
          </div>
        </div>
      </div>

      <!-- 附近门店 -->
      <div class="nearby-stores">
        <div class="stores-header">
          <van-icon name="location-o" />
          <span>{{ $t('coupon.nearbyStores') }}</span>
        </div>
        
        <div class="stores-list">
          <div 
            v-for="store in nearbyStores" 
            :key="store.id"
            class="store-item"
          >
            <div class="store-image">
              <img 
                :src="store.image_url || '/default-store.jpg'" 
                :alt="getLocalizedStoreName(store)"
              />
            </div>
            <div class="store-info">
              <div class="store-name">{{ getLocalizedStoreName(store) }}</div>
              <div class="store-distance">
                {{ $t('coupon.distanceAway', { distance: (store.distance || 0).toFixed(1) }) }}
              </div>
            </div>
            <van-button 
              size="small" 
              type="primary"
              @click="navigateToStore(store)"
            >
              {{ $t('coupon.navigate') }}
            </van-button>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="usage-rules">
        <van-collapse v-model="rulesExpanded">
          <van-collapse-item name="rules" :title="$t('coupon.usageRules')">
            <div class="rules-content" v-html="getRulesHtml()"></div>
          </van-collapse-item>
        </van-collapse>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { userApi } from '@/api/user.js'
import { showToast } from 'vant'

export default defineComponent({
  name: 'UserCouponDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const { t, locale } = useI18n()
    
    // 响应式数据
    const loading = ref(true)
    const error = ref('')
    const userCoupon = ref(null)
    const nearbyStores = ref([])
    const countdownText = ref('')
    const countdownTimer = ref(null)
    const rulesExpanded = ref([])
    const qrCodeRef = ref(null)

    // 计算属性
    const userCouponId = computed(() => route.params.userCouponId)

    // 标准化locale处理
    const normalizeLocale = (locale) => {
      const lang = (locale || '').toLowerCase().replace('_', '-')
      if (lang.startsWith('en')) return 'en-us'
      if (lang.startsWith('th')) return 'th-th'
      return 'zh-cn' // 默认中文
    }

    // 多语言内容获取
    const getLocalizedTitle = () => {
      if (!userCoupon.value?.coupon) return ''
      
      const currentLang = normalizeLocale(locale.value)
      const coupon = userCoupon.value.coupon
      
      switch(currentLang) {
        case 'en-us':
          return coupon.title_en_us || coupon.title
        case 'th-th':
          return coupon.title_th_th || coupon.title
        default: // 'zh-cn'
          return coupon.title_zh_cn || coupon.title
      }
    }

    const getLocalizedStoreName = (store) => {
      if (!store) return ''
      
      const currentLang = normalizeLocale(locale.value)
      switch(currentLang) {
        case 'en-us':
          return store.name_en_us || store.name
        case 'th-th':
          return store.name_th_th || store.name
        default: // 'zh-cn'
          return store.name_zh_cn || store.name
      }
    }

    // 价格相关方法
    const getCurrencySymbol = () => {
      if (!userCoupon.value?.coupon) return '฿'
      const currency = userCoupon.value.coupon.currency || 'THB'
      return currency === 'CNY' ? '¥' : '฿'
    }

    const getOriginalPrice = () => {
      if (!userCoupon.value?.coupon) return '0'
      return parseFloat(userCoupon.value.coupon.original_price || 0).toFixed(0)
    }

    const getCurrentPrice = () => {
      if (!userCoupon.value?.coupon) return '0'
      return parseFloat(userCoupon.value.coupon.discount_price || userCoupon.value.coupon.price_final || 0).toFixed(0)
    }

    const getSavings = () => {
      const original = parseFloat(userCoupon.value?.coupon?.original_price || 0)
      const current = parseFloat(userCoupon.value?.coupon?.discount_price || userCoupon.value?.coupon?.price_final || 0)
      return Math.max(0, original - current).toFixed(0)
    }

    // 获取使用规则HTML
    const getRulesHtml = () => {
      if (!userCoupon.value?.coupon) return ''
      
      const currentLang = normalizeLocale(locale.value)
      const coupon = userCoupon.value.coupon
      
      let content = ''
      switch(currentLang) {
        case 'en-us':
          content = coupon.description_en_us || coupon.description || coupon.rules
          break
        case 'th-th':
          content = coupon.description_th_th || coupon.description || coupon.rules
          break
        default: // 'zh-cn'
          content = coupon.description_zh_cn || coupon.description || coupon.rules
          break
      }

      const contentStr = typeof content === 'string' ? content : String(content || t('coupon.noRulesAvailable'))
      
      // HTML安全处理
      return contentStr
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:\s*[^"'\s>]*/gi, '')
    }

    // 加载优惠券详情
    const loadCouponDetail = async () => {
      try {
        loading.value = true
        error.value = ''
        
        console.log('🔄 加载用户优惠券详情, ID:', userCouponId.value)
        
        const response = await userApi.getUserCouponDetail(userCouponId.value)
        
        if (response.success) {
          userCoupon.value = response.data
          console.log('✅ 用户优惠券详情加载成功:', userCoupon.value)
          
          // 获取附近门店
          await loadNearbyStores()
          
          // 生成二维码
          await generateQRCode()
          
          // 启动倒计时
          startCountdown()
          
        } else {
          error.value = response.error || t('coupon.loadError')
        }
      } catch (err) {
        console.error('❌ 加载用户优惠券详情失败:', err)
        error.value = t('coupon.loadError')
      } finally {
        loading.value = false
      }
    }

    // 生成二维码
    const generateQRCode = async () => {
      if (!userCoupon.value || !qrCodeRef.value) return
      
      try {
        const qrData = userCoupon.value.qr_code_data || JSON.stringify({
          type: 'coupon_redemption',
          user_coupon_id: userCoupon.value.id,
          redemption_code: userCoupon.value.redemption_code,
          coupon_id: userCoupon.value.coupon_id,
          expires_at: userCoupon.value.expires_at,
          timestamp: new Date().toISOString()
        })
        
        // 清空容器
        qrCodeRef.value.innerHTML = ''
        
        // 生成二维码
        await QRCode.toCanvas(qrCodeRef.value, qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        
        console.log('✅ 二维码生成成功')
      } catch (error) {
        console.error('❌ 生成二维码失败:', error)
        // 显示备用文本
        if (qrCodeRef.value) {
          qrCodeRef.value.innerHTML = `<div class="qr-error">${t('coupon.qrCodeError')}</div>`
        }
      }
    }

    // 加载附近门店
    const loadNearbyStores = async () => {
      if (!userCoupon.value?.coupon) return
      
      try {
        // 获取用户位置
        const position = await getCurrentPosition()
        
        // 获取优惠券关联的门店
        const couponStores = userCoupon.value.coupon.stores || []
        
        // 计算距离并排序
        const storesWithDistance = couponStores.map(store => ({
          ...store,
          distance: position ? calculateDistance(
            position.latitude, 
            position.longitude, 
            parseFloat(store.lat || store.latitude), 
            parseFloat(store.lng || store.longitude)
          ) : 0
        })).sort((a, b) => a.distance - b.distance)
        
        nearbyStores.value = storesWithDistance.slice(0, 3) // 只显示最近的3家
        
      } catch (error) {
        console.log('获取位置失败，使用默认门店列表:', error)
        nearbyStores.value = userCoupon.value.coupon.stores?.slice(0, 3) || []
      }
    }

    // 获取当前位置
    const getCurrentPosition = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'))
          return
        }
        
        navigator.geolocation.getCurrentPosition(
          position => resolve(position.coords),
          error => reject(error),
          { timeout: 5000, maximumAge: 300000 } // 5秒超时，5分钟缓存
        )
      })
    }

    // 计算两点间距离（公里）
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      if (!lat1 || !lng1 || !lat2 || !lng2) return 0
      
      const R = 6371 // 地球半径（公里）
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLng = (lng2 - lng1) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }

    // 启动倒计时
    const startCountdown = () => {
      if (!userCoupon.value) return
      
      const updateCountdown = () => {
        const now = new Date()
        const expiresAt = new Date(userCoupon.value.expires_at)
        const diff = expiresAt - now
        
        if (diff <= 0) {
          countdownText.value = t('coupon.expired')
          if (countdownTimer.value) {
            clearInterval(countdownTimer.value)
            countdownTimer.value = null
          }
          return
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
        if (days > 0) {
          countdownText.value = t('coupon.countdownDays', { days, hours, minutes, seconds })
        } else {
          countdownText.value = t('coupon.countdownHours', { hours, minutes, seconds })
        }
      }
      
      updateCountdown()
      countdownTimer.value = setInterval(updateCountdown, 1000)
    }

    // 导航到门店
    const navigateToStore = (store) => {
      if (!store) return
      
      const lat = store.lat || store.latitude
      const lng = store.lng || store.longitude
      
      if (lat && lng) {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        window.open(mapUrl, '_blank')
      } else {
        showToast(t('coupon.noLocationInfo'))
      }
    }

    // 返回上一页
    const goBack = () => {
      router.back()
    }

    // 组件挂载
    onMounted(() => {
      loadCouponDetail()
    })

    // 组件卸载
    onUnmounted(() => {
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
      }
    })

    return {
      loading,
      error,
      userCoupon,
      nearbyStores,
      countdownText,
      rulesExpanded,
      qrCodeRef,
      getLocalizedTitle,
      getLocalizedStoreName,
      getCurrencySymbol,
      getOriginalPrice,
      getCurrentPrice,
      getSavings,
      getRulesHtml,
      loadCouponDetail,
      navigateToStore,
      goBack
    }
  }
})
</script>

<style scoped>
.user-coupon-detail {
  min-height: 100vh;
  background: #f5f5f5;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 20px;
}

.coupon-content {
  padding: 16px;
}

/* 优惠券标题区域 */
.coupon-header {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  text-align: center;
}

.coupon-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.price-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.price-row.main {
  font-size: 16px;
  font-weight: bold;
  color: #ff6b35;
}

.price-row.savings {
  color: #52c41a;
  font-weight: 500;
}

.price-label {
  color: #666;
}

.price-original {
  color: #999;
  text-decoration: line-through;
}

.price-current {
  color: #ff6b35;
  font-weight: bold;
}

.price-savings {
  color: #52c41a;
  font-weight: bold;
}

/* 二维码区域 */
.qr-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-code {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: white;
}

.qr-error {
  color: #999;
  font-size: 14px;
  text-align: center;
}

.validity-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff6b35;
  font-size: 14px;
  font-weight: 500;
}

.manual-code {
  text-align: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  width: 100%;
}

.manual-code-label {
  color: #666;
  font-size: 14px;
}

.manual-code-value {
  color: #333;
  font-size: 18px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  margin-left: 8px;
}

/* 附近门店 */
.nearby-stores {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.stores-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
}

.stores-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.store-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.store-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.store-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.store-info {
  flex: 1;
}

.store-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.store-distance {
  font-size: 12px;
  color: #666;
}

/* 使用说明 */
.usage-rules {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.rules-content {
  padding: 16px;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.rules-content :deep(p) {
  margin: 0 0 8px 0;
}

.rules-content :deep(ul), 
.rules-content :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

/* 响应式设计 */
@media (max-width: 375px) {
  .coupon-content {
    padding: 12px;
  }
  
  .coupon-header,
  .qr-section,
  .nearby-stores {
    padding: 16px;
  }
  
  .qr-code {
    width: 180px;
    height: 180px;
  }
}
</style>