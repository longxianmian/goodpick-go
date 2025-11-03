<template>
  <div class="media-uploader">
    <el-upload
      class="uploader"
      :action="action"
      :data="extraData"
      :headers="headers"
      :multiple="true"
      :limit="mode === 'image' ? maxImages : maxVideos"
      :file-list="fileList"
      list-type="picture-card"
      :before-upload="beforeUpload"
      :on-success="onSuccess"
      :on-error="onError"
      :on-remove="onRemove"
      accept="image/*,video/*"
      name="files"
    >
      <el-icon><Plus /></el-icon>
      <template #tip>
        <div class="el-upload__tip" v-html="t('mediaUploader.ruleTip', { maxImages, maxVideos })"></div>
        <div class="el-upload__tip">
          <span v-if="mode==='image'">{{ t('mediaUploader.modeImage') }}</span>
          <span v-else-if="mode==='video'">{{ t('mediaUploader.modeVideo') }}</span>
          <span v-else>{{ t('mediaUploader.modeNone') }}</span>
        </div>
      </template>

      <template #file="{ file }">
        <div class="thumb draggable-item">
          <img v-if="isImage(file)" :src="file.url" />
          <video v-else :src="file.url" preload="metadata" muted playsinline />
          <div class="mask" v-if="file.status !== 'success'">{{ file.status?.toUpperCase() }}</div>
          <div class="drag-handle" v-if="file.status === 'success' && mode === 'image'">
            <el-icon><Rank /></el-icon>
          </div>
        </div>
      </template>
    </el-upload>

    <div v-if="mode" class="mode-tip">
      <el-tag type="info" closable @close="resetMode">
        {{ mode === 'image' ? t('mediaUploader.lockedModeImage') : t('mediaUploader.lockedModeVideo') }}
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Plus, Rank } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'

const { t } = useI18n()

const props = defineProps({
  action: { type: String, required: true },
  baseUrl: { type: String, default: '' },
  headers: { type: Object, default: () => ({}) },
  extraData: { type: Object, default: () => ({}) },
  modelValue: { type: Array, default: () => [] },
  maxImages: { type: Number, default: 3 },
  maxVideos: { type: Number, default: 1 },
})

const emit = defineEmits(['update:modelValue','change'])

const fileList = ref([])
const mode = ref(null)

watch(() => props.modelValue, (val) => {
  fileList.value = (val || []).map((m, i) => ({
    uid: `${i}`,
    name: m.url?.split('/').pop() || `media-${i}`,
    status: 'success',
    url: m.url,
    raw: { type: m.type === 'video' ? 'video/*' : 'image/*' }
  }))
  if ((val || []).length) mode.value = (val[0].type === 'video') ? 'video' : 'image'
  else mode.value = null
}, { immediate: true })

const isImage = (f) => {
  const t = f?.raw?.type || f?.type
  if (!t && f?.url) return !/\.mp4|\.mov|\.webm|\.m4v/i.test(f.url)
  return /^image\//i.test(t)
}
const isVideo = (f) => !isImage(f)

const toUrl = (u) => {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return props.baseUrl ? `${props.baseUrl.replace(/\/$/,'')}${u.startsWith('/')?'':'/'}${u}` : u
}

const resetMode = () => {
  fileList.value = []
  mode.value = null
  emit('update:modelValue', [])
  emit('change', [])
}

const beforeUpload = (raw) => {
  const isImg = /^image\//.test(raw.type)
  const isVid = /^video\//.test(raw.type)

  if (!isImg && !isVid) { ElMessage.error(t('mediaUploader.onlyImageOrVideo')); return false }

  if (!mode.value) mode.value = isImg ? 'image' : 'video'
  if (mode.value === 'image' && !isImg) { ElMessage.error(t('mediaUploader.imageModeLocked')); return false }
  if (mode.value === 'video' && !isVid) { ElMessage.error(t('mediaUploader.videoModeLocked')); return false }

  const imgCount = fileList.value.filter(isImage).length
  const vidCount = fileList.value.filter(isVideo).length
  if (isImg && imgCount >= props.maxImages) { ElMessage.error(t('mediaUploader.maxImagesError', { maxImages: props.maxImages })); return false }
  if (isVid && vidCount >= props.maxVideos) { ElMessage.error(t('mediaUploader.maxVideosError', { maxVideos: props.maxVideos })); return false }

  return true
}

const onSuccess = (resp, file, list) => {
  // 支持多种响应格式：resp.data.files[0].url, resp.data.url, resp.url
  let url = ''
  if (resp?.data?.files && Array.isArray(resp.data.files) && resp.data.files.length > 0) {
    url = resp.data.files[0].url
  } else {
    url = resp?.data?.url || resp?.url || file?.response?.url || ''
  }
  
  file.url = toUrl(url)
  file.status = 'success'
  
  // 关键：更新受控的 fileList，否则 UI 不会刷新
  fileList.value = [...list]
  
  const out = list
    .filter(f => f.status==='success' && f.url)
    .map(f => ({ type: isImage(f) ? 'image' : 'video', url: f.url }))
  emit('update:modelValue', out)
  emit('change', out)
  
  ElMessage.success(t('mediaUploader.uploadSuccess'))
  console.log('✅ 上传成功 ->', file.url)
}

const onError = (err) => { console.error(err); ElMessage.error(t('mediaUploader.uploadError')) }

const onRemove = (file, list) => {
  const out = list
    .filter(f => f.status==='success' && f.url)
    .map(f => ({ type: isImage(f) ? 'image' : 'video', url: f.url }))
  emit('update:modelValue', out)
  emit('change', out)
  if (out.length === 0) mode.value = null
}

// 初始化拖拽排序功能
onMounted(() => {
  // 获取上传列表元素
  const uploadList = document.querySelector('.media-uploader .el-upload-list--picture-card')
  if (!uploadList) return

  // 初始化 Sortable
  Sortable.create(uploadList, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    filter: '.is-uploading',
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex) return

      // 更新 fileList 顺序
      const newFileList = [...fileList.value]
      const [movedItem] = newFileList.splice(oldIndex, 1)
      newFileList.splice(newIndex, 0, movedItem)
      
      fileList.value = newFileList

      // 通知父组件更新
      const out = newFileList
        .filter(f => f.status === 'success' && f.url)
        .map(f => ({ type: isImage(f) ? 'image' : 'video', url: f.url }))
      
      emit('update:modelValue', out)
      emit('change', out)
      
      ElMessage.success(t('mediaUploader.orderAdjusted'))
    }
  })
})
</script>

<style scoped>
.media-uploader :deep(.el-upload-list__item){ 
  border-radius:8px; 
  overflow:hidden; 
  cursor: move;
}
.thumb{ position:relative; width:100%; height:100%; }
.thumb img,.thumb video{ width:100%; height:100%; object-fit:cover; display:block; }
.mask{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
       background:rgba(0,0,0,.4); color:#fff; font-size:12px; }
.mode-tip{ margin-top:8px; }

.drag-handle {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  z-index: 10;
}

.drag-handle:hover {
  background: rgba(0, 0, 0, 0.8);
}

.sortable-ghost {
  opacity: 0.4;
}

.draggable-item {
  transition: transform 0.2s;
}
</style>
