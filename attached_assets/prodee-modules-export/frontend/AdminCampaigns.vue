<template>
  <div class="admin-campaigns">
    <el-card shadow="never" class="page-header">
      <div class="header-content">
        <div class="header-left">
          <el-button @click="goBack" :icon="ArrowLeft">{{ $t('common.back') }}</el-button>
          <h2>{{ $t('admin.menu.activityManagement') }}</h2>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showAddCampaign = true" :icon="Plus">
            {{ $t('admin.campaigns.addCampaign') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="campaigns-content">
      <!-- 搜索栏 -->
      <div class="search-section">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-input
              v-model="searchKeyword"
              :placeholder="$t('admin.campaigns.searchPlaceholder')"
              @input="handleSearch"
              @clear="handleSearch"
              clearable
              :prefix-icon="Search"
            />
          </el-col>
          <el-col :span="6">
            <el-select
              v-model="statusFilter"
              :placeholder="$t('admin.campaigns.statusFilter')"
              @change="handleSearch"
              clearable
            >
              <el-option :label="$t('common.allStatuses')" value="" />
              <el-option :label="$t('admin.campaigns.draft')" value="draft" />
              <el-option :label="$t('admin.campaigns.active')" value="active" />
              <el-option :label="$t('admin.campaigns.paused')" value="paused" />
            </el-select>
          </el-col>
        </el-row>
      </div>

      <!-- 活动数据表格 -->
      <el-table 
        :data="campaignList" 
        v-loading="loading"
        stripe
        style="width: 100%; margin-top: 20px;"
      >
        <el-table-column type="index" width="50" />
        <el-table-column 
          prop="image_url" 
          :label="$t('admin.campaigns.image')"
          width="80"
        >
          <template #default="scope">
            <!-- 视频缩略图 -->
            <VideoThumbnail
              v-if="isVideoContent(scope.row)"
              :videoUrl="getVideoUrl(scope.row)"
              style="width: 60px; height: 40px; border-radius: 4px; overflow: hidden;"
            />
            <!-- 图片缩略图 -->
            <el-image
              v-else-if="getMainImage(scope.row)"
              :src="getMainImage(scope.row)"
              :preview-src-list="[getMainImage(scope.row)]"
              style="width: 60px; height: 40px; border-radius: 4px;"
              fit="cover"
              preview-teleported
            />
            <!-- 无媒体 -->
            <span v-else style="color: #999;">{{ $t('admin.campaigns.noImage') }}</span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="title" 
          :label="$t('admin.campaigns.title')"
          min-width="150"
        />
        <el-table-column 
          :label="$t('admin.campaigns.price')"
          width="150"
        >
          <template #default="scope">
            <div>
              <div style="color: #f56c6c; font-weight: 500;">
                {{ getPriceSummary(scope.row) }}
              </div>
              <div style="color: #999; font-size: 12px;">
                {{ getCouponTypeLabel(scope.row.coupon_type) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.progress')"
          width="120"
        >
          <template #default="scope">
            <div>
              <div style="font-size: 12px; color: #666;">
                {{ scope.row.claimed_count }}/{{ scope.row.quantity }}
              </div>
              <el-progress 
                :percentage="Math.round((scope.row.claimed_count / scope.row.quantity) * 100)" 
                :stroke-width="6"
                :show-text="false"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.validity')"
          width="180"
        >
          <template #default="scope">
            <div style="font-size: 12px;">
              <div>{{ formatDate(scope.row.valid_from) }}</div>
              <div>{{ formatDate(scope.row.valid_to) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.status')"
          width="100"
        >
          <template #default="scope">
            <el-tag 
              :type="getStatusType(scope.row.status)"
              size="small"
            >
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('admin.campaigns.linkColumn')" width="320">
          <template #default="{ row }">
            <el-dropdown trigger="click">
              <el-button size="small" type="primary">{{ $t('admin.campaigns.copyLink') }}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="copyLiff(row.id)">{{ $t('admin.campaigns.copyLiffActivity') }}</el-dropdown-item>
                  <el-dropdown-item @click="copyLiffSmart()">{{ $t('admin.campaigns.copyLiffSmart') }}</el-dropdown-item>
                  <el-dropdown-item divided disabled>—— 外部广告落地页 ——</el-dropdown-item>
                  <el-dropdown-item @click="copyH5(row.id,'tiktok')">H5 / TikTok</el-dropdown-item>
                  <el-dropdown-item @click="copyH5(row.id,'facebook')">H5 / Facebook</el-dropdown-item>
                  <el-dropdown-item @click="copyH5(row.id,'instagram')">H5 / IG</el-dropdown-item>
                  <el-dropdown-item @click="copyH5(row.id,'line')">H5 / LINE 聊天分发</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button size="small" plain class="ml8" @click="previewCoupon(row.id)">{{ $t('admin.campaigns.preview') }}</el-button>
            <el-button size="small" type="warning" plain class="ml8" @click="editStaffGuide(row)">{{ $t('admin.campaigns.activityGuide') }}</el-button>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.actions')"
          width="180"
          fixed="right"
        >
          <template #default="scope">
            <el-button 
              size="small" 
              @click="editCampaign(scope.row)"
              :icon="Edit"
            >
              {{ $t('admin.campaigns.edit') }}
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteCampaign(scope.row)"
              :icon="Delete"
            >
              {{ $t('admin.campaigns.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑活动对话框 -->
    <el-dialog 
      v-model="showAddCampaign" 
      :title="editingCampaign ? $t('admin.campaigns.editCampaign') : $t('admin.campaigns.addCampaign')"
      width="800px"
      :closable="true"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
      @close="resetForm"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="campaignForm" :rules="formRules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.title')" prop="title">
              <el-input
                v-model="campaignForm.title"
                :placeholder="$t('admin.campaigns.titlePlaceholder')"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.description')" prop="description">
              <el-input
                v-model="campaignForm.description"
                type="textarea"
                :rows="3"
                :placeholder="$t('admin.campaigns.descriptionPlaceholder')"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 券类型选择 -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.couponType')" prop="coupon_type">
              <el-select 
                v-model="campaignForm.coupon_type" 
                @change="handleCouponTypeChange"
                style="width: 100%"
                :placeholder="$t('admin.campaigns.couponTypePlaceholder')"
              >
                <el-option
                  v-for="type in couponTypes"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                >
                  <span style="float: left">{{ type.label }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ type.example }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 行业类目选择 -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.category')" prop="category">
              <el-select 
                v-model="campaignForm.category" 
                style="width: 100%"
                :placeholder="$t('admin.campaigns.categoryPlaceholder')"
              >
                <el-option
                  v-for="category in categories"
                  :key="category.value"
                  :label="category.label"
                  :value="category.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 动态价格字段 -->
        <div v-if="campaignForm.coupon_type === 'final_price'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.originalPrice')">
                <el-input-number
                  v-model="campaignForm.original_price"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.originalPricePlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.finalPrice')" prop="price_final">
                <el-input-number
                  v-model="campaignForm.price_final"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.finalPricePlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'gift_card'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.faceValue')" prop="face_value">
                <el-input-number
                  v-model="campaignForm.face_value"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.faceValuePlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'cash_voucher'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.amountOff')" prop="amount_off">
                <el-input-number
                  v-model="campaignForm.amount_off"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.amountOffPlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'full_reduction'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.minSpend')" prop="min_spend">
                <el-input-number
                  v-model="campaignForm.min_spend"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.minSpendPlaceholder')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.amountOff')" prop="amount_off">
                <el-input-number
                  v-model="campaignForm.amount_off"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.amountOffPlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'percentage_discount'">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item :label="$t('admin.campaigns.discountPercent')" prop="discount_percent">
                <el-input-number
                  v-model="campaignForm.discount_percent"
                  :min="0"
                  :max="100"
                  :precision="1"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.discountPercentPlaceholder')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('admin.campaigns.minSpend')">
                <el-input-number
                  v-model="campaignForm.min_spend"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.minSpendPlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('admin.campaigns.capAmount')">
                <el-input-number
                  v-model="campaignForm.cap_amount"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.capAmountPlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'fixed_discount'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.amountOff')" prop="amount_off">
                <el-input-number
                  v-model="campaignForm.amount_off"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.amountOffPlaceholder')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.minSpend')">
                <el-input-number
                  v-model="campaignForm.min_spend"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.minSpendPlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.quantity')" prop="quantity">
              <el-input-number
                v-model="campaignForm.quantity"
                :min="1"
                style="width: 100%"
                :placeholder="$t('admin.campaigns.quantityPlaceholder')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.status')" prop="status">
              <el-radio-group v-model="campaignForm.status">
                <el-radio label="draft">{{ $t('admin.campaigns.draft') }}</el-radio>
                <el-radio label="active">{{ $t('admin.campaigns.published') }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.validFrom')" prop="valid_from">
              <el-date-picker
                v-model="campaignForm.valid_from"
                type="datetime"
                :placeholder="$t('admin.campaigns.validFromPlaceholder')"
                style="width: 100%"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.validTo')" prop="valid_to">
              <el-date-picker
                v-model="campaignForm.valid_to"
                type="datetime"
                :placeholder="$t('admin.campaigns.validToPlaceholder')"
                style="width: 100%"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.mediaFiles')" prop="media_files">
              <MediaUploader
                action="/api/admin/upload/campaign-media"
                :headers="uploadHeaders"
                v-model="campaignForm.media_files"
                :max-images="3"
                :max-videos="1"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.stores')" prop="store_ids">
              <!-- 新的门店选择界面 -->
              <div class="store-selector-panel">
                <!-- 城市筛选器 -->
                <div class="city-filter-section">
                  <div class="filter-header">
                    <span class="filter-title">{{ $t('admin.campaigns.selectCity') }}</span>
                    <el-button 
                      link 
                      type="primary" 
                      size="small"
                      @click="toggleAllCities"
                    >
                      {{ allCitiesSelected ? $t('admin.campaigns.unselectAllCities') : $t('admin.campaigns.selectAllCities') }}
                    </el-button>
                  </div>
                  <el-checkbox-group v-model="selectedCities" @change="handleCityChange">
                    <div class="city-chips">
                      <el-checkbox 
                        v-for="city in availableCities" 
                        :key="city"
                        :label="city"
                        border
                        size="small"
                      >
                        {{ city }} ({{ getCityStoreCount(city) }})
                      </el-checkbox>
                    </div>
                  </el-checkbox-group>
                </div>

                <!-- 门店列表 -->
                <div class="store-list-section">
                  <div class="store-list-header">
                    <span class="store-count-info">
                      {{ $t('admin.campaigns.storesSelectedCount', { count: campaignForm.store_ids.length }) }}
                      <span v-if="filteredStoresByCity.length > 0">
                        （{{ $t('admin.campaigns.storesAvailableCount', { count: filteredStoresByCity.length }) }}）
                      </span>
                    </span>
                    <el-button 
                      link 
                      type="primary" 
                      size="small"
                      @click="toggleAllStores"
                      :disabled="filteredStoresByCity.length === 0"
                    >
                      {{ allFilteredStoresSelected ? $t('admin.campaigns.unselectAllStores') : $t('admin.campaigns.selectAllStores') }}
                    </el-button>
                  </div>
                  
                  <div class="store-items-container">
                    <el-empty 
                      v-if="filteredStoresByCity.length === 0"
                      :description="$t('admin.campaigns.selectCityFirst')"
                      :image-size="80"
                    />
                    <el-checkbox-group 
                      v-else
                      v-model="campaignForm.store_ids"
                      class="store-checkbox-group"
                    >
                      <div 
                        v-for="store in filteredStoresByCity" 
                        :key="store.id"
                        class="store-item"
                        :class="{ 'is-checked': campaignForm.store_ids.includes(store.id) }"
                      >
                        <el-checkbox :label="store.id">
                          <div class="store-info">
                            <div class="store-name">
                              <el-icon class="store-icon"><Shop /></el-icon>
                              {{ store.name }}
                              <el-tag size="small" type="info" style="margin-left: 8px;">{{ store.code }}</el-tag>
                            </div>
                            <div class="store-details">
                              <span class="store-city">
                                <el-icon><Location /></el-icon>
                                {{ store.city }}
                              </span>
                              <span class="store-address">{{ store.address }}</span>
                            </div>
                          </div>
                        </el-checkbox>
                      </div>
                    </el-checkbox-group>
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancel">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="saveCampaign" :loading="submitting">
            {{ $t('common.confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 活动指南对话框 -->
    <el-dialog 
      v-model="showStaffGuide" 
      :title="$t('admin.campaigns.activityGuideTitle')"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-alert
        :title="$t('admin.campaigns.guideDisplayTip')"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      />
      
      <el-form :model="staffGuideForm" label-width="140px">
        <el-form-item :label="$t('admin.campaigns.activityName')">
          <div style="color: #666;">{{ staffGuideForm.title }}</div>
        </el-form-item>
        
        <el-form-item :label="$t('admin.campaigns.staffSop')">
          <el-input
            v-model="staffGuideForm.staff_sop"
            type="textarea"
            :rows="6"
            :placeholder="$t('admin.campaigns.staffSopPlaceholder')"
          />
          <div style="color: #999; font-size: 12px; margin-top: 5px;">
            <i class="el-icon-info"></i> {{ $t('admin.campaigns.staffSopHint') }}
          </div>
        </el-form-item>

        <el-form-item :label="$t('admin.campaigns.staffNotes')">
          <el-input
            v-model="staffGuideForm.staff_notes"
            type="textarea"
            :rows="5"
            :placeholder="$t('admin.campaigns.staffNotesPlaceholder')"
          />
          <div style="color: #999; font-size: 12px; margin-top: 5px;">
            <i class="el-icon-warning"></i> {{ $t('admin.campaigns.staffNotesHint') }}
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showStaffGuide = false">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="saveStaffGuide" :loading="savingGuide">
            {{ $t('admin.campaigns.saveGuide') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { normalizeLocale } from '@/utils/i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Search, Edit, Delete, MagicStick, Shop, Location } from '@element-plus/icons-vue'
import axios from 'axios'
import { adminApi } from '@/api/admin'
import MediaUploader from '@/components/MediaUploader.vue'
import VideoThumbnail from '@/components/VideoThumbnail.vue'

export default defineComponent({
  name: 'AdminCampaigns',
  components: {
    MediaUploader,
    VideoThumbnail
  },
  setup() {
    const router = useRouter()
    const { t, locale } = useI18n()
    
    // 环境变量
    const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID || import.meta.env.VITE_LIFF_ID
    // 始终使用当前域名，忽略VITE_PUBLIC_HOST环境变量
    const HOST = location.origin
    
    // 页面状态
    const loading = ref(false)
    const submitting = ref(false)
    const searchKeyword = ref('')
    const statusFilter = ref('')
    
    // 分页状态
    const currentPage = ref(1)
    const pageSize = ref(20)
    const totalCount = ref(0)
    
    // 活动列表
    const campaignList = ref([])
    
    // 添加/编辑活动
    const showAddCampaign = ref(false)
    const editingCampaign = ref(null)
    const formRef = ref()
    
    // 活动指南
    const showStaffGuide = ref(false)
    const savingGuide = ref(false)
    const staffGuideForm = ref({
      id: null,
      title: '',
      staff_sop: '',
      staff_notes: ''
    })
    
    
    const campaignForm = ref({
      title: '',
      description: '',
      // 员工操作指引
      staff_sop: '',
      staff_notes: '',
      // 券类型和类别
      coupon_type: 'final_price',
      category: 'recommend',
      // 价格相关字段
      original_price: null,
      discount_price: null,
      price_final: null,
      face_value: null,
      amount_off: null,
      min_spend: null,
      discount_percent: null,
      cap_amount: null,
      currency: 'THB',
      // 其他字段
      quantity: null,
      valid_from: '',
      valid_to: '',
      image_url: '',
      media_files: [],
      status: 'draft',
      store_ids: []
    })

    // 多媒体上传相关
    const uploadRef = ref()
    const fileInputRef = ref()
    const fileList = ref([])
    const selectedMediaType = ref(null) // 'image' 或 'video'，用于锁定类型
    const baseAcceptedTypes = '.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.ogg,.mov,.avi'

    // 上传请求头
    const uploadHeaders = computed(() => {
      const token = localStorage.getItem('admin_token')
      return {
        'Authorization': `Bearer ${token}`
      }
    })

    // 当前媒体类型（computed）
    const currentMediaType = computed(() => {
      if (campaignForm.value.media_files.length > 0) {
        return campaignForm.value.media_files[0].type
      }
      return selectedMediaType.value
    })

    // 上传限制数量（computed）
    const uploadLimit = computed(() => {
      const mediaType = currentMediaType.value
      if (mediaType === 'video') {
        return 1
      } else if (mediaType === 'image') {
        return 3
      }
      return 3 // 默认最大限制
    })

    // 允许的文件类型（computed）
    const acceptedFileTypes = computed(() => {
      const mediaType = currentMediaType.value
      if (mediaType === 'video') {
        return '.mp4,.webm,.ogg,.mov,.avi'
      } else if (mediaType === 'image') {
        return '.jpg,.jpeg,.png,.gif,.webp'
      }
      return baseAcceptedTypes // 默认全部类型
    })

    // 是否允许多选（computed）
    const multipleAllowed = computed(() => {
      const mediaType = currentMediaType.value
      return mediaType !== 'video' // 视频不允许多选
    })

    // 门店列表
    const storeList = ref([])
    
    // 城市筛选相关状态
    const selectedCities = ref([])
    
    // 计算可用的城市列表（从门店数据中提取）
    const availableCities = computed(() => {
      const cities = new Set()
      storeList.value.forEach(store => {
        if (store.city) {
          cities.add(store.city)
        }
      })
      return Array.from(cities).sort((a, b) => a.localeCompare(b, 'th'))
    })
    
    // 获取某个城市的门店数量
    const getCityStoreCount = (city) => {
      return storeList.value.filter(store => store.city === city).length
    }
    
    // 根据选中的城市筛选门店
    const filteredStoresByCity = computed(() => {
      if (selectedCities.value.length === 0) {
        return []
      }
      return storeList.value.filter(store => 
        selectedCities.value.includes(store.city)
      ).sort((a, b) => {
        // 先按城市排序，再按名称排序
        if (a.city !== b.city) {
          return a.city.localeCompare(b.city, 'th')
        }
        return a.name.localeCompare(b.name, 'th')
      })
    })
    
    // 检查是否所有城市都被选中
    const allCitiesSelected = computed(() => {
      return availableCities.value.length > 0 && 
             selectedCities.value.length === availableCities.value.length
    })
    
    // 检查是否所有筛选后的门店都被选中
    const allFilteredStoresSelected = computed(() => {
      if (filteredStoresByCity.value.length === 0) return false
      const filteredStoreIds = filteredStoresByCity.value.map(s => s.id)
      return filteredStoreIds.every(id => campaignForm.value.store_ids.includes(id))
    })
    
    // 切换所有城市的选中状态
    const toggleAllCities = () => {
      if (allCitiesSelected.value) {
        selectedCities.value = []
      } else {
        selectedCities.value = [...availableCities.value]
      }
    }
    
    // 切换所有筛选后门店的选中状态
    const toggleAllStores = () => {
      const filteredStoreIds = filteredStoresByCity.value.map(s => s.id)
      
      if (allFilteredStoresSelected.value) {
        // 取消选中：从已选门店中移除当前筛选的门店
        campaignForm.value.store_ids = campaignForm.value.store_ids.filter(
          id => !filteredStoreIds.includes(id)
        )
      } else {
        // 全选：将筛选的门店添加到已选列表（去重）
        const newIds = filteredStoreIds.filter(
          id => !campaignForm.value.store_ids.includes(id)
        )
        campaignForm.value.store_ids = [...campaignForm.value.store_ids, ...newIds]
      }
    }
    
    // 城市选择变化处理
    const handleCityChange = () => {
      // 移除不在选中城市中的门店
      const selectedCityStoreIds = storeList.value
        .filter(store => selectedCities.value.includes(store.city))
        .map(store => store.id)
      
      campaignForm.value.store_ids = campaignForm.value.store_ids.filter(id =>
        selectedCityStoreIds.includes(id)
      )
    }
    
    // 泰国省份名称映射 - 保留用于向后兼容
    const getProvinceName = (provinceCode) => {
      const provinceMap = {
        // 曼谷及周边
        'BK': '曼谷府 (Bangkok)',
        'SP': '暖武里府 (Nonthaburi)',
        'PY': '巴吞他尼府 (Pathum Thani)',
        'SM': '北榄府 (Samut Prakan)',
        'SK': '龙仔厝府 (Samut Sakhon)',
        'SS': '北碧府 (Samut Songkhram)',
        
        // 中部地区
        'AN': '红统府 (Ang Thong)',
        'AT': '大城府 (Ayutthaya)',
        'CB': '北碧府 (Kanchanaburi)',
        'CT': '猜纳府 (Chai Nat)',
        'KP': '甘烹碧府 (Kamphaeng Phet)',
        'LB': '华富里府 (Lop Buri)',
        'NK': '那空那育府 (Nakhon Nayok)',
        'NS': '那空沙旺府 (Nakhon Sawan)',
        'PT': '佛统府 (Nakhon Pathom)',
        'PB': '碧差汶府 (Phetchabun)',
        'PN': '披集府 (Phichit)',
        'PS': '披耶府 (Phitsanulok)',
        'PK': '巴蜀府 (Prachuap Khiri Khan)',
        'RB': '叻丕府 (Ratchaburi)',
        'SB': '北标府 (Saraburi)',
        'SN': '信武里府 (Sing Buri)',
        'ST': '素可泰府 (Sukhothai)',
        'SP': '素攀武里府 (Suphan Buri)',
        'UT': '乌泰他尼府 (Uthai Thani)',
        
        // 东部地区
        'CT': '尖竹汶府 (Chanthaburi)',
        'CB': '春武里府 (Chon Buri)',
        'PC': '巴真府 (Prachin Buri)',
        'RY': '罗勇府 (Rayong)',
        'SA': '沙缴府 (Sa Kaeo)',
        'TR': '达叻府 (Trat)',
        
        // 北部地区
        'CM': '清迈府 (Chiang Mai)',
        'CR': '清莱府 (Chiang Rai)',
        'LP': '南邦府 (Lampang)',
        'LN': '南奔府 (Lamphun)',
        'MH': '湄宏顺府 (Mae Hong Son)',
        'NW': '楠府 (Nan)',
        'PY': '帕府 (Phayao)',
        'PR': '帕府 (Phrae)',
        'UT': '程逸府 (Uttaradit)',
        
        // 东北部地区
        'AC': '安纳乍能府 (Amnat Charoen)',
        'BK': '武里南府 (Buri Ram)',
        'CR': '猜也奔府 (Chaiyaphum)',
        'KK': '孔敬府 (Khon Kaen)',
        'LI': '黎府 (Loei)',
        'MS': '玛哈沙拉堪府 (Maha Sarakham)',
        'MD': '莫达汉府 (Mukdahan)',
        'NP': '那空拍侬府 (Nakhon Phanom)',
        'NM': '那空叻差是玛府 (Nakhon Ratchasima)',
        'NK': '廊开府 (Nong Khai)',
        'RI': '黎逸府 (Roi Et)',
        'SK': '色军府 (Sakon Nakhon)',
        'SI': '四色菊府 (Si Sa Ket)',
        'SR': '素林府 (Surin)',
        'UD': '乌隆府 (Udon Thani)',
        'UB': '乌汶府 (Ubon Ratchathani)',
        'YS': '益梭通府 (Yasothon)',
        
        // 南部地区
        'CU': '春蓬府 (Chumphon)',
        'KR': '甲米府 (Krabi)',
        'NW': '那拉提瓦府 (Narathiwat)',
        'PT': '攀牙府 (Phang Nga)',
        'PL': '帕塔隆府 (Phattalung)',
        'PK': '普吉府 (Phuket)',
        'RN': '拉廊府 (Ranong)',
        'ST': '沙敦府 (Satun)',
        'SN': '宋卡府 (Songkhla)',
        'SR': '素叻府 (Surat Thani)',
        'TR': '董里府 (Trang)',
        'YL': '也拉府 (Yala)',
        'PT': '北大年府 (Pattani)'
      }
      
      return provinceMap[provinceCode] || `${provinceCode}省份`
    }

    // 表单验证规则
    const formRules = {
      title: [
        { required: true, message: t('admin.campaigns.titleRequired'), trigger: 'blur' }
      ],
      description: [
        { required: true, message: t('admin.campaigns.descriptionRequired'), trigger: 'blur' }
      ],
      original_price: [
        { required: true, message: t('admin.campaigns.originalPriceRequired'), trigger: 'blur' }
      ],
      discount_price: [
        { required: true, message: t('admin.campaigns.discountPriceRequired'), trigger: 'blur' }
      ],
      quantity: [
        { required: true, message: t('admin.campaigns.quantityRequired'), trigger: 'blur' }
      ],
      valid_from: [
        { required: true, message: t('admin.campaigns.validFromRequired'), trigger: 'blur' }
      ],
      valid_to: [
        { required: true, message: t('admin.campaigns.validToRequired'), trigger: 'blur' }
      ],
      store_ids: [
        { required: true, message: t('admin.campaigns.storesRequired'), trigger: 'change' }
      ],
      category: [
        { required: true, message: t('admin.campaigns.categoryRequired'), trigger: 'change' }
      ]
    }

    // 获取活动列表
    const loadCampaigns = async () => {
      try {
        loading.value = true
        
        const response = await adminApi.getCampaigns({
          page: currentPage.value,
          limit: pageSize.value,
          search: searchKeyword.value,
          status: statusFilter.value
        })

        if (response.success) {
          campaignList.value = response.data
          totalCount.value = response.pagination.total
        }
      } catch (error) {
        console.error('加载活动列表失败:', error)
        if (error.response?.status === 401) {
          router.push('/admin/login')
        } else {
          ElMessage.error(t('admin.campaigns.loadError'))
        }
      } finally {
        loading.value = false
      }
    }

    // 搜索
    const handleSearch = () => {
      currentPage.value = 1
      loadCampaigns()
    }

    // 分页大小改变
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      loadCampaigns()
    }

    // 当前页改变
    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      loadCampaigns()
    }

    // 返回上一页
    const goBack = () => {
      router.push('/admin/dashboard')
    }

    // 编辑活动
    const editCampaign = (campaign) => {
      editingCampaign.value = campaign
      
      // 安全地更新表单数据，确保所有字段都有默认值
      Object.assign(campaignForm.value, {
        title: campaign.title || '',
        description: campaign.description || '',
        coupon_type: campaign.coupon_type || 'final_price',
        category: campaign.category || 'recommend',
        original_price: campaign.original_price || null,
        discount_price: campaign.discount_price || null,
        price_final: campaign.price_final || null,
        face_value: campaign.face_value || null,
        amount_off: campaign.amount_off || null,
        min_spend: campaign.min_spend || null,
        discount_percent: campaign.discount_percent || null,
        cap_amount: campaign.cap_amount || null,
        currency: campaign.currency || 'THB',
        quantity: campaign.quantity || null,
        valid_from: campaign.valid_from || '',
        valid_to: campaign.valid_to || '',
        image_url: campaign.image_url || '',
        status: campaign.status || 'draft',
        store_ids: campaign.store_ids || []
      })
      
      // 处理媒体文件数据
      if (campaign.media_files) {
        try {
          let mediaFiles = typeof campaign.media_files === 'string' 
            ? JSON.parse(campaign.media_files) 
            : campaign.media_files || []
          
          // 转换URL为同源路径（绕过CORP拦截）
          const convertToSameOrigin = (url) => {
            if (typeof url === 'string') {
              return url.replace(/^https?:\/\/[^/]+\/uploads\//, '/api/uploads/')
            }
            return url
          }
          
          campaignForm.value.media_files = mediaFiles.map(file => ({
            ...file,
            url: convertToSameOrigin(file.url)
          }))
          
          // 设置类型锁定
          if (campaignForm.value.media_files.length > 0) {
            selectedMediaType.value = campaignForm.value.media_files[0].type
          }
        } catch (error) {
          console.error('解析媒体文件数据失败:', error)
          campaignForm.value.media_files = []
          selectedMediaType.value = null
        }
      } else {
        campaignForm.value.media_files = []
        selectedMediaType.value = null
      }
      
      showAddCampaign.value = true
    }

    // 删除活动
    const deleteCampaign = async (campaign) => {
      try {
        await ElMessageBox.confirm(
          t('admin.campaigns.deleteConfirmMessage', { title: campaign.title }),
          t('admin.campaigns.deleteConfirmTitle'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning',
          }
        )
        
        const token = localStorage.getItem('admin_token')
        await axios.delete(`/api/admin/campaigns/${campaign.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        ElMessage.success(t('admin.campaigns.deleteSuccess'))
        loadCampaigns()
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          return
        }
        console.error('删除活动失败:', error)
        ElMessage.error(t('admin.campaigns.deleteError'))
      }
    }

    // 编辑活动指南
    const editStaffGuide = (campaign) => {
      staffGuideForm.value = {
        id: campaign.id,
        title: campaign.title,
        staff_sop: campaign.staff_sop || '',
        staff_notes: campaign.staff_notes || ''
      }
      showStaffGuide.value = true
    }

    // 保存活动指南
    const saveStaffGuide = async () => {
      try {
        savingGuide.value = true
        const token = localStorage.getItem('admin_token')
        
        await axios.put(`/api/admin/campaigns/${staffGuideForm.value.id}/staff-guide`, {
          staff_sop: staffGuideForm.value.staff_sop,
          staff_notes: staffGuideForm.value.staff_notes
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        ElMessage.success(t('admin.campaigns.saveGuideSuccess'))
        showStaffGuide.value = false
        loadCampaigns()  // 重新加载列表
      } catch (error) {
        console.error('保存活动指南失败:', error)
        ElMessage.error(t('admin.campaigns.saveGuideError'))
      } finally {
        savingGuide.value = false
      }
    }

    // 保存活动
    const saveCampaign = async () => {
      const valid = await formRef.value.validate().catch(() => false)
      if (!valid) return

      try {
        submitting.value = true
        const token = localStorage.getItem('admin_token')
        const method = editingCampaign.value ? 'put' : 'post'
        const url = editingCampaign.value 
          ? `/api/admin/campaigns/${editingCampaign.value.id}`
          : '/api/admin/campaigns'

        // 复制表单数据并处理时区
        const formData = { ...campaignForm.value }
        
        // 修复时区问题：确保发送正确的本地时间格式
        if (formData.valid_from) {
          // 如果是Date对象，转为本地时间字符串
          if (formData.valid_from instanceof Date) {
            const localDate = new Date(formData.valid_from.getTime() - formData.valid_from.getTimezoneOffset() * 60000)
            formData.valid_from = localDate.toISOString().slice(0, 19).replace('T', ' ')
          }
        }
        
        if (formData.valid_to) {
          // 如果是Date对象，转为本地时间字符串
          if (formData.valid_to instanceof Date) {
            const localDate = new Date(formData.valid_to.getTime() - formData.valid_to.getTimezoneOffset() * 60000)
            formData.valid_to = localDate.toISOString().slice(0, 19).replace('T', ' ')
          }
        }

        await axios[method](url, formData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        // 显示成功消息
        ElMessage.success(editingCampaign.value ? t('admin.campaigns.updateSuccess') : t('admin.campaigns.addSuccess'))
        
        // 立即关闭对话框和刷新列表
        showAddCampaign.value = false
        resetForm()
        loadCampaigns()
      } catch (error) {
        console.error('保存活动失败:', error)
        ElMessage.error(editingCampaign.value ? t('admin.campaigns.updateError') : t('admin.campaigns.addError'))
      } finally {
        submitting.value = false
      }
    }

    // 处理取消操作
    const handleCancel = () => {
      showAddCampaign.value = false
      resetForm()
    }


    // 重置表单
    const resetForm = () => {
      editingCampaign.value = null
      
      
      // 重置表单数据，保持与初始化相同的结构
      Object.assign(campaignForm.value, {
        title: '',
        description: '',
        coupon_type: 'final_price',
        category: 'recommend',
        original_price: null,
        discount_price: null,
        price_final: null,
        face_value: null,
        amount_off: null,
        min_spend: null,
        discount_percent: null,
        cap_amount: null,
        currency: 'THB',
        quantity: null,
        valid_from: '',
        valid_to: '',
        image_url: '',
        media_files: [],
        status: 'draft',
        store_ids: []
      })
      
      fileList.value = []
      selectedMediaType.value = null // 重置类型锁定
      
      // 重置表单验证状态
      if (formRef.value) {
        formRef.value.clearValidate()
      }
    }

    // 获取门店列表
    const loadStores = async () => {
      try {
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/stores', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            limit: 1000  // 获取所有门店
          }
        })

        if (response.data.success) {
          storeList.value = response.data.data
        }
      } catch (error) {
        console.error('加载门店列表失败:', error)
      }
    }

    // 门店选择处理
    const handleStoreSelection = (selectedStoreIds) => {
      console.log('Selected stores:', selectedStoreIds)
    }

    // 多媒体上传前检查
    const beforeMediaUpload = (file) => {
      console.log('🔍 [UPLOAD] beforeMediaUpload被调用:', {
        name: file.name,
        type: file.type,
        size: file.size,
        currentMediaFiles: campaignForm.value.media_files.length
      })
      
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        console.error('❌ [UPLOAD] 文件类型错误:', file.type)
        ElMessage.error(t('admin.campaigns.uploadTypeError'))
        return false
      }
      
      const newFileType = isImage ? 'image' : 'video'
      
      // 设置或检查媒体类型锁定
      if (campaignForm.value.media_files.length === 0 && !selectedMediaType.value) {
        selectedMediaType.value = newFileType
      }
      
      const currentType = currentMediaType.value
      
      // 检查类型互斥
      if (currentType && currentType !== newFileType) {
        const currentTypeText = currentType === 'image' ? t('admin.campaigns.images') : t('admin.campaigns.videos')
        const newTypeText = newFileType === 'image' ? t('admin.campaigns.images') : t('admin.campaigns.videos')
        ElMessage.error(t('admin.campaigns.mediaTypeMutexError', {
          current: currentTypeText,
          new: newTypeText
        }))
        return false
      }
      
      // 检查文件大小
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024 // 视频50MB, 图片5MB
      if (file.size > maxSize) {
        ElMessage.error(t('admin.campaigns.uploadSizeError', {
          size: isVideo ? '50MB' : '5MB'
        }))
        return false
      }
      
      // 检查具体数量限制
      if (newFileType === 'video' && campaignForm.value.media_files.length >= 1) {
        ElMessage.error(t('admin.campaigns.videoLimitError'))
        return false
      }
      
      if (newFileType === 'image' && campaignForm.value.media_files.length >= 3) {
        console.error('❌ [UPLOAD] 图片数量超限')
        ElMessage.error(t('admin.campaigns.imageLimitError'))
        return false
      }
      
      console.log('✅ [UPLOAD] 文件检查通过，允许上传')
      return true
    }

    // 自定义上传请求（使用adminApi统一处理认证）
    const customUploadRequest = async (options) => {
      const { file, onSuccess, onError } = options
      console.log('📤 [CUSTOM UPLOAD] 开始自定义上传:', file.name)
      
      const formData = new FormData()
      formData.append('files', file)
      
      try {
        const response = await adminApi.uploadCampaignMedia(formData)
        
        console.log('📤 [CUSTOM UPLOAD] 服务器响应:', response)
        
        if (response.success && response.data && response.data.files) {
          // 转换URL为同源路径（绕过CORP拦截）
          const convertToSameOrigin = (url) => {
            if (typeof url === 'string') {
              return url.replace(/^https?:\/\/[^/]+\/uploads\//, '/api/uploads/')
            }
            return url
          }
          
          const filesWithSameOriginUrls = response.data.files.map(file => ({
            ...file,
            url: convertToSameOrigin(file.url)
          }))
          
          // 添加到media_files
          campaignForm.value.media_files.push(...filesWithSameOriginUrls)
          
          // 调用onSuccess通知el-upload组件（但由于show-file-list=false，不会显示）
          onSuccess(response, file)
          
          // 立即清空上传列表
          uploadRef.value?.clearFiles()
          
          ElMessage.success(t('admin.campaigns.uploadMediaSuccess'))
          console.log('✅ [CUSTOM UPLOAD] 上传成功')
        } else {
          throw new Error(response.message || '上传失败')
        }
      } catch (error) {
        console.error('❌ [CUSTOM UPLOAD] 上传失败:', error)
        
        // 401错误已经被apiClient拦截器处理，这里不需要再处理
        onError(error)
        
        // 显示错误消息
        const errorMsg = error.response?.data?.message || error.message || t('admin.campaigns.uploadMediaError')
        ElMessage.error(errorMsg)
      }
    }

    // 触发文件输入
    const triggerFileInput = () => {
      console.log('🖱️ [FILE INPUT] 触发文件选择')
      fileInputRef.value?.click()
    }

    // 处理文件选择
    const handleFileSelect = async (event) => {
      const files = Array.from(event.target.files || [])
      console.log('📁 [FILE SELECT] 选择的文件:', files.length)
      
      if (files.length === 0) return
      
      for (const file of files) {
        // 调用beforeMediaUpload进行验证
        const isValid = beforeMediaUpload(file)
        if (!isValid) {
          console.log('❌ [FILE SELECT] 文件验证失败:', file.name)
          continue
        }
        
        // 上传文件
        const formData = new FormData()
        formData.append('files', file)
        
        try {
          console.log('📤 [FILE SELECT] 开始上传:', file.name)
          console.log('📤 [FILE SELECT] 上传前media_files长度:', campaignForm.value.media_files.length)
          console.log('📤 [FILE SELECT] 上传前media_files:', JSON.stringify(campaignForm.value.media_files))
          
          const response = await adminApi.uploadCampaignMedia(formData)
          
          console.log('📤 [FILE SELECT] 原始服务器响应:', JSON.stringify(response))
          
          if (response.success && response.data && response.data.files) {
            const serverFiles = response.data.files
            console.log('📤 [FILE SELECT] 服务器返回的files数组:', JSON.stringify(serverFiles))
            console.log('📤 [FILE SELECT] 第一个文件的URL:', serverFiles[0].url)
            console.log('📤 [FILE SELECT] 第一个文件的filename:', serverFiles[0].filename)
            
            // 转换URL为同源路径（绕过CORP拦截）
            const convertToSameOrigin = (url) => {
              if (typeof url === 'string') {
                return url.replace(/^https?:\/\/[^/]+\/uploads\//, '/api/uploads/')
              }
              return url
            }
            
            const filesWithSameOriginUrls = serverFiles.map(file => ({
              ...file,
              url: convertToSameOrigin(file.url)
            }))
            
            // 将文件添加到列表 - 使用转换后的同源URL
            const beforeLength = campaignForm.value.media_files.length
            campaignForm.value.media_files.push(...filesWithSameOriginUrls)
            const afterLength = campaignForm.value.media_files.length
            
            console.log('📤 [FILE SELECT] push后media_files长度:', beforeLength, '->', afterLength)
            console.log('📤 [FILE SELECT] push后完整media_files:', JSON.stringify(campaignForm.value.media_files))
            console.log('📤 [FILE SELECT] push后最后一个文件:', JSON.stringify(campaignForm.value.media_files[campaignForm.value.media_files.length - 1]))
            
            ElMessage.success(t('admin.campaigns.uploadMediaSuccess'))
            console.log('✅ [FILE SELECT] 上传成功')
          } else {
            console.error('❌ [FILE SELECT] 响应格式错误:', response)
            ElMessage.error('上传响应格式错误')
          }
        } catch (error) {
          console.error('❌ [FILE SELECT] 上传失败:', error)
          const errorMsg = error.response?.data?.message || error.message || t('admin.campaigns.uploadMediaError')
          ElMessage.error(errorMsg)
        }
      }
      
      // 清空input，允许重复选择同一文件
      event.target.value = ''
    }

    // 删除媒体文件
    const removeMediaFile = (index) => {
      campaignForm.value.media_files.splice(index, 1)
      
      // 如果删除后没有文件了，重置类型锁定
      if (campaignForm.value.media_files.length === 0) {
        selectedMediaType.value = null
      }
      
      ElMessage.success(t('admin.campaigns.removeMediaSuccess'))
    }

    // 获取完整的图片URL（转换相对路径为绝对路径）
    const getFullImageUrl = (url) => {
      if (!url) {
        console.log('🖼️ getFullImageUrl: URL为空')
        return ''
      }
      
      console.log('🖼️ [getFullImageUrl] 输入URL =', url)
      console.log('🖼️ [getFullImageUrl] URL类型:', typeof url)
      console.log('🖼️ [getFullImageUrl] URL详细信息:', JSON.stringify({url, length: url.length, firstChar: url[0]}))
      
      // 如果已经是完整URL（http或https开头），直接返回
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('🖼️ [getFullImageUrl] 已经是完整URL，直接返回')
        return url
      }
      
      // 如果是相对路径，添加当前域名
      const baseUrl = window.location.origin
      const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`
      console.log('🖼️ [getFullImageUrl] baseUrl =', baseUrl)
      console.log('🖼️ [getFullImageUrl] 转换后的完整URL =', fullUrl)
      return fullUrl
    }

    // 获取图片URL列表（用于预览）
    const getImageUrls = () => {
      return campaignForm.value.media_files
        .filter(file => file.type === 'image')
        .map(file => getFullImageUrl(file.url))
    }

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      // 强制使用公历年份（避免泰国佛历2568年问题）
      return `${day}/${month}/${year}`
    }

    // 获取状态类型
    const getStatusType = (status) => {
      switch (status) {
        case 'draft': return 'info'
        case 'active': return 'success'
        case 'paused': return 'warning'
        default: return 'info'
      }
    }

    // 获取状态文本
    const getStatusText = (status) => {
      switch (status) {
        case 'draft': return t('admin.campaigns.draft')
        case 'active': return t('admin.campaigns.active')
        case 'paused': return t('admin.campaigns.paused')
        default: return status
      }
    }

    // 券类型选项
    const couponTypes = ref([
      {
        value: 'final_price',
        label: t('admin.campaigns.finalPriceType'),
        example: t('admin.campaigns.finalPriceExample')
      },
      {
        value: 'gift_card',
        label: t('admin.campaigns.giftCardType'),
        example: t('admin.campaigns.giftCardExample')
      },
      {
        value: 'cash_voucher',
        label: t('admin.campaigns.cashVoucherType'),
        example: t('admin.campaigns.cashVoucherExample')
      },
      {
        value: 'full_reduction',
        label: t('admin.campaigns.fullReductionType'),
        example: t('admin.campaigns.fullReductionExample')
      },
      {
        value: 'percentage_discount',
        label: t('admin.campaigns.percentageDiscountType'),
        example: t('admin.campaigns.percentageDiscountExample')
      },
      {
        value: 'fixed_discount',
        label: t('admin.campaigns.fixedDiscountType'),
        example: t('admin.campaigns.fixedDiscountExample')
      }
    ])

    // 行业类目选项 - 使用computed确保语言切换时更新
    const categories = computed(() => [
      {
        value: 'recommend',
        label: t('admin.campaigns.categoryRecommend')
      },
      {
        value: '3c',
        label: t('admin.campaigns.category3c')
      },
      {
        value: 'fashion',
        label: t('admin.campaigns.categoryFashion')
      },
      {
        value: 'food',
        label: t('admin.campaigns.categoryFood')
      },
      {
        value: 'beauty',
        label: t('admin.campaigns.categoryBeauty')
      },
      {
        value: 'nails',
        label: t('admin.campaigns.categoryNails')
      },
      {
        value: 'mom',
        label: t('admin.campaigns.categoryMom')
      }
    ])

    // 处理券类型变化
    const handleCouponTypeChange = (type) => {
      // 清空所有价格字段
      campaignForm.value.original_price = null
      campaignForm.value.discount_price = null
      campaignForm.value.price_final = null
      campaignForm.value.face_value = null
      campaignForm.value.amount_off = null
      campaignForm.value.min_spend = null
      campaignForm.value.discount_percent = null
      campaignForm.value.cap_amount = null
      
      // 更新验证规则
      updateValidationRules(type)
    }

    // 更新验证规则
    const updateValidationRules = (type) => {
      const baseRules = {
        title: [
          { required: true, message: t('admin.campaigns.titleRequired'), trigger: 'blur' }
        ],
        description: [
          { required: true, message: t('admin.campaigns.descriptionRequired'), trigger: 'blur' }
        ],
        coupon_type: [
          { required: true, message: t('admin.campaigns.couponTypeRequired'), trigger: 'change' }
        ],
        quantity: [
          { required: true, message: t('admin.campaigns.quantityRequired'), trigger: 'blur' }
        ],
        valid_from: [
          { required: true, message: t('admin.campaigns.validFromRequired'), trigger: 'change' }
        ],
        valid_to: [
          { required: true, message: t('admin.campaigns.validToRequired'), trigger: 'change' }
        ],
        store_ids: [
          { required: true, message: t('admin.campaigns.storesRequired'), trigger: 'change' }
        ]
      }

      // 根据券类型添加特定的验证规则
      switch (type) {
        case 'final_price':
          baseRules.price_final = [
            { required: true, message: t('admin.campaigns.finalPriceRequired'), trigger: 'blur' }
          ]
          break
        case 'gift_card':
          baseRules.face_value = [
            { required: true, message: t('admin.campaigns.faceValueRequired'), trigger: 'blur' }
          ]
          break
        case 'cash_voucher':
          baseRules.amount_off = [
            { required: true, message: t('admin.campaigns.amountOffRequired'), trigger: 'blur' }
          ]
          break
        case 'full_reduction':
          baseRules.min_spend = [
            { required: true, message: t('admin.campaigns.minSpendRequired'), trigger: 'blur' }
          ]
          baseRules.amount_off = [
            { required: true, message: t('admin.campaigns.amountOffRequired'), trigger: 'blur' }
          ]
          break
        case 'percentage_discount':
          baseRules.discount_percent = [
            { required: true, message: t('admin.campaigns.discountPercentRequired'), trigger: 'blur' }
          ]
          break
        case 'fixed_discount':
          baseRules.amount_off = [
            { required: true, message: t('admin.campaigns.amountOffRequired'), trigger: 'blur' }
          ]
          break
      }

      Object.assign(formRules, baseRules)
    }

    // 生成价格摘要
    const getPriceSummary = (coupon) => {
      // 优先使用后端返回的价格摘要，确保格式一致
      if (coupon.price_summary) {
        return coupon.price_summary
      }
      
      const type = coupon.coupon_type || 'final_price'
      const currency = '฿' // 使用泰铢符号
      
      switch (type) {
        case 'final_price':
          if (coupon.original_price && coupon.discount_price) {
            return `${currency}${coupon.original_price} → ${currency}${coupon.discount_price}`
          }
          return coupon.price_final ? `${currency}${coupon.price_final}` : '价格待定'
          
        case 'gift_card':
          return coupon.face_value ? `面值 ${currency}${coupon.face_value}` : '面值待定'
          
        case 'cash_voucher':
          return coupon.amount_off ? `抵用 ${currency}${coupon.amount_off}` : '抵用金额待定'
          
        case 'full_reduction':
          if (coupon.min_spend && coupon.amount_off) {
            return `满 ${currency}${coupon.min_spend} 减 ${currency}${coupon.amount_off}`
          }
          return '满减条件待定'
          
        case 'percentage_discount':
          if (coupon.discount_percent) {
            const discount = (100 - parseFloat(coupon.discount_percent)) / 10
            let summary = `${discount}折`
            if (coupon.min_spend) {
              summary += ` (满${currency}${coupon.min_spend})`
            }
            if (coupon.cap_amount) {
              summary += ` (最高${currency}${coupon.cap_amount})`
            }
            return summary
          }
          return '折扣待定'
          
        case 'fixed_discount':
          if (coupon.amount_off) {
            let summary = `减 ${currency}${coupon.amount_off}`
            if (coupon.min_spend) {
              summary += ` (满${currency}${coupon.min_spend})`
            }
            return summary
          }
          return '折扣金额待定'
          
        default:
          return '价格待定'
      }
    }

    // 获取券类型标签
    const getCouponTypeLabel = (type) => {
      const typeMap = {
        'final_price': '最终价券',
        'gift_card': '礼品券',
        'cash_voucher': '抵用券',
        'full_reduction': '满减券',
        'percentage_discount': '折扣券',
        'fixed_discount': '固定折扣券'
      }
      return typeMap[type] || '未知类型'
    }

    // 转换URL为同源路径（绕过CORP拦截）
    const convertToSameOrigin = (url) => {
      if (typeof url === 'string') {
        return url.replace(/^https?:\/\/[^/]+\/uploads\//, '/api/uploads/')
      }
      return url
    }
    
    // 检测活动是否为视频类型
    const isVideoContent = (campaign) => {
      if (campaign.media_files && campaign.media_files.length > 0) {
        let mediaFiles = campaign.media_files
        if (typeof mediaFiles === 'string') {
          try {
            mediaFiles = JSON.parse(mediaFiles)
          } catch (error) {
            return false
          }
        }
        return mediaFiles.some(file => file.type === 'video')
      }
      return false
    }
    
    // 获取视频URL
    const getVideoUrl = (campaign) => {
      if (campaign.media_files && campaign.media_files.length > 0) {
        let mediaFiles = campaign.media_files
        if (typeof mediaFiles === 'string') {
          try {
            mediaFiles = JSON.parse(mediaFiles)
          } catch (error) {
            return null
          }
        }
        
        const videoFile = mediaFiles.find(file => file.type === 'video')
        if (videoFile && videoFile.url) {
          return convertToSameOrigin(videoFile.url)
        }
      }
      return null
    }
    
    // 获取主要显示图片 - 仿照详情页逻辑
    const getMainImage = (campaign) => {
      // 首先检查 image_url 字段
      if (campaign.image_url) {
        return convertToSameOrigin(campaign.image_url)
      }
      
      // 然后检查 media_files 中的第一个图片文件
      if (campaign.media_files && campaign.media_files.length > 0) {
        // 处理可能的JSON字符串格式
        let mediaFiles = campaign.media_files
        if (typeof mediaFiles === 'string') {
          try {
            mediaFiles = JSON.parse(mediaFiles)
          } catch (error) {
            console.error('解析媒体文件数据失败:', error)
            return null
          }
        }
        
        const imageFile = mediaFiles.find(file => file.type === 'image')
        if (imageFile && imageFile.url) {
          return convertToSameOrigin(imageFile.url)
        }
      }
      
      return null
    }

    // 链接复制相关函数
    // 生成外部 H5 落地页（适用于 TikTok / FB / IG 投放）
    const buildH5 = (id, source = 'tiktok', medium = 'ad', campaign = 'campaign_x') => {
      // 按需将 campaign 填写为你的广告活动名
      return `${HOST}/coupon/${id}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${encodeURIComponent(campaign)}`
    }

    // 生成 LIFF 深链（OA 富菜单用，LINE 内打开，直达某活动详情）
    const buildLiff = (id, slot = 'activity', menuId = 'oa_v1', campaign = 'oa_v1') => {
      const goto = encodeURIComponent(`/coupon/${id}`)
      return `https://liff.line.me/${LIFF_ID}?utm_source=line&utm_medium=menu&utm_campaign=${encodeURIComponent(campaign)}&menu_id=${encodeURIComponent(menuId)}&slot=${encodeURIComponent(slot)}&goto=${goto}`
    }

    // 生成 LIFF 智能跳转深链（进入 /oa-activity，由前端/后端决定跳哪张券）
    const buildLiffSmart = (slot = 'activity', menuId = 'oa_v1', campaign = 'oa_v1') => {
      const goto = encodeURIComponent('/oa-activity')
      return `https://liff.line.me/${LIFF_ID}?utm_source=line&utm_medium=menu&utm_campaign=${encodeURIComponent(campaign)}&menu_id=${encodeURIComponent(menuId)}&slot=${encodeURIComponent(slot)}&goto=${goto}`
    }

    const copy = async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('已复制到剪贴板')
      } catch (err) {
        console.error('复制失败:', err)
        ElMessage.error('复制失败，请手动复制')
      }
    }

    const copyH5 = (id, source = 'tiktok') => {
      copy(buildH5(id, source))
    }

    const copyLiff = (id) => { 
      copy(buildLiff(id)) 
    }
    
    const copyLiffSmart = () => { 
      copy(buildLiffSmart()) 
    }

    const previewCoupon = (id) => {
      window.open(`${HOST}/coupon/${id}`, '_blank')
    }

    onMounted(() => {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }
      
      loadCampaigns()
      loadStores()
      updateValidationRules(campaignForm.value.coupon_type)
    })

    return {
      // 页面状态
      loading,
      submitting,
      searchKeyword,
      statusFilter,
      
      // 分页状态
      currentPage,
      pageSize,
      totalCount,
      
      // 活动数据
      campaignList,
      
      // 添加/编辑
      showAddCampaign,
      editingCampaign,
      campaignForm,
      formRef,
      formRules,
      
      // 活动指南
      showStaffGuide,
      savingGuide,
      staffGuideForm,
      editStaffGuide,
      saveStaffGuide,
      
      
      // 券类型系统
      couponTypes,
      categories,
      handleCouponTypeChange,
      updateValidationRules,
      getPriceSummary,
      getCouponTypeLabel,
      getMainImage,
      isVideoContent,
      getVideoUrl,
      
      // 门店数据
      storeList,
      selectedCities,
      availableCities,
      getCityStoreCount,
      filteredStoresByCity,
      allCitiesSelected,
      allFilteredStoresSelected,
      toggleAllCities,
      toggleAllStores,
      handleCityChange,
      
      // 多媒体上传
      uploadRef,
      fileInputRef,
      fileList,
      selectedMediaType,
      uploadHeaders,
      uploadLimit,
      acceptedFileTypes,
      multipleAllowed,
      currentMediaType,
      beforeMediaUpload,
      triggerFileInput,
      handleFileSelect,
      removeMediaFile,
      getFullImageUrl,
      getImageUrls,
      formatFileSize,
      
      // 方法
      handleSearch,
      handleSizeChange,
      handleCurrentChange,
      goBack,
      editCampaign,
      deleteCampaign,
      saveCampaign,
      handleCancel,
      resetForm,
      loadStores,
      handleStoreSelection,
      formatDate,
      getStatusType,
      getStatusText,
      
      // 链接复制方法
      copyH5,
      copyLiff,
      copyLiffSmart,
      previewCoupon,
      
      // 图标
      ArrowLeft,
      Plus,
      Search,
      Shop,
      Location,
      Edit,
      Delete,
      MagicStick
    }
  }
})
</script>

<style scoped>
.admin-campaigns {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.campaigns-content {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 多媒体上传组件样式 */
.media-upload-section {
  width: 100%;
}

.media-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}

.media-item {
  position: relative;
  width: 120px;
}

.image-preview,
.video-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.media-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-preview:hover .media-overlay,
.video-preview:hover .media-overlay {
  opacity: 1;
}

.media-info {
  margin-top: 8px;
  text-align: center;
}

.file-name {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.upload-tips {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.upload-tips p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.mutex-tip {
  color: #f56c6c !important;
  font-weight: 500;
  margin-top: 8px !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .campaigns-content {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .search-section .el-row {
    flex-direction: column;
  }
  
  .search-section .el-col {
    margin-bottom: 10px;
  }
  
  .media-preview {
    gap: 12px;
  }
  
  .media-item {
    width: 100px;
  }
  
  .image-preview,
  .video-preview {
    width: 80px;
    height: 80px;
  }
}
.field-note {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  line-height: 1.2;
}

.ml8 { 
  margin-left: 8px; 
}

/* 对话框相关样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 门店选择面板样式 */
.store-selector-panel {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.city-filter-section {
  border-bottom: 1px solid #e4e7ed;
  padding: 16px;
  background: #f8f9fa;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filter-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.city-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.city-chips :deep(.el-checkbox.is-bordered) {
  padding: 8px 15px;
  margin: 0;
  border-radius: 16px;
  transition: all 0.2s;
}

.city-chips :deep(.el-checkbox.is-bordered.is-checked) {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.store-list-section {
  padding: 16px;
}

.store-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.store-count-info {
  font-size: 14px;
  color: #606266;
}

.store-count-info strong {
  color: #409eff;
  font-size: 16px;
}

.store-items-container {
  max-height: 400px;
  overflow-y: auto;
}

.store-checkbox-group {
  width: 100%;
}

.store-item {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: all 0.2s;
  background: #fff;
}

.store-item:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

.store-item.is-checked {
  background: #ecf5ff;
  border-color: #409eff;
}

.store-item :deep(.el-checkbox) {
  width: 100%;
}

.store-item :deep(.el-checkbox__label) {
  width: 100%;
  display: block;
}

.store-info {
  width: 100%;
}

.store-name {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.store-icon {
  margin-right: 6px;
  color: #409eff;
}

.store-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-left: 20px;
}

.store-city {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
}

.store-address {
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>